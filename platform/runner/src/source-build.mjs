import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { RunnerInputError } from "./catalog.mjs";

const DEFAULT_MAX_ARCHIVE_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAX_LOG_CHARS = 64 * 1024;

function boundedAppend(current, addition, maximum = DEFAULT_MAX_LOG_CHARS) {
  const next = `${current}${addition}`;
  return next.length <= maximum ? next : `${next.slice(0, maximum)}\n[build log đã được rút gọn]\n`;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { ...options, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output = boundedAppend(output, chunk.toString("utf8")); });
    child.stderr.on("data", (chunk) => { output = boundedAppend(output, chunk.toString("utf8")); });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(output);
      else rejectPromise(new Error(`${command} kết thúc với mã ${code}. ${output}`));
    });
  });
}

function assertContextInsideCheckout(checkoutPath, contextPath) {
  const resolvedCheckout = resolve(checkoutPath);
  const resolvedContext = resolve(checkoutPath, contextPath);
  if (!resolvedContext.startsWith(`${resolvedCheckout}${sep}`)) {
    throw new RunnerInputError("invalid_source_context", "Thư mục build của source không hợp lệ.");
  }
  return resolvedContext;
}

export class TrustedSourceBuilder {
  constructor(docker, options = {}) {
    this.docker = docker;
    this.fetch = options.fetch ?? globalThis.fetch;
    this.workspaceRoot = options.workspaceRoot ?? join(tmpdir(), "mini-paas-builds");
    this.maximumArchiveBytes = options.maximumArchiveBytes ?? DEFAULT_MAX_ARCHIVE_BYTES;
    this.downloadTimeoutMs = options.downloadTimeoutMs ?? 30_000;
  }

  async downloadArchive(source, commit, archivePath) {
    const url = `${source.archiveBaseUrl}/${commit}.tar.gz`;
    const response = await this.fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(this.downloadTimeoutMs),
      headers: { accept: "application/gzip, application/octet-stream" },
    });
    if (!response.ok) {
      throw new RunnerInputError("source_revision_not_found", `Không tải được commit đã chọn từ kho mã (HTTP ${response.status}).`, 422);
    }
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > this.maximumArchiveBytes) {
      throw new RunnerInputError("source_archive_too_large", "Gói mã nguồn vượt giới hạn 16 MiB.", 413);
    }
    const archive = Buffer.from(await response.arrayBuffer());
    if (archive.length === 0 || archive.length > this.maximumArchiveBytes) {
      throw new RunnerInputError("source_archive_too_large", "Gói mã nguồn rỗng hoặc vượt giới hạn 16 MiB.", 413);
    }
    await writeFile(archivePath, archive, { mode: 0o600 });
    return archive.length;
  }

  async build(source, commit) {
    await mkdir(this.workspaceRoot, { recursive: true, mode: 0o700 });
    const workspace = await mkdtemp(join(this.workspaceRoot, `${source.id}-`));
    const archivePath = join(workspace, "source.tar.gz");
    const checkoutPath = join(workspace, "checkout");
    let log = `Source: ${source.repositoryUrl}\nCommit: ${commit}\n`;
    try {
      await mkdir(checkoutPath, { mode: 0o700 });
      const archiveBytes = await this.downloadArchive(source, commit, archivePath);
      log = boundedAppend(log, `Đã tải ${archiveBytes} byte mã nguồn.\n`);
      const extractOutput = await runCommand("tar", ["-xzf", archivePath, "-C", checkoutPath, "--strip-components=1"]);
      log = boundedAppend(log, extractOutput);

      const contextPath = assertContextInsideCheckout(checkoutPath, source.contextPath);
      const dockerfile = join(contextPath, "Dockerfile");
      const dockerfileStat = await stat(dockerfile).catch(() => null);
      if (!dockerfileStat?.isFile()) {
        throw new RunnerInputError("dockerfile_not_found", `Commit không chứa Dockerfile tại ${source.contextPath}.`, 422);
      }

      const version = `git-${commit.slice(0, 12)}`;
      const imageReference = `${source.imageRepository}:${version}`;
      const build = await this.docker.build(contextPath, imageReference, {
        buildArgs: { APP_VERSION: version },
        labels: {
          "org.opencontainers.image.revision": commit,
          "org.opencontainers.image.source": source.repositoryUrl,
          "io.mini-paas.source-id": source.id,
        },
      });
      log = boundedAppend(log, build.log ?? "");
      const image = await this.docker.image(imageReference);
      return {
        sourceId: source.id,
        appId: source.appId,
        commit,
        version,
        imageReference,
        imageId: String(image.Id ?? ""),
        log,
      };
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }
}
