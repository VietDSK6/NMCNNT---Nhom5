import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeDynamicDirectory } from "./summarize-dynamic.mjs";

const K6_IMAGE =
  process.env.K6_IMAGE ??
  "grafana/k6:2.3.0@sha256:9c2dee7f8ed74d317e4027c06a10f169b625638189de8d4555d0b3486a5aeb34";
const K6_NETWORK = process.env.K6_NETWORK ?? "mini-paas-edge";
const K6_BASE_URL = (process.env.K6_BASE_URL ?? "http://gateway:8080").replace(/\/$/, "");

const PROFILES = {
  quick: {
    warmupDuration: "3s",
    pauseMs: 3_000,
    levels: [
      { level: "low", rate: 10, duration: "10s", preVUs: 20, maxVUs: 40 },
      { level: "medium", rate: 25, duration: "10s", preVUs: 40, maxVUs: 80 },
      { level: "high", rate: 50, duration: "10s", preVUs: 80, maxVUs: 160 },
    ],
  },
  pilot: {
    warmupDuration: "5s",
    pauseMs: 5_000,
    levels: [
      { level: "low", rate: 5, duration: "20s", preVUs: 10, maxVUs: 20 },
      { level: "medium", rate: 15, duration: "20s", preVUs: 20, maxVUs: 40 },
      { level: "high", rate: 30, duration: "20s", preVUs: 40, maxVUs: 80 },
    ],
  },
  standard: {
    warmupDuration: "10s",
    pauseMs: 5_000,
    levels: [
      { level: "low", rate: 10, duration: "60s", preVUs: 20, maxVUs: 40 },
      { level: "medium", rate: 25, duration: "60s", preVUs: 40, maxVUs: 80 },
      { level: "high", rate: 50, duration: "60s", preVUs: 80, maxVUs: 160 },
    ],
  },
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

function parseEnvFile(envPath) {
  const result = {};
  if (!fs.existsSync(envPath)) return result;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchPrometheusJson(apiPath) {
  const url = `http://127.0.0.1:9090${apiPath}`;
  const raw = execFileSync(
    "docker",
    ["compose", "exec", "-T", "prometheus", "wget", "-q", "-O", "-", url],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  const parsed = JSON.parse(raw);
  if (parsed.status !== "success") {
    throw new Error(`Prometheus trả trạng thái lỗi tại ${apiPath}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

function discoverRunningApps() {
  const body = fetchPrometheusJson(`/api/v1/query?query=${encodeURIComponent("mini_paas_app_running")}`);
  const rows = (body.data?.result ?? [])
    .map((item) => ({
      appId: item.metric?.app_id,
      running: Number(item.value?.[1]),
    }))
    .filter((item) => typeof item.appId === "string" && item.appId.length > 0);

  const explicit = (process.env.TARGET_APPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (explicit.length > 0) {
    const runningSet = new Set(rows.filter((r) => r.running === 1).map((r) => r.appId));
    for (const appId of explicit) {
      if (!runningSet.has(appId)) {
        throw new Error(`Ứng dụng "${appId}" trong TARGET_APPS chưa ở trạng thái running=1 trên Prometheus.`);
      }
    }
    return explicit;
  }

  const runningApps = rows
    .filter((item) => item.running === 1)
    .map((item) => item.appId);

  const core = ["app-a", "app-b"].filter((id) => runningApps.includes(id));
  const extra = runningApps.filter((id) => !["app-a", "app-b"].includes(id)).sort();
  const ordered = [...core, ...extra];

  if (ordered.length === 0) {
    throw new Error("Không phát hiện ứng dụng nào đang running=1 trên Prometheus.");
  }
  return ordered;
}

function probeHttp(urlString, hostHeader) {
  return new Promise((resolve) => {
    const parsed = new URL(urlString);
    const headers = hostHeader ? { Host: hostHeader } : {};
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers,
        timeout: 3_000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const contentType = String(res.headers["content-type"] ?? "").toLowerCase();
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            json = null;
          }
          const isHtml = contentType.includes("text/html") || /^\s*<!doctype\s+html/i.test(text);
          const isJson = contentType.includes("application/json") || json !== null;
          resolve({ ok: res.statusCode === 200, status: res.statusCode ?? null, json, isHtml, isJson });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: null, json: null, isHtml: false, isJson: false });
    });
    req.on("error", () => {
      resolve({ ok: false, status: null, json: null, isHtml: false, isJson: false });
    });
    req.end();
  });
}

function getAppHealthTypes() {
  const body = fetchPrometheusJson(`/api/v1/query?query=${encodeURIComponent("mini_paas_app_info")}`);
  const map = new Map();
  for (const item of body.data?.result ?? []) {
    const appId = item.metric?.app_id;
    if (typeof appId === "string" && appId.length > 0) {
      map.set(appId, item.metric?.health ?? "unknown");
    }
  }
  return map;
}

async function resolveTargetRoutes(appIds, gatewayPort, serviceBaseDomain) {
  const localGateway = `http://127.0.0.1:${gatewayPort}`;
  const healthTypes = getAppHealthTypes();
  const targets = [];

  for (const appId of appIds) {
    const isCoreApp = appId === "app-a" || appId === "app-b";
    const pathCandidates = [
      {
        endpoint: "version",
        localUrl: `${localGateway}/apps/${appId}/version`,
        internalUrl: `${K6_BASE_URL}/apps/${appId}/version`,
        host: null,
        routeLabel: `/apps/${appId}/version`,
        requireJson: !isCoreApp,
      },
      {
        endpoint: "health",
        localUrl: `${localGateway}/apps/${appId}/health`,
        internalUrl: `${K6_BASE_URL}/apps/${appId}/health`,
        host: null,
        routeLabel: `/apps/${appId}/health`,
        requireJson: !isCoreApp,
      },
    ];

    const hostDomains = serviceBaseDomain === "localhost" ? ["localhost"] : [serviceBaseDomain, "localhost"];
    const subdomainCandidates = hostDomains.flatMap((domain) => [
      {
        endpoint: "version",
        localUrl: `${localGateway}/version`,
        internalUrl: `${K6_BASE_URL}/version`,
        host: `${appId}.${domain}`,
        routeLabel: `${appId}.${domain}/version`,
        requireJson: false,
      },
      {
        endpoint: "health",
        localUrl: `${localGateway}/health`,
        internalUrl: `${K6_BASE_URL}/health`,
        host: `${appId}.${domain}`,
        routeLabel: `${appId}.${domain}/health`,
        requireJson: false,
      },
    ]);

    const candidates = isCoreApp
      ? [...pathCandidates, ...subdomainCandidates]
      : [...subdomainCandidates, ...pathCandidates];

    let matched = null;
    for (const candidate of candidates) {
      const probe = await probeHttp(candidate.localUrl, candidate.host);
      if (!probe.ok) continue;
      if (candidate.requireJson && (!probe.isJson || probe.isHtml)) continue;
      if (candidate.host && probe.isHtml) continue;
      matched = {
        id: appId,
        url: candidate.internalUrl,
        host: candidate.host,
        endpoint: candidate.endpoint,
        routeLabel: candidate.routeLabel,
        hasDockerHealthcheck: (healthTypes.get(appId) ?? "unknown") !== "unknown",
        expectAppId: probe.json?.appId === appId,
        expectVersion: typeof probe.json?.version === "string" && probe.json.version.length > 0,
      };
      break;
    }

    if (!matched) {
      throw new Error(
        `Không tìm thấy route HTTP 200 qua Gateway cho "${appId}" (/apps/${appId}/* hoặc Host ${appId}.${serviceBaseDomain}).`,
      );
    }
    targets.push(matched);
  }

  return targets;
}

function ensureDockerReady() {
  try {
    execFileSync("docker", ["image", "inspect", K6_IMAGE], { cwd: REPO_ROOT, stdio: "ignore" });
  } catch {
    console.log(`Đang tải image ${K6_IMAGE}...`);
    execFileSync("docker", ["pull", K6_IMAGE], { cwd: REPO_ROOT, stdio: "inherit" });
  }
  execFileSync("docker", ["network", "inspect", K6_NETWORK], { cwd: REPO_ROOT, stdio: "ignore" });
}

function runK6Container({ targets, level, rate, duration, preVUs, maxVUs, outputDir, summaryFileName, rawFileName }) {
  const userArgs =
    typeof process.getuid === "function" && typeof process.getgid === "function"
      ? ["--user", `${process.getuid()}:${process.getgid()}`]
      : [];

  const dockerArgs = [
    "run",
    "--rm",
    ...userArgs,
    "--network",
    K6_NETWORK,
    "--env",
    `TARGETS_JSON=${JSON.stringify(targets)}`,
    "--env",
    `LEVEL=${level}`,
    "--env",
    `RATE=${rate}`,
    "--env",
    `DURATION=${duration}`,
    "--env",
    `PRE_ALLOCATED_VUS=${preVUs}`,
    "--env",
    `MAX_VUS=${maxVUs}`,
    "--env",
    `SUMMARY_PATH=/results/${summaryFileName}`,
    "--env",
    "K6_NO_COLOR=true",
    "--volume",
    `${__dirname}:/scripts:ro`,
    "--volume",
    `${outputDir}:/results`,
    K6_IMAGE,
    "run",
  ];

  if (rawFileName) {
    dockerArgs.push("--out", `json=/results/${rawFileName}`);
  }
  dockerArgs.push("/scripts/dynamic-load.js");

  const logPath = path.join(outputDir, `${level}-k6.txt`);
  try {
    const output = execFileSync("docker", dockerArgs, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    fs.writeFileSync(logPath, output, "utf8");
    console.log(output.trim());
    return true;
  } catch (error) {
    const combined = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
    fs.writeFileSync(logPath, combined, "utf8");
    console.error(combined.trim());
    return false;
  }
}

function collectPrometheusWindow(outputDir, level, metricName, promQuery, startEpoch, endEpoch) {
  const apiPath =
    `/api/v1/query_range?query=${encodeURIComponent(promQuery)}` +
    `&start=${startEpoch}&end=${endEpoch}&step=5`;
  const payload = fetchPrometheusJson(apiPath);
  fs.writeFileSync(
    path.join(outputDir, `${level}-prometheus-${metricName}.json`),
    `${JSON.stringify(payload)}\n`,
    "utf8",
  );
}

function formatTimestampFolder() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function main() {
  const profileName = process.argv[2] ?? "pilot";
  const profile = PROFILES[profileName];
  if (!profile) {
    console.error(`Profile không hợp lệ: "${profileName}". Chọn một trong: ${Object.keys(PROFILES).join(", ")}`);
    process.exit(2);
  }

  const dotenv = parseEnvFile(path.join(REPO_ROOT, ".env"));
  const gatewayPort = process.env.GATEWAY_PORT ?? dotenv.GATEWAY_PORT ?? "8080";
  const serviceBaseDomain = process.env.SERVICE_BASE_DOMAIN ?? dotenv.SERVICE_BASE_DOMAIN ?? "localhost";

  ensureDockerReady();
  const appIds = discoverRunningApps();
  console.log(`=== PHÁT HIỆN ${appIds.length} ỨNG DỤNG ĐANG CHẠY: ${appIds.join(", ")} ===`);

  const targets = await resolveTargetRoutes(appIds, gatewayPort, serviceBaseDomain);
  for (const target of targets) {
    console.log(
      `  • ${target.id} -> ${target.routeLabel} (expectAppId=${target.expectAppId}, expectVersion=${target.expectVersion})`,
    );
  }

  const outputDir = path.resolve(
    process.env.DYNAMIC_LOAD_OUTPUT_DIR ??
      path.join(REPO_ROOT, "output", "performance-dynamic", `${formatTimestampFolder()}-${profileName}`),
  );
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "targets.json"), `${JSON.stringify(targets, null, 2)}\n`, "utf8");

  const appRegex = appIds.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const levelsTsv = ["level\ttarget_rps\tduration\tstarted_at\tended_at\tstatus"];

  console.log(`\nWarm-up: 5 req/s trong ${profile.warmupDuration}...`);
  const warmupOk = runK6Container({
    targets,
    level: "warmup",
    rate: 5,
    duration: profile.warmupDuration,
    preVUs: 10,
    maxVUs: 20,
    outputDir,
    summaryFileName: "warmup-summary.json",
  });
  if (!warmupOk) {
    throw new Error("Warm-up không đạt ngưỡng; dừng trước khi đo chính thức.");
  }

  for (const spec of profile.levels) {
    await sleep(profile.pauseMs);
    const startedEpoch = Math.floor(Date.now() / 1_000);
    const startedIso = new Date(startedEpoch * 1_000).toISOString();
    console.log(`\nChạy mức ${spec.level}: ${spec.rate} req/s trong ${spec.duration} (chia đều cho ${targets.length} app)...`);

    const passed = runK6Container({
      targets,
      level: spec.level,
      rate: spec.rate,
      duration: spec.duration,
      preVUs: spec.preVUs,
      maxVUs: spec.maxVUs,
      outputDir,
      summaryFileName: `${spec.level}-summary.json`,
      rawFileName: `${spec.level}-raw.json`,
    });

    const endedEpoch = Math.floor(Date.now() / 1_000);
    const endedIso = new Date(endedEpoch * 1_000).toISOString();
    levelsTsv.push(
      `${spec.level}\t${spec.rate}\t${spec.duration}\t${startedIso}\t${endedIso}\t${passed ? "passed" : "failed"}`,
    );

    await sleep(6_000);
    const metricStart = startedEpoch - 5;
    const metricEnd = endedEpoch + 5;
    collectPrometheusWindow(outputDir, spec.level, "cpu", `mini_paas_app_cpu_percent{app_id=~"${appRegex}"}`, metricStart, metricEnd);
    collectPrometheusWindow(outputDir, spec.level, "memory-ratio", `mini_paas_app_memory_usage_ratio{app_id=~"${appRegex}"}`, metricStart, metricEnd);
    collectPrometheusWindow(outputDir, spec.level, "memory-bytes", `mini_paas_app_memory_working_set_bytes{app_id=~"${appRegex}"}`, metricStart, metricEnd);
    collectPrometheusWindow(outputDir, spec.level, "health", `mini_paas_app_healthy{app_id=~"${appRegex}"}`, metricStart, metricEnd);
  }

  fs.writeFileSync(path.join(outputDir, "levels.tsv"), `${levelsTsv.join("\n")}\n`, "utf8");
  const { report, markdown } = summarizeDynamicDirectory(outputDir);
  console.log(`\n=== KẾT QUẢ TỔNG HỢP (${outputDir}) ===\n`);
  console.log(markdown);

  if (!report.allPassed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`LỖI: ${error.message}`);
  process.exit(1);
});
