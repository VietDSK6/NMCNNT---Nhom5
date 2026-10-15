import { backup, DatabaseSync } from "node:sqlite";
import { chmodSync, existsSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const sourcePath = process.env.SOURCE_DATABASE_PATH || "/source/control.db";
const destinationPath = process.env.BACKUP_DATABASE_PATH || "/backup/control.db";
const summaryPath = process.env.BACKUP_SUMMARY_PATH || "/backup/summary.json";

if (!existsSync(sourcePath)) {
  throw new Error(`Không tìm thấy SQLite nguồn tại ${sourcePath}.`);
}
if (existsSync(destinationPath)) {
  throw new Error(`File backup đã tồn tại tại ${destinationPath}; không ghi đè.`);
}

const source = new DatabaseSync(sourcePath, { readOnly: true });
await backup(source, destinationPath);
source.close();
chmodSync(destinationPath, 0o600);

const restored = new DatabaseSync(destinationPath, { readOnly: true });
const integrityRows = restored.prepare("PRAGMA integrity_check").all();
const integrity = integrityRows.map((row) => String(row.integrity_check));
if (integrity.length !== 1 || integrity[0] !== "ok") {
  throw new Error(`SQLite integrity_check thất bại: ${integrity.join(", ")}`);
}

const tables = [
  "users",
  "applications",
  "operations",
  "deployments",
  "releases",
  "application_environment_variables",
  "audit_events",
];
const counts = Object.fromEntries(
  tables.map((table) => {
    const row = restored.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
    return [table, Number(row.count)];
  }),
);
const userVersion = Number(restored.prepare("PRAGMA user_version").get().user_version);
restored.close();

const digest = createHash("sha256").update(await readFile(destinationPath)).digest("hex");
const summary = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  sourceVolume: process.env.SOURCE_VOLUME || "unknown",
  sourceCommit: process.env.SOURCE_COMMIT || "unknown",
  databaseFile: "control.db",
  sha256: digest,
  sqliteUserVersion: userVersion,
  integrityCheck: "ok",
  rowCounts: counts,
};

writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
process.stdout.write(`${JSON.stringify(summary)}\n`);
