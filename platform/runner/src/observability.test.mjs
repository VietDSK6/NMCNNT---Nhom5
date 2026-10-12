import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeDockerLogs, summarizeDockerStats } from "./observability.mjs";

function frame(stream, value) {
  const payload = Buffer.from(value);
  const header = Buffer.alloc(8);
  header[0] = stream;
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

test("giải mã log multiplex, chuẩn hóa thời gian và phân biệt stdout/stderr", () => {
  const raw = Buffer.concat([
    frame(1, '2026-10-12T01:02:03.123456789Z {"message":"ready"}\n'),
    frame(2, "2026-10-12T01:02:04Z warning\n"),
  ]);
  const result = decodeDockerLogs(raw, 10);
  assert.equal(result.lines.length, 2);
  assert.deepEqual(result.lines[0], {
    timestamp: "2026-10-12T01:02:03.123Z",
    stream: "stdout",
    message: '{"message":"ready"}',
  });
  assert.equal(result.lines[1].stream, "stderr");
});

test("giới hạn số dòng, độ dài và ẩn trường bí mật thường gặp", () => {
  const longLine = `${"x".repeat(5_000)} token=plain-text-secret`;
  const result = decodeDockerLogs(Buffer.from(`first\n${longLine}\nlast\n`), 2);
  assert.equal(result.lines.length, 2);
  assert.equal(result.truncated, true);
  assert.ok(result.lines[0].message.length <= 4_097);
  assert.doesNotMatch(result.lines[0].message, /plain-text-secret/);
});

test("tính CPU, working set RAM, PID và lưu lượng mạng từ Docker stats", () => {
  const result = summarizeDockerStats({
    read: "2026-10-12T01:02:03.000Z",
    cpu_stats: { cpu_usage: { total_usage: 150 }, system_cpu_usage: 1_200, online_cpus: 2 },
    precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1_000 },
    memory_stats: { usage: 10_000, limit: 20_000, stats: { inactive_file: 2_000 } },
    pids_stats: { current: 7 },
    networks: {
      eth0: { rx_bytes: 120, tx_bytes: 80 },
      eth1: { rx_bytes: 30, tx_bytes: 20 },
    },
  });
  assert.equal(result.cpuPercent, 50);
  assert.equal(result.memoryWorkingSetBytes, 8_000);
  assert.equal(result.memoryPercent, 40);
  assert.equal(result.pids, 7);
  assert.equal(result.networkRxBytes, 150);
  assert.equal(result.networkTxBytes, 100);
});
