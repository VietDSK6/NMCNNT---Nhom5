import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AppConfig } from "./config.js";
import { ControlDatabase } from "./database.js";
import type { ApplicationHealth } from "./health.js";
import type { RunnerClient } from "./runner.js";
import { createServer } from "./server.js";

const config: AppConfig = {
  host: "127.0.0.1",
  port: 3000,
  databasePath: ":memory:",
  adminUsername: "admin",
  adminPassword: "P0.2-test-password!",
  sessionTtlSeconds: 3_600,
  sessionCookieName: "mini_paas_session",
  sessionCookieSecure: false,
  publicOrigin: "http://127.0.0.1:8080",
  gatewayBaseUrl: "http://gateway:8080",
  runnerBaseUrl: "http://runner:3001",
  runnerSharedSecret: "runner-test-secret-at-least-24",
  environmentEncryptionKey: "environment-test-key-at-least-32-characters",
  appAVersion: "v1.0.0",
  appBVersion: "v1.0.0",
  serviceBaseDomain: "ai2p.id.vn",
  trustedGithubOwners: ["VietDSK6"],
};

const database = new ControlDatabase(":memory:");
database.ensureAdmin(config.adminUsername, config.adminPassword);
database.seedApplications(config.appAVersion, config.appBVersion);

const healthy: ApplicationHealth = {
  status: "healthy",
  checkedAt: "2026-10-11T00:00:00.000Z",
  latencyMs: 8,
  httpStatus: 200,
  message: "Endpoint HTTP phản hồi bình thường.",
  observedVersion: "v1.0.0",
};

