import { DatabaseSync } from "node:sqlite";
import { chmodSync, chownSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const sourcePath = process.env.BACKUP_DATABASE_PATH || "/backup/control.db";
const summaryPath = process.env.BACKUP_SUMMARY_PATH || "/backup/summary.json";
const targetDirectory = process.env.RESTORE_TARGET_DIRECTORY || "/target";
const targetPath = `${targetDirectory}/control.db`;

if (!existsSync(sourcePath) || !existsSync(summaryPath)) {
  throw new Error("Bộ backup thiếu control.db hoặc summary.json.");
}
const entries = readdirSync(targetDirectory).filter((entry) => !entry.startsWith("lost+found"));
if (entries.length > 0) {
  throw new Error(`Volume đích không rỗng: ${entries.join(", ")}`);
}

const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const digest = createHash("sha256").update(readFileSync(sourcePath)).digest("hex");
if (digest !== summary.sha256) {
  throw new Error("Checksum control.db không khớp summary.json.");
}

writeFileSync(targetPath, readFileSync(sourcePath), { mode: 0o600 });
chmodSync(targetPath, 0o600);
chownSync(
  targetPath,
  Number.parseInt(process.env.RESTORE_UID || "1000", 10),
  Number.parseInt(process.env.RESTORE_GID || "1000", 10),
);

const restored = new DatabaseSync(targetPath, { readOnly: true });
const integrityRows = restored.prepare("PRAGMA integrity_check").all();
const integrity = integrityRows.map((row) => String(row.integrity_check));
if (integrity.length !== 1 || integrity[0] !== "ok") {
  throw new Error(`SQLite integrity_check thất bại sau restore: ${integrity.join(", ")}`);
}

for (const [table, expected] of Object.entries(summary.rowCounts)) {
  const actual = Number(restored.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count);
  if (actual !== expected) {
    throw new Error(`Số bản ghi ${table} không khớp: mong đợi ${expected}, nhận ${actual}.`);
  }
}
const userVersion = Number(restored.prepare("PRAGMA user_version").get().user_version);
restored.close();
if (userVersion !== summary.sqliteUserVersion) {
  throw new Error(`SQLite user_version không khớp: mong đợi ${summary.sqliteUserVersion}, nhận ${userVersion}.`);
}

process.stdout.write(`${JSON.stringify({
  restored: true,
  target: targetPath,
  integrityCheck: "ok",
  sqliteUserVersion: userVersion,
  rowCounts: summary.rowCounts,
})}\n`);
