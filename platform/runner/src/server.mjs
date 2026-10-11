import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";

function json(response, statusCode, value) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  });
  response.end(JSON.stringify(value));
}

function tokenMatches(provided, expected) {
  if (typeof provided !== "string") return false;
  const actualBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 16 * 1024) {
      const error = new Error("Nội dung yêu cầu vượt giới hạn cho phép.");
      error.statusCode = 413;
      error.code = "body_too_large";
      throw error;
    }
  }
  try { return raw ? JSON.parse(raw) : {}; } catch {
    const error = new Error("Nội dung JSON không hợp lệ.");
    error.statusCode = 400;
    error.code = "invalid_json";
    throw error;
  }
}

export function createRunnerServer({ runtime, token, logger = console }) {
  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://runner.internal");
    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, { status: "ok", service: "deployment-runner" });
      return;
    }

    if (!tokenMatches(request.headers["x-runner-token"], token)) {
      json(response, 401, { error: "runner_authentication_required", message: "Yêu cầu không có thông tin xác thực Runner hợp lệ." });
      return;
    }

    const match = url.pathname.match(/^\/v1\/apps\/([a-z0-9-]+)(?:\/actions)?$/);
    if (!match) {
      json(response, 404, { error: "not_found", message: "Không tìm thấy tài nguyên yêu cầu." });
      return;
    }

    const appId = match[1];
    try {
      if (request.method === "GET" && !url.pathname.endsWith("/actions")) {
        json(response, 200, { data: await runtime.status(appId) });
        return;
      }
      if (request.method === "POST" && url.pathname.endsWith("/actions")) {
        const body = await readJson(request);
        if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.action !== "string") {
          json(response, 400, { error: "validation_error", message: "Yêu cầu phải có thao tác hợp lệ." });
          return;
        }
        const result = await runtime.execute(appId, body.action, body.version);
        logger.info?.({ appId, action: body.action, result: "succeeded" }, "runner_action_completed");
        json(response, 200, { data: result });
        return;
      }
      json(response, 405, { error: "method_not_allowed", message: "Phương thức HTTP không được hỗ trợ." });
    } catch (error) {
      const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
      const code = typeof error?.code === "string" ? error.code : "runner_internal_error";
      const message = statusCode < 500 && error instanceof Error
        ? error.message
        : "Runner không thể hoàn tất thao tác. Hãy kiểm tra nhật ký dịch vụ.";
      logger.error?.({ appId, code, statusCode }, "runner_request_failed");
      json(response, statusCode, { error: code, message });
    }
  });
}
