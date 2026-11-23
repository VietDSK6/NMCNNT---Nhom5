import http from "k6/http";
import { check } from "k6";

const targets = JSON.parse(__ENV.TARGETS_JSON || "[]");
if (!Array.isArray(targets) || targets.length === 0) {
  throw new Error("TARGETS_JSON phải là mảng JSON chứa ít nhất 1 ứng dụng đích.");
}

const rate = Number.parseInt(__ENV.RATE || "10", 10);
const duration = __ENV.DURATION || "20s";
const preAllocatedVUs = Number.parseInt(__ENV.PRE_ALLOCATED_VUS || "20", 10);
const maxVUs = Number.parseInt(__ENV.MAX_VUS || "40", 10);
const level = __ENV.LEVEL || "custom";
const summaryPath = __ENV.SUMMARY_PATH || "/results/summary.json";

const thresholds = {
  http_req_failed: ["rate<0.01"],
  checks: ["rate>0.99"],
  http_req_duration: ["p(95)<500"],
  dropped_iterations: ["count<1"],
};

for (let i = 0; i < targets.length; i += 1) {
  thresholds[`http_req_duration{app_id:${targets[i].id}}`] = ["p(95)<500"];
}

export const options = {
  discardResponseBodies: false,
  userAgent: "mini-paas-k6-dynamic/1.0",
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
  thresholds,
};

export default function () {
  const target = targets[__ITER % targets.length];
  const headers = target.host ? { Host: target.host } : {};
  const response = http.get(target.url, {
    headers,
    tags: {
      app_id: target.id,
      endpoint: target.endpoint || "health",
      name: `GET ${target.routeLabel || target.url}`,
    },
    timeout: "3s",
  });

  let parsedBody = null;
  try {
    parsedBody = response.json();
  } catch {
    parsedBody = null;
  }

  const checks = {
    "HTTP trả 200": (result) => result.status === 200,
  };

  if (target.expectAppId) {
    checks["đúng appId"] = () => parsedBody && parsedBody.appId === target.id;
  }
  if (target.expectVersion) {
    checks["có phiên bản"] = () =>
      parsedBody && typeof parsedBody.version === "string" && parsedBody.version.length > 0;
  }
  if (!target.expectAppId && !target.expectVersion) {
    checks["phản hồi có nội dung"] = (result) =>
      typeof result.body === "string" && result.body.length > 0;
  }

  check(response, checks, { app_id: target.id });
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
    `Dynamic T06 ${level} (${targets.map((t) => t.id).join(", ")}): ${requests} request, ${achievedRate.toFixed(2)} req/s`,
    `p95=${p95.toFixed(2)} ms, lỗi=${errorRate.toFixed(3)}%, dropped=${dropped}`,
    `Summary JSON: ${summaryPath}`,
    "",
  ].join("\n");

  return {
    stdout: output,
    [summaryPath]: JSON.stringify(data, null, 2),
  };
}
