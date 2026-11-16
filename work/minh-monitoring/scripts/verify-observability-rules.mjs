import { execFileSync } from "node:child_process";

const EXPECTED_RULES = new Map([
  ["MiniPaasApplicationNotHealthy", { duration: 30 }],
  ["MiniPaasApplicationMemoryHigh", { duration: 120 }],
  ["MiniPaasRunnerScrapeFailed", { duration: 30 }],
]);

const METRIC_QUERIES = [
  { key: "running", query: "mini_paas_app_running", label: "Đang chạy (0/1)" },
  { key: "healthy", query: "mini_paas_app_healthy", label: "Healthy (0/1)" },
  { key: "scrape", query: "mini_paas_app_scrape_success", label: "Scrape OK (0/1)" },
  { key: "cpu", query: "mini_paas_app_cpu_percent", label: "CPU (%)" },
  { key: "ramBytes", query: "mini_paas_app_memory_working_set_bytes", label: "RAM (MiB)" },
  { key: "ramRatio", query: "mini_paas_app_memory_usage_ratio", label: "RAM / Limit (%)" },
  { key: "pids", query: "mini_paas_app_pids", label: "PIDs" },
  { key: "netRx", query: "mini_paas_app_network_receive_bytes_total", label: "Net RX (KiB)" },
  { key: "netTx", query: "mini_paas_app_network_transmit_bytes_total", label: "Net TX (KiB)" },
];

/**
 * Truy vấn HTTP API nội bộ của container Prometheus thông qua docker compose exec.
 */
function fetchPrometheusJson(apiPath) {
  const url = `http://127.0.0.1:9090${apiPath}`;
  const raw = execFileSync(
    "docker",
    ["compose", "exec", "-T", "prometheus", "wget", "-q", "-O", "-", url],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(raw);
  if (parsed.status !== "success") {
    throw new Error(`Prometheus trả trạng thái lỗi tại ${apiPath}: ${JSON.stringify(parsed)}`);
  }
  return parsed.data;
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`KHÔNG ĐẠT: ${message}`);
  }
  console.log(`ĐẠT: ${message}`);
}

function verifyTargetUp() {
  const data = fetchPrometheusJson("/api/v1/targets");
  const target = (data.activeTargets ?? []).find((item) => item.labels?.job === "mini-paas-runner");
  assertCondition(
    Boolean(target) && target.health === "up" && String(target.scrapeUrl).endsWith("runner:3001/metrics"),
    `Target mini-paas-runner đang UP (${target?.scrapeUrl ?? "không thấy"}, scrapeInterval=${target?.scrapeInterval ?? "?"})`,
  );
}

function verifyAlertRules() {
  const rulesData = fetchPrometheusJson("/api/v1/rules");
  const allRules = (rulesData.groups ?? []).flatMap((group) => group.rules ?? []);

  for (const [ruleName, expected] of EXPECTED_RULES.entries()) {
    const rule = allRules.find((item) => item.name === ruleName);
    assertCondition(Boolean(rule), `Đã nạp rule cảnh báo ${ruleName}`);
    assertCondition(
      rule.health === "ok" && rule.duration === expected.duration,
      `Rule ${ruleName}: health=${rule.health}, for=${rule.duration}s, state=${rule.state}`,
    );
    assertCondition(
      rule.state === "inactive",
      `Rule ${ruleName} đang ở trạng thái bình thường (inactive)`,
    );
  }

  const alertsData = fetchPrometheusJson("/api/v1/alerts");
  const activeAlerts = alertsData.alerts ?? [];
  assertCondition(
    activeAlerts.length === 0,
    `Không có cảnh báo đang pending/firing ở trạng thái nền (activeAlerts=${activeAlerts.length})`,
  );
}

function verifyCoreMetrics() {
  const snapshot = { "app-a": {}, "app-b": {} };

  for (const metric of METRIC_QUERIES) {
    const data = fetchPrometheusJson(`/api/v1/query?query=${encodeURIComponent(metric.query)}`);
    const results = (data.result ?? []).filter((item) => ["app-a", "app-b"].includes(item.metric?.app_id));
    assertCondition(results.length === 2, `Metric ${metric.query} có đủ dữ liệu cho app-a và app-b`);

    for (const item of results) {
      const appId = item.metric.app_id;
      const numericValue = Number(item.value?.[1]);
      assertCondition(
        Number.isFinite(numericValue) && numericValue >= 0,
        `${metric.query}{app_id="${appId}"} = ${numericValue} (hữu hạn, không âm)`,
      );
      snapshot[appId][metric.key] = numericValue;
    }
  }

  console.log("\n=== BẢNG METRIC THỰC TẾ TỪ PROMETHEUS ===");
  for (const appId of ["app-a", "app-b"]) {
    const row = snapshot[appId];
    console.log(
      `${appId}: running=${row.running}, healthy=${row.healthy}, cpu=${row.cpu.toFixed(2)}%, `
      + `ram=${(row.ramBytes / 1024 / 1024).toFixed(2)} MiB (${(row.ramRatio * 100).toFixed(2)}%), `
      + `pids=${row.pids}, rx=${(row.netRx / 1024).toFixed(2)} KiB, tx=${(row.netTx / 1024).toFixed(2)} KiB`,
    );
  }
}

function main() {
  verifyTargetUp();
  verifyAlertRules();
  verifyCoreMetrics();
  console.log("\nHOÀN TẤT OBS-02: Toàn bộ target, 3 alert rule và 9 nhóm metric Prometheus đều hợp lệ.");
}

main();
