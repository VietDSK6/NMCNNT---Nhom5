import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest } from "fastify";
import type { AppConfig } from "./config.js";
import {
  ControlDatabase,
  type DeploymentRecord,
  type OperationRecord,
  type SessionUser,
} from "./database.js";
import { inspectApplication } from "./health.js";
import { EnvironmentCipher } from "./environment.js";
import {
  HttpRunnerClient,
  type RunnerClient,
  type RunnerStatus,
  type ServiceSourceInput,
  type TrustedSource,
} from "./runner.js";
import { operationFailureMessage } from "./http.js";
import { registerApplicationRoutes } from "./routes/applications.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHistoryRoutes } from "./routes/history.js";
import { registerObservabilityRoutes } from "./routes/observability.js";
import { registerEnvironmentRoutes } from "./routes/environment.js";
import { registerDeploymentRoutes } from "./routes/deployments.js";
import { registerReleaseRoutes } from "./routes/releases.js";
import {
  hashSessionToken,
  parseCookies,
} from "./security.js";

interface ServerOptions {
  readonly healthInspector?: typeof inspectApplication;
  readonly runnerClient?: RunnerClient;
  readonly logger?: boolean;
}

export function createServer(config: AppConfig, db: ControlDatabase, options: ServerOptions = {}) {
  const server = Fastify({
    logger: options.logger ?? true,
    trustProxy: true,
    bodyLimit: 64 * 1024,
  });
  const healthInspector = options.healthInspector ?? inspectApplication;
  const runnerClient = options.runnerClient ?? new HttpRunnerClient(
    config.runnerBaseUrl,
    config.runnerSharedSecret,
  );
  const environmentCipher = new EnvironmentCipher(config.environmentEncryptionKey);
  const activeTasks = new Set<Promise<void>>();
  const activeEnvironmentUpdates = new Set<string>();
  const activeRollbacks = new Set<string>();
  const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  server.addHook("onRequest", async (_request, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("X-Frame-Options", "DENY")
      .header("Referrer-Policy", "no-referrer")
      .header("Cache-Control", "no-store");
  });

  server.addHook("onClose", async () => {
    await Promise.allSettled([...activeTasks]);
  });

  function enforceSameOrigin(request: FastifyRequest, reply: FastifyReply): boolean {
    const origin = request.headers.origin;
    if (origin && origin !== config.publicOrigin) {
      reply.code(403).send({ error: "origin_not_allowed", message: "Nguồn gửi yêu cầu không được phép." });
      return false;
    }
    return true;
  }

  function sessionToken(request: FastifyRequest): string | undefined {
    return parseCookies(request.headers.cookie).get(config.sessionCookieName);
  }

  function authenticatedUser(request: FastifyRequest): SessionUser | undefined {
    const token = sessionToken(request);
    return token ? db.findSession(hashSessionToken(token)) : undefined;
  }

  function requireUser(request: FastifyRequest, reply: FastifyReply): SessionUser | undefined {
    const user = authenticatedUser(request);
    if (!user) {
      reply.code(401).send({ error: "authentication_required", message: "Bạn cần đăng nhập để tiếp tục." });
      return undefined;
    }
    return user;
  }

  async function inspectRuntime(appId: string): Promise<RunnerStatus | {
    readonly appId: string;
    readonly status: "unknown";
    readonly containerId: null;
    readonly containerName: null;
    readonly image: null;
    readonly imageId: null;
    readonly observedVersion: null;
    readonly health: null;
    readonly startedAt: null;
    readonly environmentVariableCount: 0;
    readonly message: string;
  }> {
    try {
      return await runnerClient.status(appId);
    } catch {
      return {
        appId,
        status: "unknown",
        containerId: null,
        containerName: null,
        image: null,
        imageId: null,
        observedVersion: null,
        health: null,
        startedAt: null,
        environmentVariableCount: 0,
        message: "Không đọc được trạng thái container từ Deployment Runner.",
      };
    }
  }

  async function executeOperation(
    operation: OperationRecord,
    actor: SessionUser,
    ipAddress: string,
  ): Promise<void> {
    db.markOperationRunning(operation.id);
    try {
      const result = await runnerClient.execute(
        operation.applicationId,
        operation.action,
        operation.requestedVersion ?? undefined,
      );
      if (operation.action === "update" && operation.requestedVersion) {
        db.setDesiredVersion(operation.applicationId, operation.requestedVersion);
        db.createRelease({
          applicationId: operation.applicationId,
          origin: "catalog",
          version: operation.requestedVersion,
          imageReference: result.runtime.image,
          imageId: result.runtime.imageId,
          requestedBy: actor.username,
        });
      }
      db.finishOperation(operation.id, "succeeded", result.message);
      db.addAudit({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: `application.${operation.action}`,
        resourceType: "application",
        resourceId: operation.applicationId,
        outcome: "succeeded",
        detail: result.message,
        ipAddress,
      });
    } catch (error) {
      const message = operationFailureMessage(error);
      db.finishOperation(operation.id, "failed", message);
      db.addAudit({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: `application.${operation.action}`,
        resourceType: "application",
        resourceId: operation.applicationId,
        outcome: "failed",
        detail: message,
        ipAddress,
      });
    }
  }

  async function executeSourceDeployment(
    deployment: DeploymentRecord,
    actor: SessionUser,
    ipAddress: string,
  ): Promise<void> {
    db.markDeploymentRunning(deployment.id);
    try {
      const application = db.findApplication(deployment.applicationId);
      if (!application) throw new Error("Ứng dụng của deployment không còn trong hệ thống.");
      const result = application.kind === "git"
        ? await runnerClient.deployService(serviceSourceInput(application), deployment.commitSha)
        : await runnerClient.deploySource(deployment.sourceId, deployment.commitSha);
      const healthDeadline = Date.now() + 20_000;
      let deploymentHealth = await healthInspector(application, config.gatewayBaseUrl);
      while (deploymentHealth.status !== "healthy" && Date.now() < healthDeadline) {
        await wait(500);
        deploymentHealth = await healthInspector(application, config.gatewayBaseUrl);
      }
      if (deploymentHealth.status !== "healthy") {
        throw new Error("Container đã chạy nhưng endpoint /health chưa đạt trong thời gian cho phép.");
      }
      db.setDesiredVersion(deployment.applicationId, result.version);
      db.finishDeployment({
        id: deployment.id,
        status: "succeeded",
        message: result.message,
        version: result.version,
        imageReference: result.imageReference,
        imageId: result.imageId,
        buildLog: result.log,
      });
      db.createRelease({
        applicationId: deployment.applicationId,
        origin: "source",
        version: result.version,
        imageReference: result.imageReference,
        imageId: result.imageId,
        sourceId: deployment.sourceId,
        commitSha: deployment.commitSha,
        deploymentId: deployment.id,
        requestedBy: actor.username,
      });
      db.addAudit({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: "deployment.create",
        resourceType: "deployment",
        resourceId: deployment.id,
        outcome: "succeeded",
        detail: `${deployment.sourceId}@${deployment.commitSha}`,
        ipAddress,
      });
    } catch (error) {
      const message = operationFailureMessage(error);
      db.finishDeployment({ id: deployment.id, status: "failed", message });
      db.addAudit({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: "deployment.create",
        resourceType: "deployment",
        resourceId: deployment.id,
        outcome: "failed",
        detail: message,
        ipAddress,
      });
    }
  }

  function serviceSourceInput(application: ReturnType<ControlDatabase["findApplication"]>): ServiceSourceInput {
    if (!application || application.kind !== "git" || !application.repositoryUrl || !application.defaultBranch || !application.buildContext) {
      throw new Error("Cấu hình source của Web Service không đầy đủ.");
    }
    return {
      appId: application.id,
      name: application.name,
      repositoryUrl: application.repositoryUrl,
      defaultBranch: application.defaultBranch,
      contextPath: application.buildContext,
    };
  }

  function dynamicSource(application: ReturnType<ControlDatabase["findApplication"]>): TrustedSource | null {
    if (!application || application.kind !== "git" || !application.repositoryUrl || !application.defaultBranch) return null;
    return {
      id: `github-${application.id}`,
      name: application.name,
      provider: "github",
      repositoryUrl: application.repositoryUrl,
      defaultBranch: application.defaultBranch,
      appId: application.id,
    };
  }

  async function allSources(): Promise<readonly TrustedSource[]> {
    const catalogSources = await runnerClient.sources();
    const serviceSources = db.listApplications()
      .map((application) => dynamicSource(application))
      .filter((source): source is TrustedSource => source !== null);
    return [...catalogSources, ...serviceSources];
  }

  function trackOperation(task: Promise<void>): void {
    activeTasks.add(task);
    void task.finally(() => activeTasks.delete(task));
  }

  function isApplicationBusy(applicationId: string): boolean {
    return Boolean(
      db.findActiveOperation(applicationId)
      || db.findActiveDeployment(applicationId)
      || activeEnvironmentUpdates.has(applicationId)
      || activeRollbacks.has(applicationId)
    );
  }

  server.get("/api/health", async () => ({ status: "ok", service: "control-api" }));
  registerAuthRoutes(server, { config, db, enforceSameOrigin, requireUser, sessionToken });
  registerApplicationRoutes(server, {
    config,
    db,
    runnerClient,
    healthInspector,
    inspectRuntime,
    enforceSameOrigin,
    requireUser,
    isApplicationBusy,
    executeOperation,
    executeSourceDeployment,
    trackOperation,
  });
  registerEnvironmentRoutes(server, {
    db,
    runnerClient,
    environmentCipher,
    activeEnvironmentUpdates,
    enforceSameOrigin,
    requireUser,
    isApplicationBusy,
  });
  registerDeploymentRoutes(server, {
    db,
    runnerClient,
    enforceSameOrigin,
    requireUser,
    isApplicationBusy,
    allSources,
    serviceSourceInput,
    executeSourceDeployment,
    trackOperation,
  });
  registerReleaseRoutes(server, {
    db,
    runnerClient,
    activeRollbacks,
    enforceSameOrigin,
    requireUser,
    isApplicationBusy,
  });

  registerObservabilityRoutes(server, { db, runnerClient, requireUser });
  registerHistoryRoutes(server, { db, requireUser });

  server.setNotFoundHandler(async (_request, reply) => {
    return reply.code(404).send({ error: "not_found", message: "Không tìm thấy tài nguyên yêu cầu." });
  });

  server.setErrorHandler(async (error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "request_failed");
    if (error.validation) {
      return reply.code(400).send({ error: "validation_error", message: "Dữ liệu gửi lên không hợp lệ." });
    }
    return reply.code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send({
      error: "internal_error",
      message: "Hệ thống không thể xử lý yêu cầu lúc này.",
    });
  });

  return server;
}