const runnerClient: RunnerClient = {
  sources: async () => [{
    id: "github-app-a",
    name: "Ứng dụng A từ GitHub",
    provider: "github",
    repositoryUrl: "https://github.com/VietDSK6/NMCNNT---Nhom5",
    defaultBranch: "main",
    appId: "app-a",
  }],
  latestRevision: async (sourceId) => ({
    sourceId,
    appId: "app-a",
    branch: "main",
    commit: "b".repeat(40),
  }),
  deploySource: async (sourceId, commit) => ({
    sourceId,
    appId: "app-a",
    commit,
    version: `git-${commit.slice(0, 12)}`,
    imageReference: `mini-paas/app-a:git-${commit.slice(0, 12)}`,
    imageId: `sha256:${"1".repeat(64)}`,
    log: "Step 1/2\nStep 2/2\n",
    message: "Đã build và triển khai commit.",
    runtime: {
      appId: "app-a",
      status: "running",
      containerId: "0123456789ab",
      containerName: "mini-paas-app-a-1",
      image: `mini-paas/app-a:git-${commit.slice(0, 12)}`,
      imageId: `sha256:${"1".repeat(64)}`,
      observedVersion: `git-${commit.slice(0, 12)}`,
      health: "healthy",
      startedAt: "2026-10-12T00:00:00.000Z",
      environmentVariableCount: 0,
    },
  }),
  latestServiceRevision: async (service) => ({
    sourceId: `github-${service.appId}`,
    appId: service.appId,
    branch: service.defaultBranch,
    commit: "c".repeat(40),
  }),
  deployService: async (service, commit) => ({
    sourceId: `github-${service.appId}`,
    appId: service.appId,
    commit,
    version: `git-${commit.slice(0, 12)}`,
    imageReference: `mini-paas/service-${service.appId}:git-${commit.slice(0, 12)}`,
    imageId: `sha256:${"4".repeat(64)}`,
    log: "Step 1/1\n",
    message: "Đã build và triển khai Web Service.",
    runtime: {
      appId: service.appId,
      status: "running",
      containerId: "fedcba987654",
      containerName: `mini-paas-service-${service.appId}`,
      image: `mini-paas/service-${service.appId}:git-${commit.slice(0, 12)}`,
      imageId: `sha256:${"4".repeat(64)}`,
      observedVersion: `git-${commit.slice(0, 12)}`,
      health: null,
      startedAt: "2026-10-15T00:00:00.000Z",
      environmentVariableCount: 0,
    },
  }),
  status: async (appId) => ({
    appId,
    status: "running",
    containerId: "0123456789ab",
    containerName: `mini-paas-${appId}-1`,
    image: `mini-paas/${appId}:v1.0.0`,
    imageId: `sha256:${"1".repeat(64)}`,
    observedVersion: "v1.0.0",
    health: "healthy",
    startedAt: "2026-10-11T00:00:00.000Z",
    environmentVariableCount: 0,
  }),
  logs: async (appId, tail) => ({
    appId,
    containerId: "0123456789ab",
    requestedTail: tail,
    lines: [{ timestamp: "2026-10-12T01:02:03.000Z", stream: "stdout", message: "ready" }],
    truncated: false,
    fetchedAt: "2026-10-12T01:02:04.000Z",
  }),
  stats: async (appId) => ({
    appId,
    containerId: "0123456789ab",
    cpuPercent: 1.25,
    memoryWorkingSetBytes: 16_777_216,
    memoryLimitBytes: 134_217_728,
    memoryPercent: 12.5,
    pids: 8,
    networkRxBytes: 1_024,
    networkTxBytes: 2_048,
    sampledAt: "2026-10-12T01:02:03.000Z",
  }),
  execute: async (appId, _action, version) => ({
    message: version ? `Đã cập nhật ${appId} lên ${version}.` : `Đã thao tác ${appId}.`,
    runtime: {
      appId,
      status: "running",
      containerId: "0123456789ab",
      containerName: `mini-paas-${appId}-1`,
      image: `mini-paas/${appId}:${version ?? "v1.0.0"}`,
      imageId: `sha256:${(version === "v2.0.0" ? "2" : "1").repeat(64)}`,
      observedVersion: version ?? "v1.0.0",
      health: "healthy",
      startedAt: "2026-10-11T00:00:00.000Z",
      environmentVariableCount: 0,
    },
  }),
  configureEnvironment: async (appId, variables) => ({
    message: `Đã áp dụng ${variables.length} biến môi trường.`,
    runtime: {
      appId,
      status: "running",
      containerId: "0123456789ab",
      containerName: `mini-paas-${appId}-1`,
      image: `mini-paas/${appId}:v1.0.0`,
      imageId: `sha256:${"1".repeat(64)}`,
      observedVersion: "v1.0.0",
      health: "healthy",
      startedAt: "2026-10-12T00:00:00.000Z",
      environmentVariableCount: variables.length,
    },
  }),
  rollback: async (appId, target) => ({
    message: `Đã rollback ${appId} về ${target.version}.`,
    runtime: {
      appId,
      status: "running",
      containerId: "0123456789ab",
      containerName: `mini-paas-${appId}-1`,
      image: target.imageReference,
      imageId: target.imageId,
      observedVersion: target.version,
      health: "healthy",
      startedAt: "2026-10-13T00:00:00.000Z",
      environmentVariableCount: 0,
    },
  }),
};

const server = createServer(config, database, {
  logger: false,
  healthInspector: async () => healthy,
  runnerClient,
});

before(async () => server.ready());
after(async () => {
  await server.close();
  database.close();
});

test("từ chối danh sách ứng dụng khi chưa đăng nhập", async () => {
  const response = await server.inject({ method: "GET", url: "/api/v1/applications" });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, "authentication_required");
});

test("từ chối mật khẩu sai và ghi audit", async () => {
  const response = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { username: "admin", password: "wrong-password" },
  });
  assert.equal(response.statusCode, 401);
  assert.equal(database.listAudit(10)[0]?.outcome, "failed");
});

test("đăng nhập, đọc ứng dụng và đăng xuất bằng session cookie", async () => {
  const login = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: config.publicOrigin },
    payload: { username: config.adminUsername, password: config.adminPassword },
  });
  assert.equal(login.statusCode, 200);
  const setCookie = login.headers["set-cookie"];
  assert.ok(setCookie);
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(cookie);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);

  const applications = await server.inject({
    method: "GET",
    url: "/api/v1/applications",
    headers: { cookie },
  });
  assert.equal(applications.statusCode, 200);
  assert.equal(applications.json().data.length, 2);
  assert.equal(applications.json().summary.healthy, 2);
  assert.equal(applications.json().data[0].runtime.status, "running");

  const logout = await server.inject({
    method: "POST",
    url: "/api/v1/auth/logout",
    headers: { cookie, origin: config.publicOrigin },
  });
  assert.equal(logout.statusCode, 204);

  const session = await server.inject({
    method: "GET",
    url: "/api/v1/auth/session",
    headers: { cookie },
  });
  assert.equal(session.statusCode, 401);
});

