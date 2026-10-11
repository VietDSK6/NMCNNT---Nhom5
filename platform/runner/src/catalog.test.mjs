import assert from "node:assert/strict";
import { test } from "node:test";
import { getAppSpec, validateAction } from "./catalog.mjs";

test("chỉ chấp nhận ứng dụng trong danh sách cho phép", () => {
  assert.equal(getAppSpec("app-a").service, "app-a");
  assert.throws(() => getAppSpec("../../host"), { code: "application_not_allowed", statusCode: 404 });
});

test("chỉ chấp nhận thao tác và phiên bản đã khai báo", () => {
  assert.equal(validateAction("app-a", "restart").action, "restart");
  assert.equal(validateAction("app-a", "update", "v2.0.0").version, "v2.0.0");
  assert.throws(() => validateAction("app-a", "exec"), { code: "action_not_allowed" });
  assert.throws(() => validateAction("app-a", "update", "latest"), { code: "version_not_allowed" });
  assert.throws(() => validateAction("app-b", "start", "v1.0.0"), { code: "unexpected_version" });
});
