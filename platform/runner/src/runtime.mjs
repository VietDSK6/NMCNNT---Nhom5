import { randomUUID } from "node:crypto";
import {
  createDynamicSourceSpec,
  getAppSpec,
  getRuntimeAppSpec,
  getSourceSpec,
  listAppIds,
  listPublicSources,
  RunnerInputError,
  validateAction,
  validateCommitSha,
  validateRollbackTarget,
} from "./catalog.mjs";
import { decodeDockerLogs, OBSERVABILITY_LIMITS, summarizeDockerStats } from "./observability.mjs";
import { renderPrometheusMetrics } from "./metrics.mjs";
import { validateEnvironmentVariables } from "./environment.mjs";

const ENVIRONMENT_KEYS_LABEL = "io.mini-paas.environment-keys";

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

function environmentKey(item) {
  const index = item.indexOf("=");
  return index === -1 ? item : item.slice(0, index);
}

function managedEnvironmentKeys(labels = {}) {
  const value = labels?.[ENVIRONMENT_KEYS_LABEL];
  if (typeof value !== "string" || value === "") return [];
  return value.split(",").filter((key) => /^[A-Z][A-Z0-9_]{0,63}$/.test(key));
}

function replaceManagedEnvironment(environment = [], previousKeys, variables) {
  const managed = new Set([...previousKeys, ...variables.map((variable) => variable.key)]);
  return [
    ...environment.filter((item) => !managed.has(environmentKey(item))),
    ...variables.map((variable) => `${variable.key}=${variable.value}`),
  ];
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
    imageId: String(inspect.Image || ""),
    observedVersion: envValue(inspect.Config?.Env, "APP_VERSION"),
    health: inspect.State?.Health?.Status ?? null,
    startedAt: inspect.State?.StartedAt || null,
    environmentVariableCount: managedEnvironmentKeys(inspect.Config?.Labels).length,
  };
}

export class DeploymentRuntime {
  constructor(docker, options = {}) {
    this.docker = docker;
    this.sourceBuilder = options.sourceBuilder;
    this.project = options.project || "mini-paas";
    this.waitTimeoutMs = options.waitTimeoutMs || 30_000;
    this.pollIntervalMs = options.pollIntervalMs || 500;
    this.trustedOwners = options.trustedOwners || ["VietDSK6"];
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
    const spec = getRuntimeAppSpec(appId);
    return publicStatus(appId, await this.findContainer(spec));
  }

  listSources() {
    return listPublicSources();
  }

  async latestRevision(sourceId) {
    const source = getSourceSpec(sourceId);
    if (!this.sourceBuilder) {
      throw new RunnerRuntimeError("source_builder_unavailable", "Runner chưa được cấu hình bộ đọc mã nguồn.", 503);
    }
    return {
      sourceId: source.id,
      appId: source.appId,
      branch: source.defaultBranch,
      commit: await this.sourceBuilder.resolveLatestCommit(source),
    };
  }

