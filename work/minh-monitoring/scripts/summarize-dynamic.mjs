import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function metricValue(summary, metricName, valueName) {
  const value = summary.metrics?.[metricName]?.values?.[valueName];
  return Number.isFinite(value) ? value : null;
}

function thresholdResult(summary) {
  const results = Object.values(summary.metrics ?? {}).flatMap((metric) =>
    Object.values(metric.thresholds ?? {}),
  );
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
  return values.length > 0
    ? (values.reduce((total, value) => total + value, 0) / values.length) * multiplier
    : null;
}

function round(value, digits = 2) {
  if (value === null || value === undefined) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function display(value, suffix = "") {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

/**
 * Tổng hợp kết quả k6 và Prometheus cho danh sách ứng dụng động (2, 3 hoặc N app).
 */
export function summarizeDynamicDirectory(outputDirectory) {
  const resolvedDir = path.resolve(outputDirectory);
  const targets = readJson(path.join(resolvedDir, "targets.json"));
  const levelsLines = fs
    .readFileSync(path.join(resolvedDir, "levels.tsv"), "utf8")
    .trim()
    .split("\n");

  const levelRows = levelsLines.slice(1).map((line) => {
    const [level, targetRps, duration, startedAt, endedAt, status] = line.split("\t");
    return { level, targetRps: Number(targetRps), duration, startedAt, endedAt, status };
  });

  const results = levelRows.map((levelRow) => {
    const summary = readJson(path.join(resolvedDir, `${levelRow.level}-summary.json`));
    const cpu = readJson(path.join(resolvedDir, `${levelRow.level}-prometheus-cpu.json`));
    const memoryRatio = readJson(
      path.join(resolvedDir, `${levelRow.level}-prometheus-memory-ratio.json`),
    );
    const memoryBytes = readJson(
      path.join(resolvedDir, `${levelRow.level}-prometheus-memory-bytes.json`),
    );
    const health = readJson(path.join(resolvedDir, `${levelRow.level}-prometheus-health.json`));

    const apps = {};
    for (const target of targets) {
      const appId = target.id;
      const cpuValues = valuesForApp(cpu, appId);
      const memoryRatioValues = valuesForApp(memoryRatio, appId);
      const memoryByteValues = valuesForApp(memoryBytes, appId);
      const healthValues = valuesForApp(health, appId);

      apps[appId] = {
        routeLabel: target.routeLabel,
        hasDockerHealthcheck: target.hasDockerHealthcheck !== false,
        p95Ms: round(metricValue(summary, `http_req_duration{app_id:${appId}}`, "p(95)")),
        requests: metricValue(summary, `http_reqs{app_id:${appId}}`, "count"),
        cpuAveragePercent: round(average(cpuValues)),
        cpuMaxPercent: round(maximum(cpuValues)),
        memoryAverageMiB: round(average(memoryByteValues, 1 / 1024 / 1024)),
        memoryMaxMiB: round(maximum(memoryByteValues, 1 / 1024 / 1024)),
        memoryMaxPercent: round(maximum(memoryRatioValues, 100)),
        healthySamples: healthValues.filter((value) => value === 1).length,
        totalHealthSamples: healthValues.length,
      };
    }

    const observabilityPassed = Object.values(apps).every(
      (resource) =>
        resource.cpuMaxPercent !== null &&
        resource.memoryMaxMiB !== null &&
        resource.memoryMaxPercent !== null &&
        resource.totalHealthSamples > 0 &&
        (!resource.hasDockerHealthcheck || resource.healthySamples === resource.totalHealthSamples),
    );

    return {
      ...levelRow,
      requests: metricValue(summary, "http_reqs", "count"),
      achievedRps: round(metricValue(summary, "http_reqs", "rate")),
      p95Ms: round(metricValue(summary, "http_req_duration", "p(95)")),
      errorRatePercent: round((metricValue(summary, "http_req_failed", "rate") ?? 0) * 100, 4),
      checkRatePercent: round((metricValue(summary, "checks", "rate") ?? 0) * 100, 4),
      droppedIterations: metricValue(summary, "dropped_iterations", "count") ?? 0,
      thresholdsPassed: thresholdResult(summary),
      observabilityPassed,
      apps,
    };
  });

  const allPassed = results.every(
    (result) => result.status === "passed" && result.thresholdsPassed && result.observabilityPassed,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    targetApps: targets.map((t) => ({ id: t.id, route: t.routeLabel })),
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

  fs.writeFileSync(
    path.join(resolvedDir, "summary.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  const csvHeader = [
    "level",
    "target_rps",
    "duration",
    "app_id",
    "route",
    "total_requests",
    "achieved_rps",
    "overall_p95_ms",
    "app_p95_ms",
    "error_percent",
    "check_percent",
    "dropped",
    "cpu_max_percent",
    "ram_max_mib",
    "ram_max_percent",
    "healthy_samples",
    "total_health_samples",
    "thresholds_passed",
    "observability_passed",
  ];
  const csvRows = [];
  for (const result of results) {
    for (const target of targets) {
      const app = result.apps[target.id];
      csvRows.push([
        result.level,
        result.targetRps,
        result.duration,
        target.id,
        app.routeLabel,
        result.requests,
        result.achievedRps,
        result.p95Ms,
        app.p95Ms,
        result.errorRatePercent,
        result.checkRatePercent,
        result.droppedIterations,
        app.cpuMaxPercent,
        app.memoryMaxMiB,
        app.memoryMaxPercent,
        app.healthySamples,
        app.totalHealthSamples,
        result.thresholdsPassed,
        result.observabilityPassed,
      ]);
    }
  }
  fs.writeFileSync(
    path.join(resolvedDir, "summary.csv"),
    `${[csvHeader, ...csvRows].map((row) => row.join(",")).join("\n")}\n`,
  );

  const markdown = [
    `# Tóm tắt kiểm thử tải đa ứng dụng (${targets.map((t) => t.id).join(", ")})`,
    "",
    "## 1. Tổng quan theo mức tải",
    "",
    "| Mức | Mục tiêu | Thực tế | Tổng Request | p95 chung | Lỗi | Dropped | Kết quả |",
    "|---|---:|---:|---:|---:|---:|---:|---|",
    ...results.map(
      (result) =>
        `| ${result.level} | ${result.targetRps} req/s | ${display(result.achievedRps, " req/s")} | ${display(result.requests)} | ${display(result.p95Ms, " ms")} | ${display(result.errorRatePercent, "%")} | ${result.droppedIterations} | ${result.status === "passed" && result.thresholdsPassed && result.observabilityPassed ? "Đạt" : "Không đạt"} |`,
    ),
    "",
    "## 2. Chi tiết từng ứng dụng",
    "",
    "| Mức | Ứng dụng | Tuyến kiểm thử | p95 riêng | CPU max | RAM max | RAM % / 128 MiB | Health mẫu |",
    "|---|---|---|---:|---:|---:|---:|---:|",
    ...results.flatMap((result) =>
      targets.map((target) => {
        const app = result.apps[target.id];
        const healthCell = app.hasDockerHealthcheck
          ? `${app.healthySamples}/${app.totalHealthSamples}`
          : "N/A (no HEALTHCHECK)";
        return `| ${result.level} | ${target.id} | \`${app.routeLabel}\` | ${display(app.p95Ms, " ms")} | ${display(app.cpuMaxPercent, "%")} | ${display(app.memoryMaxMiB, " MiB")} | ${display(app.memoryMaxPercent, "%")} | ${healthCell} |`;
      }),
    ),
    "",
    `Kết luận tự động: **${allPassed ? "Đạt" : "Không đạt"}** cho toàn bộ ${targets.length} ứng dụng (${targets.map((t) => t.id).join(", ")}).`,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(resolvedDir, "summary.md"), markdown);
  return { report, markdown };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const dirArg = process.argv[2];
  if (!dirArg || !fs.existsSync(path.resolve(dirArg))) {
    console.error("Cách dùng: node work/minh-monitoring/scripts/summarize-dynamic.mjs <thư-mục-kết-quả>");
    process.exit(1);
  }
  const { report, markdown } = summarizeDynamicDirectory(dirArg);
  console.log(markdown);
  if (!report.allPassed) process.exitCode = 1;
}
