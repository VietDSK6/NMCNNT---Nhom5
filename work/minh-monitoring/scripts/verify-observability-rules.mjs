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

function verifyAlertRules(appsWithoutHealthcheck) {
  const rulesData = fetchPrometheusJson("/api/v1/rules");
  const allRules = (rulesData.groups ?? []).flatMap((group) => group.rules ?? []);
  const alertsData = fetchPrometheusJson("/api/v1/alerts");
  const activeAlerts = alertsData.alerts ?? [];

  for (const [ruleName, expected] of EXPECTED_RULES.entries()) {
    const rule = allRules.find((item) => item.name === ruleName);
    assertCondition(Boolean(rule), `Đã nạp rule cảnh báo ${ruleName}`);
    assertCondition(
      rule.health === "ok" && rule.duration === expected.duration,
      `Rule ${ruleName}: health=${rule.health}, for=${rule.duration}s, state=${rule.state}`,
    );

    const blockingAlerts = (rule.alerts ?? []).filter((alert) => {
      const appId = alert.labels?.app_id;
      return !(ruleName === "MiniPaasApplicationNotHealthy" && appsWithoutHealthcheck.has(appId));
    });
    assertCondition(
      blockingAlerts.length === 0,
      `Rule ${ruleName} không có cảnh báo đang pending/firing trên các app có HEALTHCHECK (state=${rule.state})`,
    );
  }

  const unexpectedActive = activeAlerts.filter((alert) => {
    const ruleName = alert.labels?.alertname;
    const appId = alert.labels?.app_id;
    return !(ruleName === "MiniPaasApplicationNotHealthy" && appsWithoutHealthcheck.has(appId));
  });
  assertCondition(
    unexpectedActive.length === 0,
    `Không có cảnh báo bất thường ở trạng thái nền (unexpectedAlerts=${unexpectedActive.length}, totalActive=${activeAlerts.length})`,
  );
}

const BASELINE_APPS = ["app-a", "app-b"];

function getAppsWithoutHealthcheck() {
  const infoData = fetchPrometheusJson(`/api/v1/query?query=${encodeURIComponent("mini_paas_app_info")}`);
  const missing = new Set();
  for (const item of infoData.result ?? []) {
    const appId = item.metric?.app_id;
    const health = item.metric?.health;
    if (typeof appId === "string" && !BASELINE_APPS.includes(appId) && health === "unknown") {
      missing.add(appId);
    }
  }
  return missing;
}

function resolveExpectedApps() {
  const runningData = fetchPrometheusJson(`/api/v1/query?query=${encodeURIComponent("mini_paas_app_running")}`);
  const discovered = (runningData.result ?? [])
    .map((item) => ({
      appId: item.metric?.app_id,
      running: Number(item.value?.[1]),
    }))
    .filter((item) => typeof item.appId === "string" && item.appId.length > 0);

  const runningByApp = new Map(discovered.map((item) => [item.appId, item.running]));
  const explicit = (process.env.TARGET_APPS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (explicit.length > 0) {
    for (const appId of explicit) {
      assertCondition(
        runningByApp.get(appId) === 1,
        `Ứng dụng chỉ định ${appId} đang ở trạng thái chạy (running=1)`,
      );
    }
    return { activeApps: explicit, stoppedApps: [] };
  }

  for (const coreApp of BASELINE_APPS) {
    assertCondition(
      runningByApp.get(coreApp) === 1,
      `Ứng dụng nền ${coreApp} đang có dữ liệu và ở trạng thái chạy (running=1)`,
    );
  }

  const extraActive = discovered
    .filter((item) => !BASELINE_APPS.includes(item.appId) && item.running === 1)
    .map((item) => item.appId)
    .sort();
  const stoppedApps = discovered
    .filter((item) => !BASELINE_APPS.includes(item.appId) && item.running !== 1)
    .map((item) => item.appId)
    .sort();

  const activeApps = [...BASELINE_APPS, ...extraActive];
  console.log(`THÔNG TIN: Phát hiện ${activeApps.length} ứng dụng đang chạy: ${activeApps.join(", ")}`);
  if (stoppedApps.length > 0) {
    console.log(`THÔNG TIN: Bỏ qua metric tài nguyên cho ${stoppedApps.length} ứng dụng đang dừng: ${stoppedApps.join(", ")}`);
  }

  return { activeApps, stoppedApps };
}

function verifyCoreMetrics() {
  const { activeApps } = resolveExpectedApps();
  const activeSet = new Set(activeApps);
  const snapshot = Object.fromEntries(activeApps.map((appId) => [appId, {}]));

  for (const metric of METRIC_QUERIES) {
    const data = fetchPrometheusJson(`/api/v1/query?query=${encodeURIComponent(metric.query)}`);
    const results = (data.result ?? []).filter((item) => activeSet.has(item.metric?.app_id));
    assertCondition(
      results.length === activeApps.length,
      `Metric ${metric.query} có đủ dữ liệu cho ${activeApps.length} ứng dụng (${activeApps.join(", ")})`,
    );

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
  for (const appId of activeApps) {
    const row = snapshot[appId];
    console.log(
      `${appId}: running=${row.running}, healthy=${row.healthy}, cpu=${row.cpu.toFixed(2)}%, `
      + `ram=${(row.ramBytes / 1024 / 1024).toFixed(2)} MiB (${(row.ramRatio * 100).toFixed(2)}%), `
      + `pids=${row.pids}, rx=${(row.netRx / 1024).toFixed(2)} KiB, tx=${(row.netTx / 1024).toFixed(2)} KiB`,
    );
  }
  return activeApps;
}

function main() {
  verifyTargetUp();
  const appsWithoutHealthcheck = getAppsWithoutHealthcheck();
  if (appsWithoutHealthcheck.size > 0) {
    console.log(
      `CẢNH BÁO: Các Web Service sau chưa có Docker HEALTHCHECK nên mini_paas_app_healthy=0: ${[...appsWithoutHealthcheck].join(", ")}`,
    );
  }
  verifyAlertRules(appsWithoutHealthcheck);
  const verifiedApps = verifyCoreMetrics();
  console.log(`\nHOÀN TẤT OBS-02: Target, 3 alert rule và 9 nhóm metric cho ${verifiedApps.length} ứng dụng (${verifiedApps.join(", ")}) đều hợp lệ.`);
}

main();
