import assert from "node:assert/strict";
import { test } from "node:test";
import { renderPrometheusMetrics } from "./metrics.mjs";

test("xuất metric Prometheus hữu hạn cho ứng dụng đang chạy", () => {
  const output = renderPrometheusMetrics([{
    appId: "app-a",
    running: true,
    healthy: true,
    scrapeSuccess: true,
    containerId: "abc123",
    version: "v1.0.0",
    status: "running",
    health: "healthy",
    stats: {
      cpuPercent: 2.5,
      memoryWorkingSetBytes: 10_000,
      memoryLimitBytes: 20_000,
      memoryPercent: 50,
      pids: 7,
      networkRxBytes: 120,
      networkTxBytes: 80,
    },
  }], new Date("2026-10-12T00:00:00.000Z"));

  assert.match(output, /mini_paas_app_running\{app_id="app-a"\} 1/);
  assert.match(output, /mini_paas_app_info\{app_id="app-a",container_id="abc123",version="v1.0.0",status="running",health="healthy"\} 1/);
  assert.match(output, /mini_paas_app_memory_usage_ratio\{app_id="app-a"\} 0\.5/);
  assert.doesNotMatch(output, /NaN|Infinity/);
});

test("ứng dụng dừng vẫn có trạng thái nhưng không tạo metric tài nguyên giả", () => {
  const output = renderPrometheusMetrics([{
    appId: "app-b",
    running: false,
    healthy: false,
    scrapeSuccess: true,
    containerId: "def456",
    version: "v1.0.0",
    status: "stopped",
    health: "unknown",
    stats: null,
  }]);

  assert.match(output, /mini_paas_app_running\{app_id="app-b"\} 0/);
  assert.match(output, /mini_paas_app_scrape_success\{app_id="app-b"\} 1/);
  assert.doesNotMatch(output, /mini_paas_app_cpu_percent\{app_id="app-b"\}/);
});

test("escape nhãn và thay giá trị không hữu hạn bằng 0", () => {
  const output = renderPrometheusMetrics([{
    appId: 'app-"x\\y',
    running: true,
    healthy: false,
    scrapeSuccess: true,
    containerId: "id",
    version: "v1\nnext",
    status: "running",
    health: "unhealthy",
    stats: {
      cpuPercent: Number.NaN,
      memoryWorkingSetBytes: Number.POSITIVE_INFINITY,
      memoryLimitBytes: 1,
      memoryPercent: 0,
      pids: 1,
      networkRxBytes: 0,
      networkTxBytes: 0,
    },
  }]);

  assert.match(output, /app_id="app-\\"x\\\\y"/);
  assert.match(output, /version="v1\\nnext"/);
  assert.doesNotMatch(output, /NaN|Infinity/);
});