  async latestServiceRevision(input) {
    const source = createDynamicSourceSpec(input, this.trustedOwners);
    if (!this.sourceBuilder) {
      throw new RunnerRuntimeError("source_builder_unavailable", "Runner chưa được cấu hình bộ đọc mã nguồn.", 503);
    }
    return {
      sourceId: source.id,
      appId: source.appId,
      branch: source.defaultBranch,
      commit: await this.sourceBuilder.resolveLatestCommit(source),
    };
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

  async deployService(input, commit) {
    const source = createDynamicSourceSpec(input, this.trustedOwners);
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
      const spec = getRuntimeAppSpec(source.appId);
      let deployment;
      try {
        const current = await this.findContainer(spec);
        deployment = await this.updateExisting(spec, current, build.version, build.imageReference);
      } catch (error) {
        if (error?.code !== "container_not_found") throw error;
        deployment = await this.createDynamicContainer(spec, build.version, build.imageReference);
      }
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
    const spec = getRuntimeAppSpec(appId);
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
    const spec = getRuntimeAppSpec(appId);
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

  async prometheusMetrics() {
    let appIds = listAppIds();
    if (typeof this.docker.listProjectManaged === "function") {
      try {
        const containers = await this.docker.listProjectManaged(this.project);
        appIds = [...new Set([
          ...appIds,
          ...containers.map((container) => container.Labels?.["io.mini-paas.app-id"]).filter(Boolean),
        ])];
      } catch {
        // Giữ metric của catalog khi Docker tạm thời không liệt kê được container động.
      }
    }
    const samples = await Promise.all(appIds.map(async (appId) => {
      try {
        const status = await this.status(appId);
        const running = ["running", "starting", "unhealthy"].includes(status.status);
        const base = {
          appId,
          running,
          healthy: status.health === "healthy",
          scrapeSuccess: true,
          containerId: status.containerId,
          version: status.observedVersion,
          status: status.status,
          health: status.health,
          stats: null,
        };
        if (!running) return base;
        try {
          return { ...base, stats: await this.stats(appId) };
        } catch {
          return { ...base, scrapeSuccess: false };
        }
      } catch {
        return {
          appId,
          running: false,
          healthy: false,
          scrapeSuccess: false,
          containerId: null,
          version: null,
          status: "unknown",
          health: "unknown",
          stats: null,
        };
      }
    }));
    return renderPrometheusMetrics(samples);
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

  async configureEnvironment(appId, input) {
    const spec = getRuntimeAppSpec(appId);
    const variables = validateEnvironmentVariables(input);
    if (this.locks.has(appId)) {
      throw new RunnerRuntimeError("application_busy", "Ứng dụng đang có một thao tác khác được xử lý.", 409);
    }
    this.locks.add(appId);
    try {
      const current = await this.findContainer(spec);
      const previousKeys = managedEnvironmentKeys(current.Config?.Labels);
      const labels = {
        ...current.Config?.Labels,
        [ENVIRONMENT_KEYS_LABEL]: variables.map((variable) => variable.key).join(","),
        "io.mini-paas.managed": "true",
        "io.mini-paas.app-id": spec.id,
      };
      const environment = replaceManagedEnvironment(current.Config?.Env, previousKeys, variables);
      return await this.replaceContainer(
        spec,
        current,
        current.Config?.Image,
        environment,
        labels,
        `Đã áp dụng ${variables.length} biến môi trường và tái tạo container.`,
      );
    } finally {
      this.locks.delete(appId);
    }
  }

  async rollback(appId, input) {
    const target = validateRollbackTarget(appId, input);
    if (this.locks.has(appId)) {
      throw new RunnerRuntimeError("application_busy", "Ứng dụng đang có một thao tác khác được xử lý.", 409);
    }
    this.locks.add(appId);
    try {
      const image = await this.docker.image(target.imageReference).catch((error) => {
        if (error?.statusCode === 404) {
          throw new RunnerRuntimeError("release_image_missing", "Image của release không còn trên Docker host.", 409);
        }
        throw error;
      });
      if (String(image.Id || "") !== target.imageId) {
        throw new RunnerRuntimeError(
          "release_image_changed",
          "Image reference không còn trỏ tới đúng nội dung đã ghi trong release.",
          409,
        );
      }

      const current = await this.findContainer(target.spec);
      if (
        String(current.Image || "") === target.imageId
        && envValue(current.Config?.Env, "APP_VERSION") === target.version
        && runtimeStatus(current) === "running"
      ) {
        return {
          message: `Ứng dụng đã chạy đúng release ${target.version}.`,
          runtime: publicStatus(appId, current),
        };
      }
      const labels = {
        ...current.Config?.Labels,
        "com.docker.compose.image": target.imageId,
        "io.mini-paas.managed": "true",
        "io.mini-paas.app-id": target.spec.id,
      };
      return await this.replaceContainer(
        target.spec,
        current,
        target.imageReference,
        replaceEnv(current.Config?.Env, "APP_VERSION", target.version),
        labels,
        `Ứng dụng đã rollback về release ${target.version}.`,
      );
    } finally {
      this.locks.delete(appId);
    }
  }

  async replaceContainer(spec, current, targetImage, environment, labels, message) {
    const originalName = String(current.Name).replace(/^\//, "");
    const backupName = `${originalName}-backup-${randomUUID().slice(0, 8)}`;
    const wasRunning = Boolean(current.State?.Running);
    let replacementId = null;
    let originalRenamed = false;

    const createBody = {
      Image: targetImage,
      Env: environment,
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
      const status = await this.waitFor(spec.id, replacementId, (item) => runtimeStatus(item) === "running", "Container thay thế không đạt trạng thái khỏe trong thời gian cho phép.");
      await this.docker.remove(current.Id);
      return { message, runtime: status };
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

  async createDynamicContainer(spec, version, imageReference) {
    const image = await this.docker.image(imageReference).catch((error) => {
      if (error?.statusCode === 404) {
        throw new RunnerRuntimeError("image_not_prepared", `Ảnh ${imageReference} chưa được chuẩn bị trên máy chủ.`, 409);
      }
      throw error;
    });
    const containerName = `mini-paas-service-${spec.id}`;
    const labels = {
      "com.docker.compose.project": this.project,
      "com.docker.compose.service": spec.service,
      "com.docker.compose.image": String(image.Id || ""),
      "io.mini-paas.managed": "true",
      "io.mini-paas.dynamic": "true",
      "io.mini-paas.app-id": spec.id,
      "io.mini-paas.slug": spec.id,
      [ENVIRONMENT_KEYS_LABEL]: "",
    };
    const body = {
      Image: imageReference,
      Env: [`APP_VERSION=${version}`, "PORT=3000"],
      Labels: labels,
      ExposedPorts: { "3000/tcp": {} },
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
        EndpointsConfig: { [spec.network]: { Aliases: [spec.service, containerName] } },
      },
    };
    let containerId = null;
    try {
      const created = await this.docker.create(containerName, body);
      containerId = created.Id;
      await this.docker.start(containerId);
      const status = await this.waitFor(
        spec.id,
        containerId,
        (item) => runtimeStatus(item) === "running",
        "Container mới không đạt trạng thái hoạt động trong thời gian cho phép.",
      );
      return { message: `Ứng dụng đã được triển khai ở ${version}.`, runtime: status };
    } catch (error) {
      if (containerId) await this.docker.remove(containerId).catch(() => undefined);
      throw error;
    }
  }

  async updateExisting(spec, current, version, targetImage) {
    const image = await this.docker.image(targetImage).catch((error) => {
      if (error?.statusCode === 404) {
        throw new RunnerRuntimeError("image_not_prepared", `Ảnh ${targetImage} chưa được chuẩn bị trên máy chủ.`, 409);
      }
      throw error;
    });
    const currentVersion = envValue(current.Config?.Env, "APP_VERSION");
    if (currentVersion === version && runtimeStatus(current) === "running") {
      return { message: `Ứng dụng đã ở phiên bản ${version}.`, runtime: publicStatus(spec.id, current) };
    }
    const labels = {
      ...current.Config?.Labels,
      "com.docker.compose.image": String(image.Id || ""),
      "io.mini-paas.managed": "true",
      "io.mini-paas.app-id": spec.id,
    };
    return this.replaceContainer(
      spec,
      current,
      targetImage,
      replaceEnv(current.Config?.Env, "APP_VERSION", version),
      labels,
      `Ứng dụng đã được cập nhật lên ${version}.`,
    );
  }

  async update(spec, version, preparedImage) {
    const targetImage = preparedImage ?? spec.versions[version];
    if (!targetImage) {
      throw new RunnerInputError("version_not_allowed", "Phiên bản cập nhật không nằm trong danh sách cho phép.");
    }
    const current = await this.findContainer(spec);
    return this.updateExisting(spec, current, version, targetImage);
  }
}
