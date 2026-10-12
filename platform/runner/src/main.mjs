import { DockerClient } from "./docker.mjs";
import { DeploymentRuntime } from "./runtime.mjs";
import { createRunnerServer } from "./server.mjs";
import { TrustedSourceBuilder } from "./source-build.mjs";

const token = process.env.RUNNER_SHARED_SECRET;
if (!token || token.length < 24 || token.startsWith("CHANGE_ME")) {
  throw new Error("RUNNER_SHARED_SECRET phải có ít nhất 24 ký tự và không được dùng giá trị mẫu.");
}

const port = Number.parseInt(process.env.PORT || "3001", 10);
const host = process.env.HOST || "0.0.0.0";
const docker = new DockerClient(process.env.DOCKER_SOCKET || "/var/run/docker.sock");
const sourceBuilder = new TrustedSourceBuilder(docker);
const runtime = new DeploymentRuntime(docker, {
  project: process.env.COMPOSE_PROJECT_NAME || "mini-paas",
  sourceBuilder,
});
const server = createRunnerServer({ runtime, token });

server.listen(port, host, () => {
  console.info(JSON.stringify({ event: "runner_started", host, port }));
});

function shutdown(signal) {
  console.info(JSON.stringify({ event: "runner_stopping", signal }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
