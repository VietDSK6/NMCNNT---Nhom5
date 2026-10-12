import http from "node:http";
import { spawn } from "node:child_process";

export class DockerApiError extends Error {
  constructor(statusCode, message, code = "docker_api_error") {
    super(message);
    this.name = "DockerApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function parseBody(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

export class DockerClient {
  constructor(socketPath = "/var/run/docker.sock") {
    this.socketPath = socketPath;
  }

  request(method, path, body, accepted = [200, 201, 204]) {
    return new Promise((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const request = http.request({
        socketPath: this.socketPath,
        path,
        method,
        headers: payload ? {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        } : undefined,
      }, (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => { raw += chunk; });
        response.on("end", () => {
          const statusCode = response.statusCode ?? 500;
          const parsed = parseBody(raw);
          if (!accepted.includes(statusCode)) {
            const message = parsed && typeof parsed === "object" && "message" in parsed
              ? String(parsed.message)
              : `Docker API trả về HTTP ${statusCode}.`;
            reject(new DockerApiError(statusCode, message));
            return;
          }
          resolve(parsed);
        });
      });
      request.setTimeout(10_000, () => request.destroy(new Error("Quá thời gian chờ Docker API.")));
      request.on("error", reject);
      if (payload) request.write(payload);
      request.end();
    });
  }

  requestBuffer(method, path, accepted = [200], maximumBytes = 2 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      const request = http.request({ socketPath: this.socketPath, path, method }, (response) => {
        const chunks = [];
        let receivedBytes = 0;
        let stopped = false;
        response.on("data", (chunk) => {
          if (stopped) return;
          receivedBytes += chunk.length;
          if (receivedBytes > maximumBytes) {
            stopped = true;
            response.destroy();
            reject(new DockerApiError(413, "Dữ liệu log từ Docker vượt giới hạn 2 MiB cho mỗi yêu cầu.", "log_output_too_large"));
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        response.on("end", () => {
          if (stopped) return;
          const statusCode = response.statusCode ?? 500;
          const buffer = Buffer.concat(chunks);
          if (!accepted.includes(statusCode)) {
            const parsed = parseBody(buffer.toString("utf8"));
            const message = parsed && typeof parsed === "object" && "message" in parsed
              ? String(parsed.message)
              : `Docker API trả về HTTP ${statusCode}.`;
            reject(new DockerApiError(statusCode, message));
            return;
          }
          resolve(buffer);
        });
      });
      request.setTimeout(10_000, () => request.destroy(new Error("Quá thời gian chờ Docker API.")));
      request.on("error", reject);
      request.end();
    });
  }

  build(contextPath, imageReference, options = {}) {
    return new Promise((resolve, reject) => {
      const query = new URLSearchParams({
        t: imageReference,
        dockerfile: "Dockerfile",
        rm: "1",
        forcerm: "1",
        pull: "0",
        buildargs: JSON.stringify(options.buildArgs ?? {}),
        labels: JSON.stringify(options.labels ?? {}),
      });
      const archive = spawn("tar", ["-C", contextPath, "-cf", "-", "."], {
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const request = http.request({
        socketPath: this.socketPath,
        path: `/build?${query}`,
        method: "POST",
        headers: { "content-type": "application/x-tar" },
      });
      let settled = false;
      let tarError = "";

      const finishWithError = (error) => {
        if (settled) return;
        settled = true;
        archive.kill();
        request.destroy();
        reject(error);
      };

      archive.stderr.on("data", (chunk) => { tarError += chunk.toString("utf8"); });
      archive.on("error", finishWithError);
      archive.on("close", (code) => {
        if (code !== 0 && !settled) {
          finishWithError(new DockerApiError(500, `Không thể đóng gói build context. ${tarError}`, "build_context_failed"));
        }
      });

      request.setTimeout(180_000, () => finishWithError(new DockerApiError(504, "Quá thời gian chờ Docker build.", "docker_build_timeout")));
      request.on("error", finishWithError);
      request.on("response", (response) => {
        const statusCode = response.statusCode ?? 500;
        let pending = "";
        let log = "";
        let buildError = null;
        const appendLog = (value) => {
          if (!value || log.includes("[build log đã được rút gọn]")) return;
          log += value;
          if (log.length > 64 * 1024) log = `${log.slice(0, 64 * 1024)}\n[build log đã được rút gọn]\n`;
        };
        const consumeLine = (line) => {
          if (!line.trim()) return;
          let event;
          try { event = JSON.parse(line); } catch {
            appendLog(`${line}\n`);
            return;
          }
          if (typeof event.stream === "string") appendLog(event.stream);
          if (typeof event.status === "string") appendLog(`${event.status}${event.progress ? ` ${event.progress}` : ""}\n`);
          if (typeof event.error === "string") buildError = event.error;
        };
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          pending += chunk;
          const lines = pending.split("\n");
          pending = lines.pop() ?? "";
          for (const line of lines) consumeLine(line);
        });
        response.on("end", () => {
          if (settled) return;
          if (pending) consumeLine(pending);
          if (statusCode !== 200 || buildError) {
            finishWithError(new DockerApiError(statusCode, buildError || `Docker build trả về HTTP ${statusCode}.`, "docker_build_failed"));
            return;
          }
          settled = true;
          resolve({ log });
        });
      });

      archive.stdout.pipe(request);
    });
  }

  async listManaged(project, service) {
    const filters = encodeURIComponent(JSON.stringify({
      label: [
        `com.docker.compose.project=${project}`,
        `com.docker.compose.service=${service}`,
        "io.mini-paas.managed=true",
      ],
    }));
    return this.request("GET", `/containers/json?all=1&filters=${filters}`);
  }

  inspect(id) { return this.request("GET", `/containers/${encodeURIComponent(id)}/json`); }
  logs(id, tail) {
    const query = new URLSearchParams({ stdout: "1", stderr: "1", timestamps: "1", tail: String(tail) });
    return this.requestBuffer("GET", `/containers/${encodeURIComponent(id)}/logs?${query}`, [200], 2 * 1024 * 1024);
  }
  stats(id) { return this.request("GET", `/containers/${encodeURIComponent(id)}/stats?stream=false&one-shot=true`); }
  start(id) { return this.request("POST", `/containers/${encodeURIComponent(id)}/start`, undefined, [204, 304]); }
  stop(id) { return this.request("POST", `/containers/${encodeURIComponent(id)}/stop?t=10`, undefined, [204, 304]); }
  restart(id) { return this.request("POST", `/containers/${encodeURIComponent(id)}/restart?t=10`, undefined, [204]); }
  rename(id, name) { return this.request("POST", `/containers/${encodeURIComponent(id)}/rename?name=${encodeURIComponent(name)}`, undefined, [204]); }
  create(name, body) { return this.request("POST", `/containers/create?name=${encodeURIComponent(name)}`, body, [201]); }
  remove(id) { return this.request("DELETE", `/containers/${encodeURIComponent(id)}?force=1&v=1`, undefined, [204]); }

  async image(ref) {
    return this.request("GET", `/images/${encodeURIComponent(ref)}/json`);
  }
}
