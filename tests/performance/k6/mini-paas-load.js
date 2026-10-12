import http from "k6/http";
import { check } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://gateway:8080").replace(/\/$/, "");
const rate = Number.parseInt(__ENV.RATE || "10", 10);
const duration = __ENV.DURATION || "30s";
const preAllocatedVUs = Number.parseInt(__ENV.PRE_ALLOCATED_VUS || "20", 10);
const maxVUs = Number.parseInt(__ENV.MAX_VUS || "40", 10);
const level = __ENV.LEVEL || "custom";
const summaryPath = __ENV.SUMMARY_PATH || "/results/summary.json";

const applications = [
  { id: "app-a", path: "/apps/app-a/version" },
  { id: "app-b", path: "/apps/app-b/version" },
];

export const options = {
  discardResponseBodies: false,
  userAgent: "mini-paas-k6-t06/1.0",
  scenarios: {
    fixed_rate: {
      executor: "constant-arrival-rate",
      rate,
      timeUnit: "1s",
      duration,
      preAllocatedVUs,
      maxVUs,
      gracefulStop: "5s",
      tags: { load_level: level },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
    http_req_duration: ["p(95)<500"],
    "http_req_duration{app_id:app-a}": ["p(95)<500"],
    "http_req_duration{app_id:app-b}": ["p(95)<500"],
    dropped_iterations: ["count<1"],
  },
};

export default function () {
  const application = applications[__ITER % applications.length];
  const response = http.get(`${baseUrl}${application.path}`, {
    tags: {
      app_id: application.id,
      endpoint: "version",
      name: "GET /apps/:appId/version",
    },
    timeout: "3s",
  });

  let responseAppId = "";
  let responseVersion = "";
  try {
    responseAppId = response.json("appId");
    responseVersion = response.json("version");
  } catch {
    // Hai check nội dung bên dưới sẽ thất bại và giữ lại response trong dữ liệu k6.
  }

  check(response, {
    "HTTP trả 200": (result) => result.status === 200,
    "đúng ứng dụng đích": () => responseAppId === application.id,
    "có phiên bản": () => typeof responseVersion === "string" && responseVersion.length > 0,
  }, { app_id: application.id });
}

function metricValue(data, metricName, valueName) {
  return data.metrics[metricName]?.values?.[valueName] ?? 0;
}

export function handleSummary(data) {
  const requests = metricValue(data, "http_reqs", "count");
  const achievedRate = metricValue(data, "http_reqs", "rate");
  const p95 = metricValue(data, "http_req_duration", "p(95)");
  const errorRate = metricValue(data, "http_req_failed", "rate") * 100;
  const dropped = metricValue(data, "dropped_iterations", "count");

  const output = [
    "",
    `T06 ${level}: ${requests} request, ${achievedRate.toFixed(2)} req/s`,
    `p95=${p95.toFixed(2)} ms, lỗi=${errorRate.toFixed(3)}%, dropped=${dropped}`,
    `Summary JSON: ${summaryPath}`,
    "",
  ].join("\n");

  return {
    stdout: output,
    [summaryPath]: JSON.stringify(data, null, 2),
  };
}
