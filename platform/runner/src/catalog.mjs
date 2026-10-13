export const APP_CATALOG = Object.freeze({
  "app-a": Object.freeze({
    id: "app-a",
    service: "app-a",
    network: "mini-paas-edge",
    versions: Object.freeze({
      "v1.0.0": "mini-paas/app-a:v1.0.0",
      "v2.0.0": "mini-paas/app-a:v2.0.0",
    }),
  }),
  "app-b": Object.freeze({
    id: "app-b",
    service: "app-b",
    network: "mini-paas-edge",
    versions: Object.freeze({
      "v1.0.0": "mini-paas/app-b:v1.0.0",
    }),
  }),
});

export const ALLOWED_ACTIONS = Object.freeze(["start", "stop", "restart", "update"]);

export const SOURCE_CATALOG = Object.freeze({
  "github-app-a": Object.freeze({
    id: "github-app-a",
    name: "Ứng dụng A từ GitHub",
    provider: "github",
    repositoryUrl: "https://github.com/VietDSK6/NMCNNT---Nhom5",
    archiveBaseUrl: "https://github.com/VietDSK6/NMCNNT---Nhom5/archive",
    latestRevisionUrl: "https://api.github.com/repos/VietDSK6/NMCNNT---Nhom5/git/ref/heads/main",
    defaultBranch: "main",
    contextPath: "apps/app-a",
    appId: "app-a",
    imageRepository: "mini-paas/app-a",
  }),
});

export class RunnerInputError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = "RunnerInputError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function getAppSpec(appId) {
  const spec = APP_CATALOG[appId];
  if (!spec) {
    throw new RunnerInputError("application_not_allowed", "Ứng dụng không nằm trong danh sách Runner được phép quản lý.", 404);
  }
  return spec;
}

export function listAppIds() {
  return Object.keys(APP_CATALOG);
}

export function getSourceSpec(sourceId) {
  const source = SOURCE_CATALOG[sourceId];
  if (!source) {
    throw new RunnerInputError("source_not_allowed", "Kho mã không nằm trong danh sách Runner được phép sử dụng.", 404);
  }
  return source;
}

export function validateCommitSha(commit) {
  if (typeof commit !== "string" || !/^[0-9a-f]{40}$/.test(commit)) {
    throw new RunnerInputError("invalid_commit", "Commit phải là SHA đầy đủ gồm 40 ký tự hexadecimal viết thường.");
  }
  return commit;
}

export function listPublicSources() {
  return Object.values(SOURCE_CATALOG).map(({
    archiveBaseUrl: _archiveBaseUrl,
    latestRevisionUrl: _latestRevisionUrl,
    contextPath: _contextPath,
    imageRepository: _imageRepository,
    ...source
  }) => source);
}

export function validateAction(appId, action, version) {
  const spec = getAppSpec(appId);
  if (!ALLOWED_ACTIONS.includes(action)) {
    throw new RunnerInputError("action_not_allowed", "Thao tác không nằm trong danh sách cho phép.");
  }

  if (action === "update") {
    if (typeof version !== "string" || !spec.versions[version]) {
      throw new RunnerInputError("version_not_allowed", "Phiên bản cập nhật không nằm trong danh sách cho phép.");
    }
  } else if (version !== undefined) {
    throw new RunnerInputError("unexpected_version", "Chỉ thao tác cập nhật mới được phép gửi phiên bản.");
  }

  return { spec, action, version };
}

export function validateRollbackTarget(appId, input) {
  const spec = getAppSpec(appId);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new RunnerInputError("invalid_rollback_target", "Release cần rollback không hợp lệ.");
  }
  const { version, imageReference, imageId, sourceId, commitSha } = input;
  if (typeof version !== "string" || typeof imageReference !== "string") {
    throw new RunnerInputError("invalid_rollback_target", "Release thiếu phiên bản hoặc image reference.");
  }
  if (typeof imageId !== "string" || !/^sha256:[0-9a-f]{64}$/.test(imageId)) {
    throw new RunnerInputError("invalid_release_image_id", "Image ID của release không hợp lệ.");
  }

  if (sourceId !== undefined || commitSha !== undefined) {
    if (typeof sourceId !== "string" || typeof commitSha !== "string") {
      throw new RunnerInputError("invalid_rollback_source", "Release Git thiếu source hoặc commit.");
    }
    const source = getSourceSpec(sourceId);
    const commit = validateCommitSha(commitSha);
    const expectedVersion = `git-${commit.slice(0, 12)}`;
    const expectedReference = `${source.imageRepository}:${expectedVersion}`;
    if (source.appId !== appId || version !== expectedVersion || imageReference !== expectedReference) {
      throw new RunnerInputError("rollback_target_not_allowed", "Release Git không thuộc ứng dụng được phép rollback.", 409);
    }
    return { spec, version, imageReference, imageId, sourceId, commitSha: commit };
  }

  if (spec.versions[version] !== imageReference) {
    throw new RunnerInputError("rollback_target_not_allowed", "Release không thuộc danh mục phiên bản của ứng dụng.", 409);
  }
  return { spec, version, imageReference, imageId };
}
