import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ControlDatabase, type SessionUser } from "../database.js";
import {
  ENVIRONMENT_LIMITS,
  EnvironmentCipher,
  EnvironmentValidationError,
  normalizeEnvironmentVariables,
  type EnvironmentVariableInput,
  type PlainEnvironmentVariable,
} from "../environment.js";
import { observationFailure, requestIp } from "../http.js";
import type { RunnerClient } from "../runner.js";

interface EnvironmentBody {
  readonly variables: readonly EnvironmentVariableInput[];
}

interface EnvironmentRouteContext {
  readonly db: ControlDatabase;
  readonly runnerClient: RunnerClient;
  readonly environmentCipher: EnvironmentCipher;
  readonly activeEnvironmentUpdates: Set<string>;
  readonly enforceSameOrigin: (request: FastifyRequest, reply: FastifyReply) => boolean;
  readonly requireUser: (request: FastifyRequest, reply: FastifyReply) => SessionUser | undefined;
  readonly isApplicationBusy: (appId: string) => boolean;
}

export function registerEnvironmentRoutes(server: FastifyInstance, context: EnvironmentRouteContext): void {
  const {
    db,
    runnerClient,
    environmentCipher,
    activeEnvironmentUpdates,
    enforceSameOrigin,
    requireUser,
    isApplicationBusy,
  } = context;

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
    if (isApplicationBusy(application.id)) {
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
}