test("chặn POST từ origin không được phép", async () => {
  const response = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: "https://attacker.example" },
    payload: { username: config.adminUsername, password: config.adminPassword },
  });
  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error, "origin_not_allowed");
});

test("xếp hàng thao tác cập nhật và lưu kết quả", async () => {
  const login = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: config.publicOrigin },
    payload: { username: config.adminUsername, password: config.adminPassword },
  });
  const setCookie = login.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(cookie);

  const action = await server.inject({
    method: "POST",
    url: "/api/v1/applications/app-a/actions",
    headers: { cookie, origin: config.publicOrigin },
    payload: { action: "update", version: "v2.0.0" },
  });
  assert.equal(action.statusCode, 202);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (database.listOperations(1)[0]?.status === "succeeded") break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const operation = database.listOperations(1)[0];
  assert.equal(operation?.status, "succeeded");
  assert.equal(operation?.requestedVersion, "v2.0.0");
  assert.equal(database.findApplication("app-a")?.desiredVersion, "v2.0.0");
  assert.equal(database.listAudit(1)[0]?.action, "application.update");
});

test("từ chối thao tác thiếu xác thực và dữ liệu không đúng", async () => {
  const unauthenticated = await server.inject({
    method: "POST",
    url: "/api/v1/applications/app-a/actions",
    payload: { action: "restart" },
  });
  assert.equal(unauthenticated.statusCode, 401);

  const login = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: config.publicOrigin },
    payload: { username: config.adminUsername, password: config.adminPassword },
  });
  const setCookie = login.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(cookie);
  const invalid = await server.inject({
    method: "POST",
    url: "/api/v1/applications/app-a/actions",
    headers: { cookie, origin: config.publicOrigin },
    payload: { action: "update" },
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().error, "version_required");
});

test("log và số liệu tài nguyên yêu cầu phiên đăng nhập, có giới hạn đầu vào", async () => {
  const unauthenticated = await server.inject({ method: "GET", url: "/api/v1/applications/app-a/logs" });
  assert.equal(unauthenticated.statusCode, 401);

  const login = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: config.publicOrigin },
    payload: { username: config.adminUsername, password: config.adminPassword },
  });
  const setCookie = login.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(cookie);

  const invalidTail = await server.inject({
    method: "GET",
    url: "/api/v1/applications/app-a/logs?tail=201",
    headers: { cookie },
  });
  assert.equal(invalidTail.statusCode, 400);

  const logs = await server.inject({
    method: "GET",
    url: "/api/v1/applications/app-a/logs?tail=50",
    headers: { cookie },
  });
  assert.equal(logs.statusCode, 200);
  assert.equal(logs.json().data.requestedTail, 50);
  assert.equal(logs.json().data.lines[0].message, "ready");

  const stats = await server.inject({
    method: "GET",
    url: "/api/v1/applications/app-a/stats",
    headers: { cookie },
  });
  assert.equal(stats.statusCode, 200);
  assert.equal(stats.json().data.memoryLimitBytes, 134_217_728);

  const unknown = await server.inject({
    method: "GET",
    url: "/api/v1/applications/not-registered/stats",
    headers: { cookie },
  });
  assert.equal(unknown.statusCode, 404);
});

