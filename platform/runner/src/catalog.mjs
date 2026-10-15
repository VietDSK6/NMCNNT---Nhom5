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
const DYNAMIC_ACTIONS = Object.freeze(["start", "stop", "restart"]);
const SERVICE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const BUILD_CONTEXT_PATTERN = /^(?:\.|[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*)$/;
const RESERVED_SERVICE_SLUGS = new Set(["paas", "www", "api", "app-a", "app-b"]);

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

export function getRuntimeAppSpec(appId) {
  if (APP_CATALOG[appId]) return APP_CATALOG[appId];
  const slug = validateServiceSlug(appId);
  return Object.freeze({
    id: slug,
    service: `service-${slug}`,
    network: "mini-paas-edge",
    versions: Object.freeze({}),
    dynamic: true,
  });
}

export function validateServiceSlug(value) {
  if (typeof value !== "string" || !SERVICE_SLUG_PATTERN.test(value) || RESERVED_SERVICE_SLUGS.has(value)) {
    throw new RunnerInputError(
      "invalid_service_slug",
      "Slug chỉ gồm chữ thường, số, dấu gạch ngang và không được trùng tên hệ thống.",
    );
  }
  return value;
}

export function createDynamicSourceSpec(input, trustedOwners = ["VietDSK6"]) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new RunnerInputError("invalid_service_source", "Cấu hình Web Service không hợp lệ.");
  }
  const appId = validateServiceSlug(input.appId);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    throw new RunnerInputError("invalid_service_name", "Tên Web Service phải có từ 2 đến 80 ký tự.");
  }
  if (typeof input.repositoryUrl !== "string") {
    throw new RunnerInputError("invalid_repository_url", "Repository GitHub không hợp lệ.");
  }
  const match = input.repositoryUrl.match(/^https:\/\/github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})(?:\.git)?$/);
  if (!match) {
    throw new RunnerInputError("invalid_repository_url", "Chỉ hỗ trợ URL repository GitHub công khai dạng https://github.com/owner/repo.");
  }
  const owner = match[1];
  const repository = match[2].replace(/\.git$/, "");
  if (!trustedOwners.some((item) => item.toLowerCase() === owner.toLowerCase())) {
    throw new RunnerInputError("repository_owner_not_allowed", "Chủ sở hữu repository chưa nằm trong danh sách được phép.", 403);
  }
  const defaultBranch = input.defaultBranch ?? "main";
  if (defaultBranch !== "main") {
    throw new RunnerInputError("branch_not_allowed", "MVP hiện chỉ triển khai nhánh main.");
  }
  const contextPath = input.contextPath ?? ".";
  if (typeof contextPath !== "string" || !BUILD_CONTEXT_PATTERN.test(contextPath) || contextPath.split("/").includes("..")) {
    throw new RunnerInputError("invalid_source_context", "Build context phải là đường dẫn tương đối an toàn trong repository.");
  }
  const repositoryUrl = `https://github.com/${owner}/${repository}`;
  return Object.freeze({
    id: `github-${appId}`,
    name,
    provider: "github",
    repositoryUrl,
    archiveBaseUrl: `${repositoryUrl}/archive`,
    latestRevisionUrl: `https://api.github.com/repos/${owner}/${repository}/git/ref/heads/${defaultBranch}`,
    defaultBranch,
    contextPath,
    appId,
    imageRepository: `mini-paas/service-${appId}`,
    dynamic: true,
  });
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
  const spec = getRuntimeAppSpec(appId);
  if (!ALLOWED_ACTIONS.includes(action)) {
    throw new RunnerInputError("action_not_allowed", "Thao tác không nằm trong danh sách cho phép.");
  }

  if (spec.dynamic && !DYNAMIC_ACTIONS.includes(action)) {
    throw new RunnerInputError("action_not_allowed", "Web Service từ Git chỉ cập nhật qua một deployment mới.");
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
  const spec = getRuntimeAppSpec(appId);
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
    const commit = validateCommitSha(commitSha);
    const expectedVersion = `git-${commit.slice(0, 12)}`;
    const source = SOURCE_CATALOG[sourceId];
    const expectedSourceId = spec.dynamic
      ? `github-${appId}`
      : source?.appId === appId ? source.id : null;
    const expectedReference = spec.dynamic
      ? `mini-paas/service-${appId}:${expectedVersion}`
      : source ? `${source.imageRepository}:${expectedVersion}` : null;
    if (sourceId !== expectedSourceId || version !== expectedVersion || imageReference !== expectedReference) {
      throw new RunnerInputError("rollback_target_not_allowed", "Release Git không thuộc ứng dụng được phép rollback.", 409);
    }
    return { spec, version, imageReference, imageId, sourceId, commitSha: commit };
  }

  if (spec.versions[version] !== imageReference) {
    throw new RunnerInputError("rollback_target_not_allowed", "Release không thuộc danh mục phiên bản của ứng dụng.", 409);
  }
  return { spec, version, imageReference, imageId };
}
