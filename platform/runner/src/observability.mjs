const MAX_LOG_LINE_LENGTH = 4_096;

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function redactCommonSecrets(value) {
  return value
    .replace(/("(?:password|token|secret|authorization|api[_-]?key)"\s*:\s*)"[^"]*"/gi, '$1"[ĐÃ ẨN]"')
    .replace(/\b(password|token|secret|authorization|api[_-]?key)=([^\s&]+)/gi, "$1=[ĐÃ ẨN]");
}

function boundedMessage(value) {
  const clean = redactCommonSecrets(stripAnsi(value));
  if (clean.length <= MAX_LOG_LINE_LENGTH) return { message: clean, truncated: false };
  return { message: `${clean.slice(0, MAX_LOG_LINE_LENGTH)}…`, truncated: true };
}

function parseTimestamp(value) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\S+)\s(.*)$/s);
  if (!match) return { timestamp: null, message: value };
  const parsed = Date.parse(match[1]);
  return Number.isNaN(parsed)
    ? { timestamp: null, message: value }
    : { timestamp: new Date(parsed).toISOString(), message: match[2] };
}

function framePayloads(buffer) {
  const frames = [];
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const streamId = buffer[offset];
    const validHeader = streamId <= 2
      && buffer[offset + 1] === 0
      && buffer[offset + 2] === 0
      && buffer[offset + 3] === 0;
    if (!validHeader) return null;
    const length = buffer.readUInt32BE(offset + 4);
    if (offset + 8 + length > buffer.length) return null;
    frames.push({ stream: streamId === 2 ? "stderr" : "stdout", value: buffer.subarray(offset + 8, offset + 8 + length).toString("utf8") });
    offset += 8 + length;
  }
  return offset === buffer.length ? frames : null;
}

export function decodeDockerLogs(buffer, tail) {
  const frames = framePayloads(buffer) ?? [{ stream: "stdout", value: buffer.toString("utf8") }];
  let truncated = false;
  const lines = frames.flatMap((frame) => frame.value.split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const parsed = parseTimestamp(line.replace(/\r$/, ""));
      const bounded = boundedMessage(parsed.message);
      truncated ||= bounded.truncated;
      return { timestamp: parsed.timestamp, stream: frame.stream, message: bounded.message };
    }));
  if (lines.length > tail) truncated = true;
  return { lines: lines.slice(-tail), truncated };
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function summarizeDockerStats(stats) {
  const cpuTotal = finiteNumber(stats.cpu_stats?.cpu_usage?.total_usage);
  const previousCpuTotal = finiteNumber(stats.precpu_stats?.cpu_usage?.total_usage);
  const systemTotal = finiteNumber(stats.cpu_stats?.system_cpu_usage);
  const previousSystemTotal = finiteNumber(stats.precpu_stats?.system_cpu_usage);
  const cpuDelta = Math.max(cpuTotal - previousCpuTotal, 0);
  const systemDelta = Math.max(systemTotal - previousSystemTotal, 0);
  const onlineCpus = Math.max(
    finiteNumber(stats.cpu_stats?.online_cpus)
      || stats.cpu_stats?.cpu_usage?.percpu_usage?.length
      || 1,
    1,
  );
  const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 0;

  const memoryUsage = finiteNumber(stats.memory_stats?.usage);
  const inactiveFile = finiteNumber(
    stats.memory_stats?.stats?.inactive_file
      ?? stats.memory_stats?.stats?.total_inactive_file,
  );
  const memoryWorkingSetBytes = Math.max(memoryUsage - inactiveFile, 0);
  const memoryLimitBytes = finiteNumber(stats.memory_stats?.limit);
  const memoryPercent = memoryLimitBytes > 0
    ? (memoryWorkingSetBytes / memoryLimitBytes) * 100
    : 0;

  let networkRxBytes = 0;
  let networkTxBytes = 0;
  for (const network of Object.values(stats.networks ?? {})) {
    networkRxBytes += finiteNumber(network?.rx_bytes);
    networkTxBytes += finiteNumber(network?.tx_bytes);
  }

  return {
    cpuPercent: Number(cpuPercent.toFixed(2)),
    memoryWorkingSetBytes,
    memoryLimitBytes,
    memoryPercent: Number(memoryPercent.toFixed(2)),
    pids: finiteNumber(stats.pids_stats?.current),
    networkRxBytes,
    networkTxBytes,
    sampledAt: typeof stats.read === "string" ? stats.read : new Date().toISOString(),
  };
}

export const OBSERVABILITY_LIMITS = Object.freeze({
  defaultTail: 100,
  maximumTail: 200,
  maximumLogLineLength: MAX_LOG_LINE_LENGTH,
});