test("tạo deployment theo commit cụ thể hoặc commit mới nhất và lưu build metadata", async () => {
  const login = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: config.publicOrigin },
    payload: { username: config.adminUsername, password: config.adminPassword },
  });
  const setCookie = login.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(cookie);

  const sources = await server.inject({ method: "GET", url: "/api/v1/sources", headers: { cookie } });
  assert.equal(sources.statusCode, 200);
  assert.equal(sources.json().data[0].id, "github-app-a");

  const commit = "a".repeat(40);
  const created = await server.inject({
    method: "POST",
    url: "/api/v1/deployments",
    headers: { cookie, origin: config.publicOrigin },
    payload: { sourceId: "github-app-a", commit },
  });
  assert.equal(created.statusCode, 202);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (database.listDeployments(1)[0]?.status === "succeeded") break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const deployment = database.listDeployments(1)[0];
  assert.equal(deployment?.status, "succeeded");
  assert.equal(deployment?.commitSha, commit);
  assert.equal(deployment?.version, `git-${"a".repeat(12)}`);
  assert.match(deployment?.buildLog ?? "", /Step 1\/2/);
  assert.equal(database.findApplication("app-a")?.desiredVersion, `git-${"a".repeat(12)}`);

  const history = await server.inject({ method: "GET", url: "/api/v1/deployments", headers: { cookie } });
  assert.equal(history.statusCode, 200);
  assert.equal(history.json().data[0].sourceId, "github-app-a");

  const latest = await server.inject({
    method: "POST",
    url: "/api/v1/deployments/latest",
    headers: { cookie, origin: config.publicOrigin },
    payload: { sourceId: "github-app-a" },
  });
  assert.equal(latest.statusCode, 202);
  assert.equal(latest.json().data.commitSha, "b".repeat(40));
  const latestId = latest.json().data.id;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (database.findDeployment(latestId)?.status === "succeeded") break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(database.findDeployment(latestId)?.status, "succeeded");
  assert.equal(database.findDeployment(latestId)?.version, `git-${"b".repeat(12)}`);
});

test("liệt kê release và rollback về đúng image đã ghi nhận", async () => {
  const login = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: config.publicOrigin },
    payload: { username: config.adminUsername, password: config.adminPassword },
  });
  const setCookie = login.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(cookie);

  const unauthenticated = await server.inject({
    method: "POST",
    url: `/api/v1/releases/${randomReleaseId()}/rollback`,
  });
  assert.equal(unauthenticated.statusCode, 401);

  const history = await server.inject({
    method: "GET",
    url: "/api/v1/releases?applicationId=app-a&limit=20",
    headers: { cookie },
  });
  assert.equal(history.statusCode, 200);
  const target = history.json().data.find((release: { origin: string; commitSha: string | null }) => (
    release.origin === "source" && release.commitSha === "a".repeat(40)
  ));
  assert.ok(target);

  const rollback = await server.inject({
    method: "POST",
    url: `/api/v1/releases/${target.id}/rollback`,
    headers: { cookie, origin: config.publicOrigin },
  });
  assert.equal(rollback.statusCode, 200);
  assert.equal(rollback.json().data.origin, "rollback");
  assert.equal(rollback.json().data.rollbackOfReleaseId, target.id);
  assert.equal(rollback.json().runtime.imageId, target.imageId);
  assert.equal(database.findApplication("app-a")?.desiredVersion, target.version);
  assert.equal(database.listAudit(1)[0]?.action, "release.rollback");
});

function randomReleaseId(): string {
  return "00000000-0000-4000-8000-000000000000";
}

test("từ chối source lạ và commit không đúng định dạng", async () => {
  const login = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: config.publicOrigin },
    payload: { username: config.adminUsername, password: config.adminPassword },
  });
  const setCookie = login.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(cookie);

  const invalidCommit = await server.inject({
    method: "POST",
    url: "/api/v1/deployments",
    headers: { cookie, origin: config.publicOrigin },
    payload: { sourceId: "github-app-a", commit: "main" },
  });
  assert.equal(invalidCommit.statusCode, 400);

  const unknownSource = await server.inject({
    method: "POST",
    url: "/api/v1/deployments",
    headers: { cookie, origin: config.publicOrigin },
    payload: { sourceId: "unknown-source", commit: "b".repeat(40) },
  });
  assert.equal(unknownSource.statusCode, 404);
  assert.equal(unknownSource.json().error, "source_not_allowed");

  const unknownLatestSource = await server.inject({
    method: "POST",
    url: "/api/v1/deployments/latest",
    headers: { cookie, origin: config.publicOrigin },
    payload: { sourceId: "unknown-source" },
  });
  assert.equal(unknownLatestSource.statusCode, 404);
  assert.equal(unknownLatestSource.json().error, "source_not_allowed");
});

