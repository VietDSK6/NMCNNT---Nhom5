import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ControlDatabase, type SessionUser } from "../database.js";

interface HistoryRouteContext {
  readonly db: ControlDatabase;
  readonly requireUser: (request: FastifyRequest, reply: FastifyReply) => SessionUser | undefined;
}

export function registerHistoryRoutes(server: FastifyInstance, context: HistoryRouteContext): void {
  const { db, requireUser } = context;
  const querySchema = {
    type: "object",
    additionalProperties: false,
    properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
  } as const;

  server.get<{ Querystring: { limit?: number } }>("/api/v1/operations", {
    schema: { querystring: querySchema },
  }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    return { data: db.listOperations(request.query.limit ?? 20) };
  });

  server.get<{ Querystring: { limit?: number } }>("/api/v1/deployments", {
    schema: { querystring: querySchema },
  }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    return { data: db.listDeployments(request.query.limit ?? 20) };
  });

  server.get<{ Querystring: { limit?: number } }>("/api/v1/audit-events", {
    schema: { querystring: querySchema },
  }, async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    return { data: db.listAudit(request.query.limit ?? 20) };
  });
}
