import { randomUUID } from "node:crypto";
import {
  getAppSpec,
  getSourceSpec,
  listPublicSources,
  RunnerInputError,
  validateAction,
  validateCommitSha,
} from "./catalog.mjs";
import { decodeDockerLogs, OBSERVABILITY_LIMITS, summarizeDockerStats } from "./observability.mjs";

export class RunnerRuntimeError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.name = "RunnerRuntimeError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function envValue(environment, key) {
  const prefix = `${key}=`;
  return environment?.find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function replaceEnv(environment = [], key, value) {
  const prefix = `${key}=`;
  return [...environment.filter((item) => !item.startsWith(prefix)), `${key}=${value}`];
}

function runtimeStatus(inspect) {
  if (inspect.State?.Restarting) return "starting";
  if (!inspect.State?.Running) return "stopped";
  const health = inspect.State?.Health?.Status;
  if (health === "starting") return "starting";
  if (health === "unhealthy") return "unhealthy";
  return "running";
}

function publicStatus(appId, inspect) {
  return {
    appId,
    status: runtimeStatus(inspect),
    containerId: String(inspect.Id).slice(0, 12),
    containerName: String(inspect.Name || "").replace(/^\//, ""),
    image: String(inspect.Config?.Image || ""),
    observedVersion: envValue(inspect.Config?.Env, "APP_VERSION"),
    health: inspect.State?.Health?.Status ?? null,
    startedAt: inspect.State?.StartedAt || null,
  };
}

export class DeploymentRuntime {
  constructor(docker, options = {}) {
    this.docker = docker;
    this.sourceBuilder = options.sourceBuilder;
    this.project = options.project || "mini-paas";
    this.waitTimeoutMs = options.waitTimeoutMs || 30_000;
    this.pollIntervalMs = options.pollIntervalMs || 500;
    this.locks = new Set();
  }

  async findContainer(spec) {
    const containers = await this.docker.listManaged(this.project, spec.service);
    if (containers.length === 0) {
      throw new RunnerRuntimeError("container_not_found", "Không tìm thấy container được Runner quản lý.", 404);
    }
    if (containers.length !== 1) {
      throw new RunnerRuntimeError("container_state_ambiguous", "Có nhiều container cùng nhãn quản lý; cần kiểm tra thủ công trước khi tiếp tục.", 409);
    }
    return this.docker.inspect(containers[0].Id);
  }

  async status(appId) {
    const spec = getAppSpec(appId);
    return publicStatus(appId, await this.findContainer(spec));
  }

  listSources() {
    return listPublicSources();
  }

  async deploySource(sourceId, commit) {
    const source = getSourceSpec(sourceId);
    const revision = validateCommitSha(commit);
    if (!this.sourceBuilder) {
      throw new RunnerRuntimeError("source_builder_unavailable", "Runner chưa được cấu hình bộ dựng mã nguồn.", 503);
    }
    if (this.locks.has(source.appId)) {
      throw new RunnerRuntimeError("application_busy", "Ứng dụng đang có một thao tác khác được xử lý.", 409);
    }
    this.locks.add(source.appId);
    try {
      const build = await this.sourceBuilder.build(source, revision);
      const deployment = await this.update(
        getAppSpec(source.appId),
        build.version,
        build.imageReference,
      );
      return {
        ...build,
        message: `Đã build commit ${revision.slice(0, 12)} và triển khai ${source.name}.`,
        runtime: deployment.runtime,
      };
    } finally {
      this.locks.delete(source.appId);
    }
  }

  async logs(appId, tail = OBSERVABILITY_LIMITS.defaultTail) {
    const spec = getAppSpec(appId);
    if (!Number.isInteger(tail) || tail < 1 || tail > OBSERVABILITY_LIMITS.maximumTail) {
      throw new RunnerInputError("invalid_log_tail", `Số dòng log phải từ 1 đến ${OBSERVABILITY_LIMITS.maximumTail}.`);
    }
    const container = await this.findContainer(spec);
    const decoded = decodeDockerLogs(await this.docker.logs(container.Id, tail), tail);
    return {
      appId,
      containerId: String(container.Id).slice(0, 12),
      requestedTail: tail,
      ...decoded,
      fetchedAt: new Date().toISOString(),
    };
  }

  async stats(appId) {
    const spec = getAppSpec(appId);
    const container = await this.findContainer(spec);
    if (!container.State?.Running) {
      throw new RunnerRuntimeError("container_not_running", "Không thể lấy số liệu khi container đang dừng.", 409);
    }
    return {
      appId,
      containerId: String(container.Id).slice(0, 12),
      ...summarizeDockerStats(await this.docker.stats(container.Id)),
    };
  }

  async waitFor(appId, containerId, predicate, failureMessage) {
    const deadline = Date.now() + this.waitTimeoutMs;
    while (Date.now() < deadline) {
      const inspected = await this.docker.inspect(containerId);
      if (predicate(inspected)) return publicStatus(appId, inspected);
      await wait(this.pollIntervalMs);
    }
    throw new RunnerRuntimeError("operation_timeout", failureMessage, 504);
  }

  async execute(appId, action, version) {
    const validated = validateAction(appId, action, version);
    if (this.locks.has(appId)) {
      throw new RunnerRuntimeError("application_busy", "Ứng dụng đang có một thao tác khác được xử lý.", 409);
    }
    this.locks.add(appId);
    try {
      if (validated.action === "update") {
        return await this.update(validated.spec, validated.version);
      }

      const container = await this.findContainer(validated.spec);
      if (validated.action === "start") {
        await this.docker.start(container.Id);
        const status = await this.waitFor(appId, container.Id, (item) => runtimeStatus(item) === "running", "Container không đạt trạng thái hoạt động sau khi khởi động.");
        return { message: "Ứng dụng đã được khởi động.", runtime: status };
      }
      if (validated.action === "stop") {
        await this.docker.stop(container.Id);
        const status = await this.waitFor(appId, container.Id, (item) => !item.State?.Running, "Container chưa dừng trong thời gian cho phép.");
        return { message: "Ứng dụng đã được dừng.", runtime: status };
      }

      await this.docker.restart(container.Id);
      const status = await this.waitFor(appId, container.Id, (item) => runtimeStatus(item) === "running", "Container không khỏe lại sau khi khởi động lại.");
      return { message: "Ứng dụng đã được khởi động lại.", runtime: status };
    } finally {
      this.locks.delete(appId);
    }
  }

  async update(spec, version, preparedImage) {
    const targetImage = preparedImage ?? spec.versions[version];
    if (!targetImage) {
      throw new RunnerInputError("version_not_allowed", "Phiên bản cập nhật không nằm trong danh sách cho phép.");
    }
    const image = await this.docker.image(targetImage).catch((error) => {
      if (error?.statusCode === 404) {
        throw new RunnerRuntimeError("image_not_prepared", `Ảnh ${targetImage} chưa được chuẩn bị trên máy chủ.`, 409);
      }
      throw error;
    });
    const current = await this.findContainer(spec);
    const currentVersion = envValue(current.Config?.Env, "APP_VERSION");
    if (currentVersion === version && runtimeStatus(current) === "running") {
      return { message: `Ứng dụng đã ở phiên bản ${version}.`, runtime: publicStatus(spec.id, current) };
    }

    const originalName = String(current.Name).replace(/^\//, "");
    const backupName = `${originalName}-backup-${randomUUID().slice(0, 8)}`;
    const wasRunning = Boolean(current.State?.Running);
    let replacementId = null;
    let originalRenamed = false;

    const labels = {
      ...current.Config.Labels,
      "com.docker.compose.image": String(image.Id || ""),
      "io.mini-paas.managed": "true",
      "io.mini-paas.app-id": spec.id,
    };
    const createBody = {
      Image: targetImage,
      Env: replaceEnv(current.Config?.Env, "APP_VERSION", version),
      Labels: labels,
      ExposedPorts: current.Config?.ExposedPorts || { "3000/tcp": {} },
      Healthcheck: current.Config?.Healthcheck,
      HostConfig: {
        NetworkMode: spec.network,
        RestartPolicy: { Name: "unless-stopped", MaximumRetryCount: 0 },
        ReadonlyRootfs: true,
        Tmpfs: { "/tmp": "size=16m,noexec,nosuid" },
        CapDrop: ["ALL"],
        SecurityOpt: ["no-new-privileges:true"],
        NanoCpus: 350_000_000,
        Memory: 134_217_728,
        PidsLimit: 100,
        LogConfig: { Type: "json-file", Config: { "max-size": "5m", "max-file": "2" } },
        Init: true,
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [spec.network]: { Aliases: [spec.service, originalName] },
        },
      },
    };

    try {
      if (wasRunning) await this.docker.stop(current.Id);
      await this.docker.rename(current.Id, backupName);
      originalRenamed = true;
      const created = await this.docker.create(originalName, createBody);
      replacementId = created.Id;
      await this.docker.start(replacementId);
      const status = await this.waitFor(spec.id, replacementId, (item) => runtimeStatus(item) === "running", "Phiên bản mới không đạt trạng thái khỏe trong thời gian cho phép.");
      await this.docker.remove(current.Id);
      return { message: `Ứng dụng đã được cập nhật lên ${version}.`, runtime: status };
    } catch (error) {
      if (replacementId) {
        await this.docker.remove(replacementId).catch(() => undefined);
      }
      if (originalRenamed) {
        await this.docker.rename(current.Id, originalName).catch(() => undefined);
        if (wasRunning) await this.docker.start(current.Id).catch(() => undefined);
      }
      throw error;
    }
  }
}
