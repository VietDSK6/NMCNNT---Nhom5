import assert from "node:assert/strict";
import { test } from "node:test";
import { getAppSpec, getSourceSpec, listPublicSources, validateAction, validateCommitSha } from "./catalog.mjs";

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

test("chỉ chấp nhận source được khai báo và commit SHA đầy đủ", () => {
  assert.equal(getSourceSpec("github-app-a").appId, "app-a");
  assert.equal(validateCommitSha("a".repeat(40)), "a".repeat(40));
  assert.throws(() => getSourceSpec("https://attacker.example/repo"), { code: "source_not_allowed", statusCode: 404 });
  assert.throws(() => validateCommitSha("main"), { code: "invalid_commit" });
  assert.throws(() => validateCommitSha("A".repeat(40)), { code: "invalid_commit" });
  assert.deepEqual(listPublicSources(), [{
    id: "github-app-a",
    name: "Ứng dụng A từ GitHub",
    provider: "github",
    repositoryUrl: "https://github.com/VietDSK6/NMCNNT---Nhom5",
    appId: "app-a",
  }]);
});