test("lưu biến môi trường có mã hóa, che giá trị nhạy cảm và chặn biến hệ thống", async () => {
  const login = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: config.publicOrigin },
    payload: { username: config.adminUsername, password: config.adminPassword },
  });
  const setCookie = login.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(cookie);

  const unauthenticated = await server.inject({
    method: "GET",
    url: "/api/v1/applications/app-a/environment",
  });
  assert.equal(unauthenticated.statusCode, 401);

  const updated = await server.inject({
    method: "PUT",
    url: "/api/v1/applications/app-a/environment",
    headers: { cookie, origin: config.publicOrigin },
    payload: {
      variables: [
        { key: "APP_MESSAGE", value: "Môi trường kiểm thử", sensitive: false },
        { key: "DEMO_SECRET", value: "not-returned-by-api", sensitive: true },
      ],
    },
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().data.count, 2);
  assert.equal(updated.json().data.variables[0].value, "Môi trường kiểm thử");
  assert.equal(updated.json().data.variables[1].value, null);

  const stored = database.listEnvironmentVariables("app-a");
  assert.equal(stored.length, 2);
  assert.doesNotMatch(stored[1]!.encryptedValue, /not-returned-by-api/);

  const retained = await server.inject({
    method: "PUT",
    url: "/api/v1/applications/app-a/environment",
    headers: { cookie, origin: config.publicOrigin },
    payload: {
      variables: [
        { key: "APP_MESSAGE", value: "Đã cập nhật", sensitive: false },
        { key: "DEMO_SECRET", value: null, sensitive: true },
      ],
    },
  });
  assert.equal(retained.statusCode, 200);
  assert.equal(retained.json().data.variables[1].value, null);

  const reserved = await server.inject({
    method: "PUT",
    url: "/api/v1/applications/app-a/environment",
    headers: { cookie, origin: config.publicOrigin },
    payload: { variables: [{ key: "APP_VERSION", value: "override", sensitive: false }] },
  });
  assert.equal(reserved.statusCode, 400);
  assert.equal(reserved.json().error, "reserved_environment_key");

  const cleared = await server.inject({
    method: "PUT",
    url: "/api/v1/applications/app-a/environment",
    headers: { cookie, origin: config.publicOrigin },
    payload: { variables: [] },
  });
  assert.equal(cleared.statusCode, 200);
  assert.equal(database.listEnvironmentVariables("app-a").length, 0);
});

test("tạo Web Service từ repository tin cậy và xếp hàng deployment đầu tiên", async () => {
  const login = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: config.publicOrigin },
    payload: { username: config.adminUsername, password: config.adminPassword },
  });
  const setCookie = login.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(cookie);

  const response = await server.inject({
    method: "POST",
    url: "/api/v1/services",
    headers: { cookie, origin: config.publicOrigin },
    payload: {
      name: "Demo Web",
      slug: "demo-web",
      repositoryUrl: "https://github.com/VietDSK6/demo-web",
      defaultBranch: "main",
      buildContext: ".",
    },
  });
  assert.equal(response.statusCode, 202);
  assert.equal(response.json().data.application.publicHost, "demo-web.ai2p.id.vn");
  assert.equal(response.json().data.deployment.sourceId, "github-demo-web");
  assert.equal(database.findApplication("demo-web")?.kind, "git");

  const blocked = await server.inject({
    method: "POST",
    url: "/api/v1/services",
    headers: { cookie, origin: config.publicOrigin },
    payload: {
      name: "Kho lạ",
      slug: "foreign-repo",
      repositoryUrl: "https://github.com/attacker/example",
    },
  });
  assert.equal(blocked.statusCode, 403);
  assert.equal(blocked.json().error, "repository_owner_not_allowed");
});
