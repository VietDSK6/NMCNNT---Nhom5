import assert from "node:assert/strict";
import { test } from "node:test";
import { createDynamicSourceSpec, getAppSpec, getSourceSpec, listPublicSources, validateAction, validateCommitSha, validateRollbackTarget } from "./catalog.mjs";

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
    defaultBranch: "main",
    appId: "app-a",
  }]);
});

test("rollback chỉ chấp nhận image thuộc catalog hoặc source tin cậy", () => {
  const imageId = `sha256:${"1".repeat(64)}`;
  assert.equal(validateRollbackTarget("app-a", {
    version: "v2.0.0",
    imageReference: "mini-paas/app-a:v2.0.0",
    imageId,
  }).version, "v2.0.0");

  const commit = "a".repeat(40);
  assert.equal(validateRollbackTarget("app-a", {
    version: `git-${"a".repeat(12)}`,
    imageReference: `mini-paas/app-a:git-${"a".repeat(12)}`,
    imageId,
    sourceId: "github-app-a",
    commitSha: commit,
  }).commitSha, commit);

  assert.throws(() => validateRollbackTarget("app-a", {
    version: "latest",
    imageReference: "attacker.example/image:latest",
    imageId,
  }), { code: "rollback_target_not_allowed" });
  assert.throws(() => validateRollbackTarget("app-b", {
    version: `git-${"a".repeat(12)}`,
    imageReference: `mini-paas/app-a:git-${"a".repeat(12)}`,
    imageId,
    sourceId: "github-app-a",
    commitSha: commit,
  }), { code: "rollback_target_not_allowed" });
});

test("chuẩn hóa Web Service động và chặn repository ngoài owner tin cậy", () => {
  const source = createDynamicSourceSpec({
    appId: "demo-web",
    name: "Demo Web",
    repositoryUrl: "https://github.com/VietDSK6/demo-web.git",
    defaultBranch: "main",
    contextPath: ".",
  }, ["VietDSK6"]);
  assert.equal(source.id, "github-demo-web");
  assert.equal(source.repositoryUrl, "https://github.com/VietDSK6/demo-web");
  assert.equal(source.imageRepository, "mini-paas/service-demo-web");
  assert.throws(() => createDynamicSourceSpec({
    appId: "demo-web",
    name: "Demo Web",
    repositoryUrl: "https://github.com/attacker/demo-web",
  }, ["VietDSK6"]), { code: "repository_owner_not_allowed", statusCode: 403 });
});
