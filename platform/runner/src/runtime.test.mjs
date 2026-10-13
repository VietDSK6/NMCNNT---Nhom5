import assert from "node:assert/strict";
import { test } from "node:test";
import { DeploymentRuntime } from "./runtime.mjs";

function inspected(id, service, state) {
  return {
    Id: id,
    Name: `/mini-paas-${service}-1`,
    Config: {
      Image: `mini-paas/${service}:v1.0.0`,
      Env: ["APP_VERSION=v1.0.0"],
    },
    State: state,
  };
}

test("metric phân biệt container đang chạy nhưng unhealthy với container đã dừng", async () => {
  const docker = {
    listManaged: async (_project, service) => [{ Id: `${service}-container` }],
    inspect: async (id) => id.startsWith("app-a")
      ? inspected(id, "app-a", { Running: true, Health: { Status: "unhealthy" }, StartedAt: "2026-10-12T00:00:00Z" })
      : inspected(id, "app-b", { Running: false, StartedAt: "2026-10-12T00:00:00Z" }),
    stats: async () => ({
      read: "2026-10-12T00:00:01Z",
      cpu_stats: { cpu_usage: { total_usage: 150 }, system_cpu_usage: 1_200, online_cpus: 2 },
      precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1_000 },
      memory_stats: { usage: 10_000, limit: 20_000, stats: { inactive_file: 2_000 } },
      pids_stats: { current: 7 },
      networks: {},
    }),
  };
  const output = await new DeploymentRuntime(docker).prometheusMetrics();

  assert.match(output, /mini_paas_app_running\{app_id="app-a"\} 1/);
  assert.match(output, /mini_paas_app_healthy\{app_id="app-a"\} 0/);
  assert.match(output, /mini_paas_app_cpu_percent\{app_id="app-a"\} 50/);
  assert.match(output, /mini_paas_app_running\{app_id="app-b"\} 0/);
  assert.doesNotMatch(output, /mini_paas_app_cpu_percent\{app_id="app-b"\}/);
});

test("rollback xác minh image ID và giữ biến môi trường đang quản lý", async () => {
  const targetImageId = `sha256:${"2".repeat(64)}`;
  let createBody = null;
  const current = {
    Id: "current-container",
    Image: `sha256:${"1".repeat(64)}`,
    Name: "/mini-paas-app-a-1",
    Config: {
      Image: "mini-paas/app-a:v1.0.0",
      Env: ["APP_VERSION=v1.0.0", "APP_MESSAGE=Giữ nguyên", "DEMO_SECRET=fake"],
      Labels: {
        "com.docker.compose.project": "mini-paas",
        "com.docker.compose.service": "app-a",
        "io.mini-paas.managed": "true",
        "io.mini-paas.app-id": "app-a",
        "io.mini-paas.environment-keys": "APP_MESSAGE,DEMO_SECRET",
      },
      ExposedPorts: { "3000/tcp": {} },
    },
    State: { Running: true, Health: { Status: "healthy" }, StartedAt: "2026-10-13T00:00:00Z" },
  };
  const docker = {
    listManaged: async () => [{ Id: current.Id }],
    image: async () => ({ Id: targetImageId }),
    inspect: async (id) => id === current.Id ? current : {
      Id: id,
      Image: targetImageId,
      Name: "/mini-paas-app-a-1",
      Config: createBody,
      State: { Running: true, Health: { Status: "healthy" }, StartedAt: "2026-10-13T00:01:00Z" },
    },
    stop: async () => undefined,
    rename: async () => undefined,
    create: async (_name, body) => { createBody = body; return { Id: "replacement-container" }; },
    start: async () => undefined,
    remove: async () => undefined,
  };
  const runtime = new DeploymentRuntime(docker, { waitTimeoutMs: 100, pollIntervalMs: 1 });
  const result = await runtime.rollback("app-a", {
    version: "v2.0.0",
    imageReference: "mini-paas/app-a:v2.0.0",
    imageId: targetImageId,
  });

  assert.equal(result.runtime.imageId, targetImageId);
  assert.ok(createBody.Env.includes("APP_VERSION=v2.0.0"));
  assert.ok(createBody.Env.includes("APP_MESSAGE=Giữ nguyên"));
  assert.ok(createBody.Env.includes("DEMO_SECRET=fake"));
  assert.equal(createBody.Labels["io.mini-paas.environment-keys"], "APP_MESSAGE,DEMO_SECRET");
});

test("rollback từ chối khi tag image không còn khớp image ID của release", async () => {
  const docker = {
    image: async () => ({ Id: `sha256:${"3".repeat(64)}` }),
  };
  const runtime = new DeploymentRuntime(docker);
  await assert.rejects(runtime.rollback("app-a", {
    version: "v2.0.0",
    imageReference: "mini-paas/app-a:v2.0.0",
    imageId: `sha256:${"2".repeat(64)}`,
  }), { code: "release_image_changed", statusCode: 409 });
});
