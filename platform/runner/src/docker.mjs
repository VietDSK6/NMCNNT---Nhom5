import http from "node:http";

export class DockerApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "DockerApiError";
    this.statusCode = statusCode;
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
