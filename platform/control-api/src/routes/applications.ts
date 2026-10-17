import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppConfig } from "../config.js";
import {
  ControlDatabase,
  type DeploymentRecord,
  type OperationAction,
  type OperationRecord,
  type SessionUser,
} from "../database.js";
import type { inspectApplication } from "../health.js";
import { requestIp, runnerMutationFailure } from "../http.js";
import type { RunnerClient, RunnerStatus, ServiceSourceInput } from "../runner.js";
import { normalizeWebService, WebServiceValidationError } from "../service.js";

interface ActionBody {
  readonly action: OperationAction;
  readonly version?: string;
}

interface CreateServiceBody {
  readonly name: string;
  readonly slug: string;
  readonly repositoryUrl: string;
  readonly defaultBranch?: string;
  readonly buildContext?: string;
}

interface ApplicationRouteContext {
  readonly config: AppConfig;
  readonly db: ControlDatabase;
  readonly runnerClient: RunnerClient;
  readonly healthInspector: typeof inspectApplication;
  readonly inspectRuntime: (appId: string) => Promise<RunnerStatus | object>;
  readonly enforceSameOrigin: (request: FastifyRequest, reply: FastifyReply) => boolean;
  readonly requireUser: (request: FastifyRequest, reply: FastifyReply) => SessionUser | undefined;
  readonly isApplicationBusy: (appId: string) => boolean;
  readonly executeOperation: (operation: OperationRecord, actor: SessionUser, ipAddress: string) => Promise<void>;
  readonly executeSourceDeployment: (deployment: DeploymentRecord, actor: SessionUser, ipAddress: string) => Promise<void>;
  readonly trackOperation: (task: Promise<void>) => void;
}

