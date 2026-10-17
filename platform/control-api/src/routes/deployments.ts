import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  ControlDatabase,
  type DeploymentRecord,
  type SessionUser,
} from "../database.js";
import { observationFailure, requestIp, runnerMutationFailure } from "../http.js";
import type { RunnerClient, ServiceSourceInput, TrustedSource } from "../runner.js";

interface SourceDeploymentBody {
  readonly sourceId: string;
  readonly commit: string;
}

interface LatestSourceDeploymentBody {
  readonly sourceId: string;
}

interface DeploymentRouteContext {
  readonly db: ControlDatabase;
  readonly runnerClient: RunnerClient;
  readonly enforceSameOrigin: (request: FastifyRequest, reply: FastifyReply) => boolean;
  readonly requireUser: (request: FastifyRequest, reply: FastifyReply) => SessionUser | undefined;
  readonly isApplicationBusy: (appId: string) => boolean;
  readonly allSources: () => Promise<readonly TrustedSource[]>;
  readonly serviceSourceInput: (application: ReturnType<ControlDatabase["findApplication"]>) => ServiceSourceInput;
  readonly executeSourceDeployment: (deployment: DeploymentRecord, actor: SessionUser, ipAddress: string) => Promise<void>;
  readonly trackOperation: (task: Promise<void>) => void;
}

export function registerDeploymentRoutes(server: FastifyInstance, context: DeploymentRouteContext): void {
  const {
    db,
    runnerClient,
    enforceSameOrigin,
    requireUser,
    isApplicationBusy,
    allSources,
    serviceSourceInput,
    executeSourceDeployment,
    trackOperation,
  } = context;

  server.get("/api/v1/sources", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return;
    try {
      return { data: await allSources() };
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
      sources = await allSources();
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
    if (isApplicationBusy(application.id)) {
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

  server.post<{ Body: LatestSourceDeploymentBody }>("/api/v1/deployments/latest", {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["sourceId"],
        properties: {
          sourceId: { type: "string", pattern: "^[a-z0-9-]+$", maxLength: 64 },
        },
      },
    },
  }, async (request, reply) => {
    if (!enforceSameOrigin(request, reply)) return;
    const user = requireUser(request, reply);
    if (!user) return;

    let sources: readonly TrustedSource[];
    try {
      sources = await allSources();
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
    if (isApplicationBusy(application.id)) {
      return reply.code(409).send({ error: "application_busy", message: "Ứng dụng đang có một thao tác khác được xử lý." });
    }

    let revision;
    try {
      const sourceApplication = db.findApplication(source.appId);
      revision = sourceApplication?.kind === "git"
        ? await runnerClient.latestServiceRevision(serviceSourceInput(sourceApplication))
        : await runnerClient.latestRevision(source.id);
    } catch (error) {
      const failure = runnerMutationFailure(error);
      return reply.code(failure.statusCode).send({ error: failure.code, message: failure.message });
    }
    if (
      revision.sourceId !== source.id
      || revision.appId !== source.appId
      || revision.branch !== source.defaultBranch
      || !/^[0-9a-f]{40}$/.test(revision.commit)
    ) {
      return reply.code(502).send({
        error: "runner_invalid_response",
        message: "Deployment Runner trả về commit mới nhất không hợp lệ.",
      });
    }
    if (isApplicationBusy(application.id)) {
      return reply.code(409).send({ error: "application_busy", message: "Ứng dụng đang có một thao tác khác được xử lý." });
    }

    const deployment = db.createDeployment({
      applicationId: application.id,
      sourceId: source.id,
      repositoryUrl: source.repositoryUrl,
      commitSha: revision.commit,
      requestedBy: user.username,
    });
    trackOperation(executeSourceDeployment(deployment, user, requestIp(request)));
    return reply.code(202).send({ data: deployment });
  });
}
