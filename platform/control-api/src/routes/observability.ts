import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ControlDatabase, type SessionUser } from "../database.js";
import { observationFailure } from "../http.js";
import type { RunnerClient } from "../runner.js";

interface ObservabilityRouteContext {
  readonly db: ControlDatabase;
  readonly runnerClient: RunnerClient;
  readonly requireUser: (request: FastifyRequest, reply: FastifyReply) => SessionUser | undefined;
}

export function registerObservabilityRoutes(server: FastifyInstance, context: ObservabilityRouteContext): void {
  const { db, runnerClient, requireUser } = context;

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
}
