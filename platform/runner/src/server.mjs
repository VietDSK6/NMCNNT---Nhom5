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

function text(response, statusCode, value, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  });
  response.end(value);
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

    if (request.method === "GET" && url.pathname === "/metrics") {
      try {
        text(
          response,
          200,
          await runtime.prometheusMetrics(),
          "text/plain; version=0.0.4; charset=utf-8",
        );
      } catch {
        text(response, 503, "Không thể thu thập metric tại thời điểm này.\n");
      }
      return;
    }

    if (!tokenMatches(request.headers["x-runner-token"], token)) {
      json(response, 401, { error: "runner_authentication_required", message: "Yêu cầu không có thông tin xác thực Runner hợp lệ." });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/sources") {
      json(response, 200, { data: runtime.listSources() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/services/latest-revision") {
      try {
        const body = await readJson(request);
        const data = await runtime.latestServiceRevision(body.service);
        logger.info?.({ appId: data.appId, branch: data.branch, commit: data.commit }, "service_latest_revision_resolved");
        json(response, 200, { data });
      } catch (error) {
        const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
        const code = typeof error?.code === "string" ? error.code : "runner_internal_error";
        const message = statusCode < 500 && error instanceof Error
          ? error.message
          : "Runner không thể phân giải commit mới nhất của Web Service.";
        logger.error?.({ code, statusCode }, "service_latest_revision_failed");
        json(response, statusCode, { error: code, message });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/services/deployments") {
      try {
        const body = await readJson(request);
        if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.commit !== "string") {
          json(response, 400, { error: "validation_error", message: "Yêu cầu phải có cấu hình service và commit SHA hợp lệ." });
          return;
        }
        const data = await runtime.deployService(body.service, body.commit);
        logger.info?.({ appId: data.appId, commit: body.commit, result: "succeeded" }, "service_deployment_completed");
        json(response, 200, { data });
      } catch (error) {
        const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
        const code = typeof error?.code === "string" ? error.code : "runner_internal_error";
        const message = statusCode < 500 && error instanceof Error
          ? error.message
          : "Runner không thể build và triển khai Web Service.";
        logger.error?.({ code, statusCode }, "service_deployment_failed");
        json(response, statusCode, { error: code, message });
      }
      return;
    }

    const latestRevisionMatch = url.pathname.match(/^\/v1\/sources\/([a-z0-9-]+)\/latest-revision$/);
    if (request.method === "GET" && latestRevisionMatch) {
      try {
        const data = await runtime.latestRevision(latestRevisionMatch[1]);
        logger.info?.({ sourceId: data.sourceId, branch: data.branch, commit: data.commit }, "source_latest_revision_resolved");
        json(response, 200, { data });
      } catch (error) {
        const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
        const code = typeof error?.code === "string" ? error.code : "runner_internal_error";
        const message = statusCode < 500 && error instanceof Error
          ? error.message
          : "Runner không thể phân giải commit mới nhất. Hãy kiểm tra nhật ký dịch vụ.";
        logger.error?.({ sourceId: latestRevisionMatch[1], code, statusCode }, "source_latest_revision_failed");
        json(response, statusCode, { error: code, message });
      }
      return;
    }

    const sourceDeploymentMatch = url.pathname.match(/^\/v1\/sources\/([a-z0-9-]+)\/deployments$/);
    if (request.method === "POST" && sourceDeploymentMatch) {
      try {
        const body = await readJson(request);
        if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.commit !== "string") {
          json(response, 400, { error: "validation_error", message: "Yêu cầu phải có commit SHA hợp lệ." });
          return;
        }
        const data = await runtime.deploySource(sourceDeploymentMatch[1], body.commit);
        logger.info?.({ sourceId: sourceDeploymentMatch[1], commit: body.commit, result: "succeeded" }, "source_deployment_completed");
        json(response, 200, { data });
      } catch (error) {
        const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
        const code = typeof error?.code === "string" ? error.code : "runner_internal_error";
        const message = statusCode < 500 && error instanceof Error
          ? error.message
          : "Runner không thể build và triển khai commit. Hãy kiểm tra nhật ký dịch vụ.";
        logger.error?.({ sourceId: sourceDeploymentMatch[1], code, statusCode }, "source_deployment_failed");
        json(response, statusCode, { error: code, message });
      }
      return;
    }

    const match = url.pathname.match(/^\/v1\/apps\/([a-z0-9-]+)(?:\/(actions|logs|stats|environment|rollbacks))?$/);
    if (!match) {
      json(response, 404, { error: "not_found", message: "Không tìm thấy tài nguyên yêu cầu." });
      return;
    }

    const appId = match[1];
    const resource = match[2] ?? "status";
    try {
      if (request.method === "GET" && resource === "status") {
        json(response, 200, { data: await runtime.status(appId) });
        return;
      }
      if (request.method === "GET" && resource === "logs") {
        const rawTail = url.searchParams.get("tail");
        const tail = rawTail === null ? 100 : Number(rawTail);
        if (!Number.isInteger(tail) || tail < 1 || tail > 200) {
          json(response, 400, { error: "validation_error", message: "Số dòng log phải là số nguyên từ 1 đến 200." });
          return;
        }
        json(response, 200, { data: await runtime.logs(appId, tail) });
        return;
      }
      if (request.method === "GET" && resource === "stats") {
        json(response, 200, { data: await runtime.stats(appId) });
        return;
      }
      if (request.method === "POST" && resource === "actions") {
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
      if (request.method === "PUT" && resource === "environment") {
        const body = await readJson(request);
        if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.variables)) {
          json(response, 400, { error: "validation_error", message: "Yêu cầu phải có danh sách biến môi trường." });
          return;
        }
        const result = await runtime.configureEnvironment(appId, body.variables);
        logger.info?.({ appId, variableCount: body.variables.length, result: "succeeded" }, "runner_environment_updated");
        json(response, 200, { data: result });
        return;
      }
      if (request.method === "POST" && resource === "rollbacks") {
        const body = await readJson(request);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          json(response, 400, { error: "validation_error", message: "Release cần rollback không hợp lệ." });
          return;
        }
        const result = await runtime.rollback(appId, body);
        logger.info?.({ appId, version: body.version, result: "succeeded" }, "runner_rollback_completed");
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
