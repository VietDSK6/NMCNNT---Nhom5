import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppConfig } from "../config.js";
import { ControlDatabase, type SessionUser } from "../database.js";
import { requestIp } from "../http.js";
import {
  clearSessionCookie,
  createSessionToken,
  hashSessionToken,
  sessionCookie,
  verifyPassword,
} from "../security.js";

interface LoginBody {
  readonly username: string;
  readonly password: string;
}

interface AuthRouteContext {
  readonly config: AppConfig;
  readonly db: ControlDatabase;
  readonly enforceSameOrigin: (request: FastifyRequest, reply: FastifyReply) => boolean;
  readonly requireUser: (request: FastifyRequest, reply: FastifyReply) => SessionUser | undefined;
  readonly sessionToken: (request: FastifyRequest) => string | undefined;
}

export function registerAuthRoutes(server: FastifyInstance, context: AuthRouteContext): void {
  const { config, db, enforceSameOrigin, requireUser, sessionToken } = context;

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
}
