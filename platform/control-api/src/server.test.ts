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
  appAVersion: "v1.0.0",
  appBVersion: "v1.0.0",
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
  status: async (appId) => ({
    appId,
    status: "running",
    containerId: "0123456789ab",
    containerName: `mini-paas-${appId}-1`,
    image: `mini-paas/${appId}:v1.0.0`,
    observedVersion: "v1.0.0",
    health: "healthy",
    startedAt: "2026-10-11T00:00:00.000Z",
  }),
  execute: async (appId, _action, version) => ({
    message: version ? `Đã cập nhật ${appId} lên ${version}.` : `Đã thao tác ${appId}.`,
    runtime: {
      appId,
      status: "running",
      containerId: "0123456789ab",
      containerName: `mini-paas-${appId}-1`,
      image: `mini-paas/${appId}:${version ?? "v1.0.0"}`,
      observedVersion: version ?? "v1.0.0",
      health: "healthy",
      startedAt: "2026-10-11T00:00:00.000Z",
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
