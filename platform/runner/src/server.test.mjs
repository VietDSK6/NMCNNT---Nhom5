import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { test } from "node:test";
import { createRunnerServer } from "./server.mjs";

const token = "runner-test-secret-at-least-24";
const runtime = {
  listSources: () => [{ id: "github-app-a", appId: "app-a" }],
  deploySource: async (sourceId, commit) => ({ sourceId, commit, version: `git-${commit.slice(0, 12)}` }),
  status: async (appId) => ({ appId, status: "running" }),
  logs: async (appId, tail) => ({ appId, requestedTail: tail, lines: [] }),
  stats: async (appId) => ({ appId, cpuPercent: 1.5 }),
  prometheusMetrics: async () => '# TYPE mini_paas_app_running gauge\nmini_paas_app_running{app_id="app-a"} 1\n',
  execute: async (appId, action, version) => ({ message: "done", runtime: { appId, action, version } }),
  configureEnvironment: async (appId, variables) => ({ message: "configured", runtime: { appId, variableCount: variables.length } }),
};
const logger = { info() {}, error() {} };
const server = createRunnerServer({ runtime, token, logger });
const handler = server.listeners("request")[0];

function invoke({ method = "GET", path = "/", headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const request = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
    request.method = method;
    request.url = path;
    request.headers = headers;
    const response = {
      statusCode: 200,
      headers: {},
      writeHead(statusCode, responseHeaders) {
        this.statusCode = statusCode;
        this.headers = responseHeaders;
      },
      end(payload) {
        const raw = payload ? String(payload) : "";
        let parsed = null;
        if (raw) {
          try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        }
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: parsed,
        });
      },
    };
    Promise.resolve(handler(request, response)).catch(reject);
  });
}

test("health không yêu cầu secret", async () => {
  const response = await invoke({ path: "/health" });
  assert.equal(response.statusCode, 200);
});

test("metrics chỉ đọc được trong mạng nội bộ mà không cần secret quản trị", async () => {
  const response = await invoke({ path: "/metrics" });
  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-type"], /version=0\.0\.4/);
  assert.match(response.body, /mini_paas_app_running/);
});

test("từ chối API quản trị khi thiếu secret", async () => {
  const response = await invoke({ path: "/v1/apps/app-a" });
  assert.equal(response.statusCode, 401);
});

test("đọc trạng thái và thực hiện thao tác có xác thực", async () => {
  const headers = { "x-runner-token": token };
  const status = await invoke({ path: "/v1/apps/app-a", headers });
  assert.equal(status.statusCode, 200);
  assert.equal(status.body.data.status, "running");

  const action = await invoke({
    method: "POST",
    path: "/v1/apps/app-a/actions",
    headers: { ...headers, "content-type": "application/json" },
    body: { action: "update", version: "v2.0.0" },
  });
  assert.equal(action.statusCode, 200);
  assert.equal(action.body.data.runtime.version, "v2.0.0");
});

test("đọc log và số liệu với giới hạn số dòng", async () => {
  const headers = { "x-runner-token": token };
  const logs = await invoke({ path: "/v1/apps/app-a/logs?tail=50", headers });
  assert.equal(logs.statusCode, 200);
  assert.equal(logs.body.data.requestedTail, 50);

  const invalid = await invoke({ path: "/v1/apps/app-a/logs?tail=201", headers });
  assert.equal(invalid.statusCode, 400);

  const stats = await invoke({ path: "/v1/apps/app-a/stats", headers });
  assert.equal(stats.statusCode, 200);
  assert.equal(stats.body.data.cpuPercent, 1.5);
});

test("cấu hình biến môi trường qua API nội bộ mà không ghi giá trị vào phản hồi", async () => {
  const response = await invoke({
    method: "PUT",
    path: "/v1/apps/app-a/environment",
    headers: { "x-runner-token": token, "content-type": "application/json" },
    body: { variables: [{ key: "APP_MESSAGE", value: "Xin chào" }] },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.runtime.variableCount, 1);
  assert.doesNotMatch(JSON.stringify(response.body), /Xin chào/);
});

test("liệt kê source tin cậy và yêu cầu triển khai theo commit", async () => {
  const headers = { "x-runner-token": token };
  const sources = await invoke({ path: "/v1/sources", headers });
  assert.equal(sources.statusCode, 200);
  assert.equal(sources.body.data[0].id, "github-app-a");

  const commit = "a".repeat(40);
  const deployment = await invoke({
    method: "POST",
    path: "/v1/sources/github-app-a/deployments",
    headers: { ...headers, "content-type": "application/json" },
    body: { commit },
  });
  assert.equal(deployment.statusCode, 200);
  assert.equal(deployment.body.data.version, `git-${"a".repeat(12)}`);
});
