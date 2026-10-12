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
