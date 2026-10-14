import fs from "node:fs";
import path from "node:path";

const outputDirectory = path.resolve(process.argv[2] ?? "");
if (!process.argv[2] || !fs.existsSync(outputDirectory)) {
  console.error("Cách dùng: node scripts/performance/summarize-k6.mjs <thư-mục-kết-quả>");
  process.exit(1);
}

const levelsPath = path.join(outputDirectory, "levels.tsv");
const lines = fs.readFileSync(levelsPath, "utf8").trim().split("\n");
const levelRows = lines.slice(1).map((line) => {
  const [level, targetRps, duration, startedAt, endedAt, status] = line.split("\t");
  return { level, targetRps: Number(targetRps), duration, startedAt, endedAt, status };
});

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(outputDirectory, fileName), "utf8"));
}

function metricValue(summary, metricName, valueName) {
  const value = summary.metrics?.[metricName]?.values?.[valueName];
  return Number.isFinite(value) ? value : null;
}

function thresholdResult(summary) {
  const results = Object.values(summary.metrics ?? {}).flatMap((metric) => Object.values(metric.thresholds ?? {}));
  return results.every((result) => result.ok !== false);
}

function valuesForApp(prometheusResponse, appId) {
  return (prometheusResponse.data?.result ?? [])
    .filter((series) => series.metric?.app_id === appId)
    .flatMap((series) => series.values ?? [])
    .map((sample) => Number(sample[1]))
    .filter(Number.isFinite);
}

function maximum(values, multiplier = 1) {
  return values.length > 0 ? Math.max(...values) * multiplier : null;
}

function average(values, multiplier = 1) {
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length * multiplier : null;
}

function round(value, digits = 2) {
  if (value === null) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

const results = levelRows.map((levelRow) => {
  const summary = readJson(`${levelRow.level}-summary.json`);
  const cpu = readJson(`${levelRow.level}-prometheus-cpu.json`);
  const memoryRatio = readJson(`${levelRow.level}-prometheus-memory-ratio.json`);
  const memoryBytes = readJson(`${levelRow.level}-prometheus-memory-bytes.json`);
  const health = readJson(`${levelRow.level}-prometheus-health.json`);

  const resources = {};
  for (const appId of ["app-a", "app-b"]) {
    const cpuValues = valuesForApp(cpu, appId);
    const memoryRatioValues = valuesForApp(memoryRatio, appId);
    const memoryByteValues = valuesForApp(memoryBytes, appId);
    const healthValues = valuesForApp(health, appId);
    resources[appId] = {
      cpuAveragePercent: round(average(cpuValues)),
      cpuMaxPercent: round(maximum(cpuValues)),
      memoryAverageMiB: round(average(memoryByteValues, 1 / 1024 / 1024)),
      memoryMaxMiB: round(maximum(memoryByteValues, 1 / 1024 / 1024)),
      memoryMaxPercent: round(maximum(memoryRatioValues, 100)),
      healthySamples: healthValues.filter((value) => value === 1).length,
      totalHealthSamples: healthValues.length,
    };
  }

  const observabilityPassed = Object.values(resources).every((resource) =>
    resource.cpuMaxPercent !== null
    && resource.memoryMaxMiB !== null
    && resource.memoryMaxPercent !== null
    && resource.totalHealthSamples > 0
    && resource.healthySamples === resource.totalHealthSamples
  );

  return {
    ...levelRow,
    requests: metricValue(summary, "http_reqs", "count"),
    achievedRps: round(metricValue(summary, "http_reqs", "rate")),
    p95Ms: round(metricValue(summary, "http_req_duration", "p(95)")),
    appAP95Ms: round(metricValue(summary, "http_req_duration{app_id:app-a}", "p(95)")),
    appBP95Ms: round(metricValue(summary, "http_req_duration{app_id:app-b}", "p(95)")),
    errorRatePercent: round((metricValue(summary, "http_req_failed", "rate") ?? 0) * 100, 4),
    checkRatePercent: round((metricValue(summary, "checks", "rate") ?? 0) * 100, 4),
    droppedIterations: metricValue(summary, "dropped_iterations", "count") ?? 0,
    thresholdsPassed: thresholdResult(summary),
    observabilityPassed,
    resources,
  };
});

const allPassed = results.every((result) => result.status === "passed" && result.thresholdsPassed && result.observabilityPassed);
const report = {
  generatedAt: new Date().toISOString(),
  environment: "development",
  acceptance: {
    p95MsLessThan: 500,
    errorRateLessThanPercent: 1,
    checkRateGreaterThanPercent: 99,
    droppedIterations: 0,
    allApplicationsHealthy: true,
  },
  allPassed,
  results,
};

fs.writeFileSync(path.join(outputDirectory, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);

const csvHeader = [
  "level", "target_rps", "duration", "requests", "achieved_rps", "p95_ms", "app_a_p95_ms", "app_b_p95_ms",
  "error_percent", "check_percent", "dropped", "thresholds_passed", "observability_passed", "app_a_cpu_max_percent", "app_b_cpu_max_percent",
  "app_a_ram_max_mib", "app_b_ram_max_mib", "app_a_ram_max_percent", "app_b_ram_max_percent",
];
const csvRows = results.map((result) => [
  result.level, result.targetRps, result.duration, result.requests, result.achievedRps, result.p95Ms, result.appAP95Ms, result.appBP95Ms,
  result.errorRatePercent, result.checkRatePercent, result.droppedIterations, result.thresholdsPassed,
  result.observabilityPassed,
  result.resources["app-a"].cpuMaxPercent, result.resources["app-b"].cpuMaxPercent,
  result.resources["app-a"].memoryMaxMiB, result.resources["app-b"].memoryMaxMiB,
  result.resources["app-a"].memoryMaxPercent, result.resources["app-b"].memoryMaxPercent,
]);
fs.writeFileSync(path.join(outputDirectory, "summary.csv"), `${[csvHeader, ...csvRows].map((row) => row.join(",")).join("\n")}\n`);

function display(value, suffix = "") {
  return value === null ? "—" : `${value}${suffix}`;
}

const markdown = [
  "# Tóm tắt kiểm thử tải T06",
  "",
  "| Mức | Mục tiêu | Thực tế | p95 | Lỗi | Dropped | CPU max A/B | RAM max A/B | Kết quả |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---|",
  ...results.map((result) => `| ${result.level} | ${result.targetRps} req/s | ${display(result.achievedRps, " req/s")} | ${display(result.p95Ms, " ms")} | ${display(result.errorRatePercent, "%")} | ${result.droppedIterations} | ${display(result.resources["app-a"].cpuMaxPercent, "%")} / ${display(result.resources["app-b"].cpuMaxPercent, "%")} | ${display(result.resources["app-a"].memoryMaxMiB, " MiB")} / ${display(result.resources["app-b"].memoryMaxMiB, " MiB")} | ${result.status === "passed" && result.thresholdsPassed && result.observabilityPassed ? "Đạt" : "Không đạt"} |`),
  "",
  `Kết luận tự động: **${allPassed ? "Đạt" : "Không đạt"}** theo ngưỡng của vòng chạy này.`,
  "",
  "> Kết quả chỉ có giá trị trong môi trường và điều kiện được ghi tại `environment.txt`; không dùng để suy rộng thành năng lực production.",
  "",
].join("\n");
fs.writeFileSync(path.join(outputDirectory, "summary.md"), markdown);

console.log(markdown);
if (!allPassed) process.exitCode = 1;
