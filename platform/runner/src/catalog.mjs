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
