import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest } from "fastify";
import type { AppConfig } from "./config.js";
import {
  ControlDatabase,
  type DeploymentRecord,
  type OperationAction,
  type OperationRecord,
  type ReleaseRecord,
  type SessionUser,
} from "./database.js";
import { inspectApplication } from "./health.js";
import {
  ENVIRONMENT_LIMITS,
  EnvironmentCipher,
  EnvironmentValidationError,
  normalizeEnvironmentVariables,
  type EnvironmentVariableInput,
  type PlainEnvironmentVariable,
} from "./environment.js";
import {
  HttpRunnerClient,
  RunnerRequestError,
  type RunnerClient,
  type RunnerStatus,
  type TrustedSource,
} from "./runner.js";
import {
  clearSessionCookie,
  createSessionToken,
  hashSessionToken,
  parseCookies,
  sessionCookie,
  verifyPassword,
} from "./security.js";

interface LoginBody {
  readonly username: string;
  readonly password: string;
}

interface ActionBody {
  readonly action: OperationAction;
  readonly version?: string;
}

interface SourceDeploymentBody {
  readonly sourceId: string;
  readonly commit: string;
}

interface EnvironmentBody {
  readonly variables: readonly EnvironmentVariableInput[];
}

interface ServerOptions {
  readonly healthInspector?: typeof inspectApplication;
  readonly runnerClient?: RunnerClient;
  readonly logger?: boolean;
}

function requestIp(request: FastifyRequest): string {
  return request.ip || "unknown";
}

function operationFailureMessage(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "Quá thời gian chờ Deployment Runner phản hồi.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Deployment Runner không thể hoàn tất thao tác.";
}

function observationFailure(error: unknown): { statusCode: number; code: string; message: string } {
  if (error instanceof RunnerRequestError) {
    if ([400, 404, 409, 413].includes(error.statusCode)) {
      return { statusCode: error.statusCode, code: error.code, message: error.message };
    }
    return { statusCode: 502, code: "runner_unavailable", message: "Không thể đọc dữ liệu quan sát từ Deployment Runner." };
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return { statusCode: 504, code: "runner_timeout", message: "Quá thời gian chờ dữ liệu quan sát." };
  }
  return { statusCode: 502, code: "runner_unavailable", message: "Không thể đọc dữ liệu quan sát từ Deployment Runner." };
}

