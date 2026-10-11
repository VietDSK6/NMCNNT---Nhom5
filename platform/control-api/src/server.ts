import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest } from "fastify";
import type { AppConfig } from "./config.js";
import { ControlDatabase, type SessionUser } from "./database.js";
import { inspectApplication, type ApplicationHealth } from "./health.js";
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

interface ServerOptions {
  readonly healthInspector?: typeof inspectApplication;
  readonly logger?: boolean;
}

function requestIp(request: FastifyRequest): string {
  return request.ip || "unknown";
}

export function createServer(config: AppConfig, db: ControlDatabase, options: ServerOptions = {}) {
  const server = Fastify({
    logger: options.logger ?? true,
    trustProxy: true,
    bodyLimit: 64 * 1024,
  });
  const healthInspector = options.healthInspector ?? inspectApplication;

  server.addHook("onRequest", async (_request, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("X-Frame-Options", "DENY")
      .header("Referrer-Policy", "no-referrer")
      .header("Cache-Control", "no-store");
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
      const health = await healthInspector(application, config.gatewayBaseUrl);
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
        runtime: {
          status: "not_integrated",
          source: "runner_pending",
          message: "Trạng thái container sẽ được bổ sung khi tích hợp Deployment Runner.",
        },
      };
    }));
    const healthy = data.filter((item) => item.health.status === "healthy").length;
    return {
      data,
      summary: { total: data.length, healthy, attention: data.length - healthy },
      checkedAt: new Date().toISOString(),
    };
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
