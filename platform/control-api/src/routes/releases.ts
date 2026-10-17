import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ControlDatabase, type ReleaseRecord, type SessionUser } from "../database.js";
import { requestIp, runnerMutationFailure } from "../http.js";
import type { RunnerClient } from "../runner.js";

interface ReleaseRouteContext {
  readonly db: ControlDatabase;
  readonly runnerClient: RunnerClient;
  readonly activeRollbacks: Set<string>;
  readonly enforceSameOrigin: (request: FastifyRequest, reply: FastifyReply) => boolean;
  readonly requireUser: (request: FastifyRequest, reply: FastifyReply) => SessionUser | undefined;
  readonly isApplicationBusy: (appId: string) => boolean;
}

export function registerReleaseRoutes(server: FastifyInstance, context: ReleaseRouteContext): void {
  const { db, runnerClient, activeRollbacks, enforceSameOrigin, requireUser, isApplicationBusy } = context;

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
    if (isApplicationBusy(application.id)) {
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
}