function runnerMutationFailure(error: unknown): { statusCode: number; code: string; message: string } {
  if (error instanceof RunnerRequestError) {
    if ([400, 404, 409, 413].includes(error.statusCode)) {
      return { statusCode: error.statusCode, code: error.code, message: error.message };
    }
    return { statusCode: 502, code: "runner_unavailable", message: "Deployment Runner không thể hoàn tất thao tác." };
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return { statusCode: 504, code: "runner_timeout", message: "Quá thời gian chờ Deployment Runner phản hồi." };
  }
  return { statusCode: 502, code: "runner_unavailable", message: "Deployment Runner không thể hoàn tất thao tác." };
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
      const result = await runnerClient.deploySource(deployment.sourceId, deployment.commitSha);
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

  function trackOperation(task: Promise<void>): void {
    activeTasks.add(task);
    void task.finally(() => activeTasks.delete(task));
  }

  function readEnvironment(applicationId: string): {
    readonly plain: readonly PlainEnvironmentVariable[];
    readonly data: {
      readonly applicationId: string;
      readonly count: number;
      readonly variables: readonly {
        readonly key: string;
        readonly value: string | null;
        readonly sensitive: boolean;
        readonly updatedAt: string;
      }[];
      readonly limits: typeof ENVIRONMENT_LIMITS;
    };
  } {
    const records = db.listEnvironmentVariables(applicationId);
    const plain = records.map((record) => ({
      key: record.key,
      value: environmentCipher.decrypt(applicationId, record.key, record.encryptedValue),
      sensitive: record.sensitive,
    }));
    return {
      plain,
      data: {
        applicationId,
        count: records.length,
        variables: records.map((record, index) => ({
          key: record.key,
          value: record.sensitive ? null : plain[index]!.value,
          sensitive: record.sensitive,
          updatedAt: record.updatedAt,
        })),
        limits: ENVIRONMENT_LIMITS,
      },
    };
  }

  server.get("/api/health", async () => ({ status: "ok", service: "control-api" }));

  server.post<{ Body: LoginBody }>("/api/v1/auth/login", {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["username", "password"],
        properties: {
          username: { type: "string", minLength: 1, maxLength: 64 },
          password: { type: "string", minLength: 1, maxLength: 256 },
        },
      },
    },
  }, async (request, reply) => {
    if (!enforceSameOrigin(request, reply)) return;
    const user = db.findUserByUsername(request.body.username);
    const valid = user
      ? verifyPassword(request.body.password, user.passwordSalt, user.passwordHash)
      : false;
    if (!user || !valid) {
      db.addAudit({
        actorUsername: request.body.username,
        action: "auth.login",
        resourceType: "session",
        outcome: "failed",
        detail: "Thông tin đăng nhập không hợp lệ.",
        ipAddress: requestIp(request),
      });
      return reply.code(401).send({
        error: "invalid_credentials",
        message: "Tên đăng nhập hoặc mật khẩu không đúng.",
      });
    }

    const token = createSessionToken();
    const expiresAt = db.createSession(user.id, hashSessionToken(token), config.sessionTtlSeconds);
    db.addAudit({
      actorUserId: user.id,
      actorUsername: user.username,
      action: "auth.login",
      resourceType: "session",
      outcome: "succeeded",
      ipAddress: requestIp(request),
    });
    reply.header(
      "Set-Cookie",
      sessionCookie(config.sessionCookieName, token, config.sessionTtlSeconds, config.sessionCookieSecure),
    );
    return { user: { username: user.username }, expiresAt };
  });

  server.get("/api/v1/auth/session", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    return { user: { username: user.username }, expiresAt: user.expiresAt };
  });

  server.post("/api/v1/auth/logout", async (request, reply) => {
    if (!enforceSameOrigin(request, reply)) return;
    const user = requireUser(request, reply);
    if (!user) return;
    const token = sessionToken(request);
    if (token) db.revokeSession(hashSessionToken(token));
    db.addAudit({
      actorUserId: user.id,
      actorUsername: user.username,
      action: "auth.logout",
      resourceType: "session",
      outcome: "succeeded",
      ipAddress: requestIp(request),
    });
    reply.header("Set-Cookie", clearSessionCookie(config.sessionCookieName, config.sessionCookieSecure));
    return reply.code(204).send();
  });

  server.get("/api/v1/applications", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    const applications = db.listApplications();
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
        route: application.routePath,
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
    if (request.body.action !== "update" && request.body.version) {
      return reply.code(400).send({ error: "unexpected_version", message: "Thao tác này không nhận phiên bản đích." });
    }
    if (db.findActiveOperation(application.id) || db.findActiveDeployment(application.id) || activeEnvironmentUpdates.has(application.id) || activeRollbacks.has(application.id)) {
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

  server.get<{ Params: { appId: string } }>("/api/v1/applications/:appId/environment", {
    schema: {
      params: {
        type: "object",
        additionalProperties: false,
        required: ["appId"],
        properties: { appId: { type: "string", pattern: "^[a-z0-9-]+$", maxLength: 64 } },
      },
    },
  }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!db.findApplication(request.params.appId)) {
      return reply.code(404).send({ error: "application_not_found", message: "Không tìm thấy ứng dụng cần cấu hình." });
    }
    return { data: readEnvironment(request.params.appId).data };
  });

  server.put<{ Params: { appId: string }; Body: EnvironmentBody }>("/api/v1/applications/:appId/environment", {
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
        required: ["variables"],
        properties: {
          variables: {
            type: "array",
            maxItems: ENVIRONMENT_LIMITS.maximumVariables,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["key", "sensitive"],
              properties: {
                key: { type: "string", minLength: 1, maxLength: ENVIRONMENT_LIMITS.maximumKeyLength },
                value: {
                  anyOf: [
                    { type: "string", maxLength: ENVIRONMENT_LIMITS.maximumValueBytes },
                    { type: "null" },
                  ],
                },
                sensitive: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!enforceSameOrigin(request, reply)) return;
    const user = requireUser(request, reply);
    if (!user) return;
    const application = db.findApplication(request.params.appId);
    if (!application) {
      return reply.code(404).send({ error: "application_not_found", message: "Không tìm thấy ứng dụng cần cấu hình." });
    }
    if (db.findActiveOperation(application.id) || db.findActiveDeployment(application.id) || activeEnvironmentUpdates.has(application.id) || activeRollbacks.has(application.id)) {
      return reply.code(409).send({ error: "application_busy", message: "Ứng dụng đang có một thao tác khác được xử lý." });
    }

    activeEnvironmentUpdates.add(application.id);
    try {
      const previousRecords = db.listEnvironmentVariables(application.id);
      let variables: readonly PlainEnvironmentVariable[];
      try {
        variables = normalizeEnvironmentVariables(request.body.variables, readEnvironment(application.id).plain);
      } catch (error) {
        if (error instanceof EnvironmentValidationError) {
          return reply.code(error.statusCode).send({ error: error.code, message: error.message });
        }
        throw error;
      }

      const encrypted = variables.map((variable) => ({
        key: variable.key,
        encryptedValue: environmentCipher.encrypt(application.id, variable.key, variable.value),
        sensitive: variable.sensitive,
      }));
      db.replaceEnvironmentVariables(application.id, encrypted);

      try {
        const result = await runnerClient.configureEnvironment(
          application.id,
          variables.map(({ key, value }) => ({ key, value })),
        );
        db.addAudit({
          actorUserId: user.id,
          actorUsername: user.username,
          action: "application.environment.update",
          resourceType: "application",
          resourceId: application.id,
          outcome: "succeeded",
          detail: `Đã áp dụng ${variables.length} biến môi trường.`,
          ipAddress: requestIp(request),
        });
        return { data: { ...readEnvironment(application.id).data, runtime: result.runtime } };
      } catch (error) {
        db.replaceEnvironmentVariables(application.id, previousRecords);
        const failure = observationFailure(error);
        db.addAudit({
          actorUserId: user.id,
          actorUsername: user.username,
          action: "application.environment.update",
          resourceType: "application",
          resourceId: application.id,
          outcome: "failed",
          detail: "Không thể áp dụng biến môi trường; cấu hình đã được khôi phục.",
          ipAddress: requestIp(request),
        });
        return reply.code(failure.statusCode).send({ error: failure.code, message: failure.message });
      }
    } finally {
      activeEnvironmentUpdates.delete(application.id);
    }
  });

  server.get("/api/v1/sources", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    try {
      return { data: await runnerClient.sources() };
    } catch (error) {
      const failure = observationFailure(error);
      return reply.code(failure.statusCode).send({ error: failure.code, message: "Không thể đọc danh sách kho mã được phép." });
    }
  });

  server.post<{ Body: SourceDeploymentBody }>("/api/v1/deployments", {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["sourceId", "commit"],
        properties: {
          sourceId: { type: "string", pattern: "^[a-z0-9-]+$", maxLength: 64 },
          commit: { type: "string", pattern: "^[0-9a-f]{40}$" },
        },
      },
    },
  }, async (request, reply) => {
    if (!enforceSameOrigin(request, reply)) return;
    const user = requireUser(request, reply);
    if (!user) return;

    let sources: readonly TrustedSource[];
    try {
      sources = await runnerClient.sources();
    } catch (error) {
      const failure = observationFailure(error);
      return reply.code(failure.statusCode).send({ error: failure.code, message: "Không thể xác minh kho mã với Deployment Runner." });
    }
    const source = sources.find((item) => item.id === request.body.sourceId);
    if (!source) {
      return reply.code(404).send({ error: "source_not_allowed", message: "Kho mã không nằm trong danh sách được phép triển khai." });
    }
    const application = db.findApplication(source.appId);
    if (!application) {
      return reply.code(409).send({ error: "source_application_missing", message: "Kho mã chưa được gắn với ứng dụng trong hệ thống." });
    }
    if (db.findActiveOperation(application.id) || db.findActiveDeployment(application.id) || activeEnvironmentUpdates.has(application.id) || activeRollbacks.has(application.id)) {
      return reply.code(409).send({ error: "application_busy", message: "Ứng dụng đang có một thao tác khác được xử lý." });
    }

    const deployment = db.createDeployment({
      applicationId: application.id,
      sourceId: source.id,
      repositoryUrl: source.repositoryUrl,
      commitSha: request.body.commit,
      requestedBy: user.username,
    });
    trackOperation(executeSourceDeployment(deployment, user, requestIp(request)));
    return reply.code(202).send({ data: deployment });
  });

  server.get<{ Querystring: { limit?: number; applicationId?: string } }>("/api/v1/releases", {
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          applicationId: { type: "string", pattern: "^[a-z0-9-]+$", maxLength: 64 },
        },
      },
    },
  }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (request.query.applicationId && !db.findApplication(request.query.applicationId)) {
      return reply.code(404).send({ error: "application_not_found", message: "Không tìm thấy ứng dụng cần đọc lịch sử release." });
    }
    return { data: db.listReleases(request.query.limit ?? 20, request.query.applicationId) };
  });

  server.post<{ Params: { releaseId: string } }>("/api/v1/releases/:releaseId/rollback", {
    schema: {
      params: {
        type: "object",
        additionalProperties: false,
        required: ["releaseId"],
        properties: { releaseId: { type: "string", minLength: 1, maxLength: 64 } },
      },
    },
  }, async (request, reply) => {
    if (!enforceSameOrigin(request, reply)) return;
    const user = requireUser(request, reply);
    if (!user) return;
    const target = db.findRelease(request.params.releaseId);
    if (!target) {
      return reply.code(404).send({ error: "release_not_found", message: "Không tìm thấy release cần rollback." });
    }
    const application = db.findApplication(target.applicationId);
    if (!application) {
      return reply.code(409).send({ error: "release_application_missing", message: "Ứng dụng của release không còn trong hệ thống." });
    }
    if (db.findActiveOperation(application.id) || db.findActiveDeployment(application.id) || activeEnvironmentUpdates.has(application.id) || activeRollbacks.has(application.id)) {
      return reply.code(409).send({ error: "application_busy", message: "Ứng dụng đang có một thao tác khác được xử lý." });
    }

    activeRollbacks.add(application.id);
    try {
      const result = await runnerClient.rollback(application.id, {
        version: target.version,
        imageReference: target.imageReference,
        imageId: target.imageId,
        ...(target.sourceId ? { sourceId: target.sourceId } : {}),
        ...(target.commitSha ? { commitSha: target.commitSha } : {}),
      });
      db.setDesiredVersion(application.id, target.version);
      const createdRelease: ReleaseRecord = db.createRelease({
        applicationId: application.id,
        origin: "rollback",
        version: target.version,
        imageReference: target.imageReference,
        imageId: target.imageId,
        ...(target.sourceId ? { sourceId: target.sourceId } : {}),
        ...(target.commitSha ? { commitSha: target.commitSha } : {}),
        rollbackOfReleaseId: target.id,
        requestedBy: user.username,
      });
      db.addAudit({
        actorUserId: user.id,
        actorUsername: user.username,
        action: "release.rollback",
        resourceType: "release",
        resourceId: createdRelease.id,
        outcome: "succeeded",
        detail: `Rollback ${application.id} về ${target.version} từ release ${target.id}.`,
        ipAddress: requestIp(request),
      });
      return { data: createdRelease, runtime: result.runtime, message: result.message };
    } catch (error) {
      const failure = runnerMutationFailure(error);
      db.addAudit({
        actorUserId: user.id,
        actorUsername: user.username,
        action: "release.rollback",
        resourceType: "release",
        resourceId: target.id,
        outcome: "failed",
        detail: failure.message,
        ipAddress: requestIp(request),
      });
      return reply.code(failure.statusCode).send({ error: failure.code, message: failure.message });
    } finally {
      activeRollbacks.delete(application.id);
    }
  });

  server.get<{ Params: { appId: string }; Querystring: { tail?: number } }>("/api/v1/applications/:appId/logs", {
    schema: {
      params: {
        type: "object",
        additionalProperties: false,
        required: ["appId"],
        properties: { appId: { type: "string", pattern: "^[a-z0-9-]+$", maxLength: 64 } },
      },
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: { tail: { type: "integer", minimum: 1, maximum: 200, default: 100 } },
      },
    },
  }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!db.findApplication(request.params.appId)) {
      return reply.code(404).send({ error: "application_not_found", message: "Không tìm thấy ứng dụng cần quan sát." });
    }
    try {
      return { data: await runnerClient.logs(request.params.appId, request.query.tail ?? 100) };
    } catch (error) {
      const failure = observationFailure(error);
      return reply.code(failure.statusCode).send({ error: failure.code, message: failure.message });
    }
  });

  server.get<{ Params: { appId: string } }>("/api/v1/applications/:appId/stats", {
    schema: {
      params: {
        type: "object",
        additionalProperties: false,
        required: ["appId"],
        properties: { appId: { type: "string", pattern: "^[a-z0-9-]+$", maxLength: 64 } },
      },
    },
  }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    if (!db.findApplication(request.params.appId)) {
      return reply.code(404).send({ error: "application_not_found", message: "Không tìm thấy ứng dụng cần quan sát." });
    }
    try {
      return { data: await runnerClient.stats(request.params.appId) };
    } catch (error) {
      const failure = observationFailure(error);
      return reply.code(failure.statusCode).send({ error: failure.code, message: failure.message });
    }
  });

  server.get<{ Querystring: { limit?: number } }>("/api/v1/operations", {
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
      },
    },
  }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    return { data: db.listOperations(request.query.limit ?? 20) };
  });

  server.get<{ Querystring: { limit?: number } }>("/api/v1/deployments", {
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
      },
    },
  }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    return { data: db.listDeployments(request.query.limit ?? 20) };
  });

  server.get<{ Querystring: { limit?: number } }>("/api/v1/audit-events", {
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
      },
    },
  }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    return { data: db.listAudit(request.query.limit ?? 20) };
  });

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