export function registerApplicationRoutes(server: FastifyInstance, context: ApplicationRouteContext): void {
  const {
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
  } = context;

  server.get("/api/v1/applications", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const applications = db.listApplications();
    const publicOrigin = new URL(config.publicOrigin);
    const data = await Promise.all(applications.map(async (application) => {
      const [health, runtime] = await Promise.all([
        healthInspector(application, config.gatewayBaseUrl),
        inspectRuntime(application.id),
      ]);
      return {
        id: application.id,
        slug: application.slug,
        name: application.name,
        description: application.description,
        route: application.publicHost
          ? `${publicOrigin.protocol}//${application.publicHost}${publicOrigin.port ? `:${publicOrigin.port}` : ""}`
          : application.routePath,
        kind: application.kind,
        repositoryUrl: application.repositoryUrl,
        defaultBranch: application.defaultBranch,
        buildContext: application.buildContext,
        publicHost: application.publicHost,
        desiredVersion: application.desiredVersion,
        observedVersion: health.observedVersion,
        health: {
          status: health.status,
          checkedAt: health.checkedAt,
          latencyMs: health.latencyMs,
          httpStatus: health.httpStatus,
          message: health.message,
        },
        runtime: { ...runtime, source: "deployment_runner" },
        activeOperation: db.findActiveOperation(application.id) ?? null,
      };
    }));
    const healthy = data.filter((item) => item.health.status === "healthy").length;
    const running = data.filter((item) => item.runtime.status === "running").length;
    return {
      data,
      summary: { total: data.length, healthy, running, attention: data.length - healthy },
      checkedAt: new Date().toISOString(),
    };
  });

  server.post<{ Body: CreateServiceBody }>("/api/v1/services", {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["name", "slug", "repositoryUrl"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 80 },
          slug: { type: "string", minLength: 1, maxLength: 63 },
          repositoryUrl: { type: "string", minLength: 1, maxLength: 240 },
          defaultBranch: { type: "string", enum: ["main"] },
          buildContext: { type: "string", minLength: 1, maxLength: 160 },
        },
      },
    },
  }, async (request, reply) => {
    if (!enforceSameOrigin(request, reply)) return;
    const user = requireUser(request, reply);
    if (!user) return;
    let input;
    try {
      input = normalizeWebService(request.body, config.trustedGithubOwners);
    } catch (error) {
      if (error instanceof WebServiceValidationError) {
        return reply.code(error.statusCode).send({ error: error.code, message: error.message });
      }
      throw error;
    }
    if (db.findApplication(input.slug)) {
      return reply.code(409).send({ error: "service_slug_exists", message: "Slug này đã được một ứng dụng khác sử dụng." });
    }
    const sourceInput: ServiceSourceInput = {
      appId: input.slug,
      name: input.name,
      repositoryUrl: input.repositoryUrl,
      defaultBranch: input.defaultBranch,
      contextPath: input.buildContext,
    };
    let revision;
    try {
      revision = await runnerClient.latestServiceRevision(sourceInput);
    } catch (error) {
      const failure = runnerMutationFailure(error);
      return reply.code(failure.statusCode).send({ error: failure.code, message: failure.message });
    }
    if (revision.appId !== input.slug || revision.sourceId !== `github-${input.slug}` || !/^[0-9a-f]{40}$/.test(revision.commit)) {
      return reply.code(502).send({ error: "runner_invalid_response", message: "Runner trả về commit không hợp lệ." });
    }
    let application;
    try {
      application = db.createWebService({
        ...input,
        publicHost: `${input.slug}.${config.serviceBaseDomain}`,
      });
    } catch (error) {
      if (db.findApplication(input.slug)) {
        return reply.code(409).send({ error: "service_slug_exists", message: "Slug này vừa được một yêu cầu khác đăng ký." });
      }
      throw error;
    }
    const deployment = db.createDeployment({
      applicationId: application.id,
      sourceId: revision.sourceId,
      repositoryUrl: input.repositoryUrl,
      commitSha: revision.commit,
      requestedBy: user.username,
    });
    db.addAudit({
      actorUserId: user.id,
      actorUsername: user.username,
      action: "service.create",
      resourceType: "application",
      resourceId: application.id,
      outcome: "succeeded",
      detail: `${input.repositoryUrl}@${revision.commit}`,
      ipAddress: requestIp(request),
    });
    trackOperation(executeSourceDeployment(deployment, user, requestIp(request)));
    return reply.code(202).send({ data: { application, deployment } });
  });

  server.post<{ Params: { appId: string }; Body: ActionBody }>("/api/v1/applications/:appId/actions", {
    schema: {
      params: {
        type: "object",
        additionalProperties: false,
        required: ["appId"],
        properties: { appId: { type: "string", pattern: "^[a-z0-9-]+$", maxLength: 64 } },
      },
      body: {
        type: "object",
        additionalProperties: false,
        required: ["action"],
        properties: {
          action: { type: "string", enum: ["start", "stop", "restart", "update"] },
          version: { type: "string", minLength: 1, maxLength: 64 },
        },
      },
    },
  }, async (request, reply) => {
    if (!enforceSameOrigin(request, reply)) return;
    const user = requireUser(request, reply);
    if (!user) return;
    const application = db.findApplication(request.params.appId);
    if (!application) {
      return reply.code(404).send({ error: "application_not_found", message: "Không tìm thấy ứng dụng cần thao tác." });
    }
    if (request.body.action === "update" && !request.body.version) {
      return reply.code(400).send({ error: "version_required", message: "Thao tác cập nhật cần một phiên bản đích." });
    }
    if (application.kind === "git" && request.body.action === "update") {
      return reply.code(400).send({ error: "action_not_allowed", message: "Web Service từ Git được cập nhật bằng deployment mới." });
    }
    if (request.body.action !== "update" && request.body.version) {
      return reply.code(400).send({ error: "unexpected_version", message: "Thao tác này không nhận phiên bản đích." });
    }
    if (isApplicationBusy(application.id)) {
      return reply.code(409).send({ error: "application_busy", message: "Ứng dụng đang có một thao tác khác được xử lý." });
    }

    const operation = db.createOperation({
      applicationId: application.id,
      action: request.body.action,
      ...(request.body.version ? { requestedVersion: request.body.version } : {}),
      requestedBy: user.username,
    });
    trackOperation(executeOperation(operation, user, requestIp(request)));
    return reply.code(202).send({ data: operation });
  });
}
