import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { hashPassword, verifyPassword } from "./security.js";

export interface UserRecord {
  readonly id: string;
  readonly username: string;
  readonly passwordHash: string;
  readonly passwordSalt: string;
}

export interface SessionUser {
  readonly id: string;
  readonly username: string;
  readonly expiresAt: string;
}

export interface ApplicationRecord {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly routePath: string;
  readonly healthPath: string;
  readonly versionPath: string;
  readonly desiredVersion: string;
}

export interface AuditRecord {
  readonly id: number;
  readonly actorUsername: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly outcome: string;
  readonly detail: string | null;
  readonly ipAddress: string | null;
  readonly createdAt: string;
}

export type OperationAction = "start" | "stop" | "restart" | "update";
export type OperationStatus = "queued" | "running" | "succeeded" | "failed";

export interface OperationRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly applicationName: string;
  readonly action: OperationAction;
  readonly requestedVersion: string | null;
  readonly status: OperationStatus;
  readonly message: string | null;
  readonly requestedBy: string;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
}

export type DeploymentStatus = "queued" | "running" | "succeeded" | "failed";

export interface DeploymentRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly applicationName: string;
  readonly sourceId: string;
  readonly repositoryUrl: string;
  readonly commitSha: string;
  readonly status: DeploymentStatus;
  readonly version: string | null;
  readonly imageReference: string | null;
  readonly imageId: string | null;
  readonly buildLog: string | null;
  readonly message: string | null;
  readonly requestedBy: string;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
}

const migration001 = `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE INDEX sessions_token_hash_idx ON sessions(token_hash);
  CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

  CREATE TABLE applications (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    route_path TEXT NOT NULL UNIQUE,
    health_path TEXT NOT NULL,
    version_path TEXT NOT NULL,
    desired_version TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    actor_username TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    outcome TEXT NOT NULL,
    detail TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX audit_events_created_at_idx ON audit_events(created_at DESC);
`;

const migration002 = `
  CREATE TABLE operations (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    action TEXT NOT NULL CHECK(action IN ('start', 'stop', 'restart', 'update')),
    requested_version TEXT,
    status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'succeeded', 'failed')),
    message TEXT,
    requested_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
  );
  CREATE INDEX operations_created_at_idx ON operations(created_at DESC);
  CREATE UNIQUE INDEX operations_one_active_per_app_idx
    ON operations(application_id)
    WHERE status IN ('queued', 'running');
`;

const migration003 = `
  CREATE TABLE deployments (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    source_id TEXT NOT NULL,
    repository_url TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'succeeded', 'failed')),
    version TEXT,
    image_reference TEXT,
    image_id TEXT,
    build_log TEXT,
    message TEXT,
    requested_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
  );
  CREATE INDEX deployments_created_at_idx ON deployments(created_at DESC);
  CREATE UNIQUE INDEX deployments_one_active_per_app_idx
    ON deployments(application_id)
    WHERE status IN ('queued', 'running');
`;

export class ControlDatabase {
  readonly #db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.#db = new DatabaseSync(path);
    this.#db.exec("PRAGMA foreign_keys = ON;");
    if (path !== ":memory:") this.#db.exec("PRAGMA journal_mode = WAL;");
    this.#migrate();
  }

  #migrate(): void {
    const version = this.#db.prepare("PRAGMA user_version").get() as { user_version: number };
    if (version.user_version < 1) {
      this.#db.exec("BEGIN IMMEDIATE;");
      try {
        this.#db.exec(migration001);
        this.#db.exec("PRAGMA user_version = 1;");
        this.#db.exec("COMMIT;");
      } catch (error) {
        this.#db.exec("ROLLBACK;");
        throw error;
      }
    }
    if (version.user_version < 2) {
      this.#db.exec("BEGIN IMMEDIATE;");
      try {
        this.#db.exec(migration002);
        this.#db.exec("PRAGMA user_version = 2;");
        this.#db.exec("COMMIT;");
      } catch (error) {
        this.#db.exec("ROLLBACK;");
        throw error;
      }
    }
    if (version.user_version < 3) {
      this.#db.exec("BEGIN IMMEDIATE;");
      try {
        this.#db.exec(migration003);
        this.#db.exec("PRAGMA user_version = 3;");
        this.#db.exec("COMMIT;");
      } catch (error) {
        this.#db.exec("ROLLBACK;");
        throw error;
      }
    }
  }

  ensureAdmin(username: string, password: string): UserRecord {
    const existing = this.findUserByUsername(username);
    if (existing) {
      if (verifyPassword(password, existing.passwordSalt, existing.passwordHash)) return existing;
      const digest = hashPassword(password);
      this.#db.prepare(`
        UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?
      `).run(digest.hash, digest.salt, existing.id);
      this.#db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existing.id);
      return { ...existing, passwordHash: digest.hash, passwordSalt: digest.salt };
    }

    const id = randomUUID();
    const digest = hashPassword(password);
    const now = new Date().toISOString();
    this.#db.prepare(`
      INSERT INTO users (id, username, password_hash, password_salt, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, username, digest.hash, digest.salt, now);
    return { id, username, passwordHash: digest.hash, passwordSalt: digest.salt };
  }

  findUserByUsername(username: string): UserRecord | undefined {
    const row = this.#db.prepare(`
      SELECT id, username, password_hash, password_salt
      FROM users WHERE username = ?
    `).get(username) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      id: String(row.id),
      username: String(row.username),
      passwordHash: String(row.password_hash),
      passwordSalt: String(row.password_salt),
    };
  }

  seedApplications(appAVersion: string, appBVersion: string): void {
    const now = new Date().toISOString();
    const rows = [
      ["app-a", "app-a", "Ứng dụng A", "Ứng dụng minh họa luồng cập nhật phiên bản.", "/apps/app-a/", "/health", "/version", appAVersion],
      ["app-b", "app-b", "Ứng dụng B", "Ứng dụng đối chiếu định tuyến qua cùng Gateway.", "/apps/app-b/", "/health", "/version", appBVersion],
    ] as const;
    const statement = this.#db.prepare(`
      INSERT INTO applications (
        id, slug, name, description, route_path, health_path, version_path,
        desired_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        route_path = excluded.route_path,
        health_path = excluded.health_path,
        version_path = excluded.version_path,
        updated_at = excluded.updated_at
    `);
    for (const row of rows) statement.run(...row, now, now);
  }

  listApplications(): readonly ApplicationRecord[] {
    const rows = this.#db.prepare(`
      SELECT id, slug, name, description, route_path, health_path, version_path, desired_version
      FROM applications ORDER BY name ASC
    `).all() as readonly Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      description: String(row.description),
      routePath: String(row.route_path),
      healthPath: String(row.health_path),
      versionPath: String(row.version_path),
      desiredVersion: String(row.desired_version),
    }));
  }

  findApplication(id: string): ApplicationRecord | undefined {
    return this.listApplications().find((application) => application.id === id);
  }

  setDesiredVersion(id: string, version: string): void {
    this.#db.prepare(`
      UPDATE applications SET desired_version = ?, updated_at = ? WHERE id = ?
    `).run(version, new Date().toISOString(), id);
  }

  createOperation(input: {
    applicationId: string;
    action: OperationAction;
    requestedVersion?: string;
    requestedBy: string;
  }): OperationRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    this.#db.prepare(`
      INSERT INTO operations (
        id, application_id, action, requested_version, status, requested_by, created_at
      ) VALUES (?, ?, ?, ?, 'queued', ?, ?)
    `).run(id, input.applicationId, input.action, input.requestedVersion ?? null, input.requestedBy, createdAt);
    return this.findOperation(id)!;
  }

  findActiveOperation(applicationId: string): OperationRecord | undefined {
    const row = this.#db.prepare(`
      SELECT operations.*, applications.name AS application_name
      FROM operations
      JOIN applications ON applications.id = operations.application_id
      WHERE operations.application_id = ? AND operations.status IN ('queued', 'running')
      LIMIT 1
    `).get(applicationId) as Record<string, unknown> | undefined;
    return row ? this.#operationFromRow(row) : undefined;
  }

  findOperation(id: string): OperationRecord | undefined {
    const row = this.#db.prepare(`
      SELECT operations.*, applications.name AS application_name
      FROM operations
      JOIN applications ON applications.id = operations.application_id
      WHERE operations.id = ?
    `).get(id) as Record<string, unknown> | undefined;
    return row ? this.#operationFromRow(row) : undefined;
  }

  markOperationRunning(id: string): void {
    this.#db.prepare(`
      UPDATE operations SET status = 'running', started_at = ? WHERE id = ? AND status = 'queued'
    `).run(new Date().toISOString(), id);
  }

  finishOperation(id: string, status: "succeeded" | "failed", message: string): void {
    this.#db.prepare(`
      UPDATE operations SET status = ?, message = ?, finished_at = ?
      WHERE id = ? AND status IN ('queued', 'running')
    `).run(status, message, new Date().toISOString(), id);
  }

  listOperations(limit: number): readonly OperationRecord[] {
    const rows = this.#db.prepare(`
      SELECT operations.*, applications.name AS application_name
      FROM operations
      JOIN applications ON applications.id = operations.application_id
      ORDER BY operations.created_at DESC LIMIT ?
    `).all(limit) as readonly Record<string, unknown>[];
    return rows.map((row) => this.#operationFromRow(row));
  }

  #operationFromRow(row: Record<string, unknown>): OperationRecord {
    return {
      id: String(row.id),
      applicationId: String(row.application_id),
      applicationName: String(row.application_name),
      action: String(row.action) as OperationAction,
      requestedVersion: row.requested_version === null ? null : String(row.requested_version),
      status: String(row.status) as OperationStatus,
      message: row.message === null ? null : String(row.message),
      requestedBy: String(row.requested_by),
      createdAt: String(row.created_at),
      startedAt: row.started_at === null ? null : String(row.started_at),
      finishedAt: row.finished_at === null ? null : String(row.finished_at),
    };
  }

  createDeployment(input: {
    applicationId: string;
    sourceId: string;
    repositoryUrl: string;
    commitSha: string;
    requestedBy: string;
  }): DeploymentRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    this.#db.prepare(`
      INSERT INTO deployments (
        id, application_id, source_id, repository_url, commit_sha,
        status, requested_by, created_at
      ) VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)
    `).run(
      id,
      input.applicationId,
      input.sourceId,
      input.repositoryUrl,
      input.commitSha,
      input.requestedBy,
      createdAt,
    );
    return this.findDeployment(id)!;
  }

  findActiveDeployment(applicationId: string): DeploymentRecord | undefined {
    const row = this.#db.prepare(`
      SELECT deployments.*, applications.name AS application_name
      FROM deployments
      JOIN applications ON applications.id = deployments.application_id
      WHERE deployments.application_id = ? AND deployments.status IN ('queued', 'running')
      LIMIT 1
    `).get(applicationId) as Record<string, unknown> | undefined;
    return row ? this.#deploymentFromRow(row) : undefined;
  }

  findDeployment(id: string): DeploymentRecord | undefined {
    const row = this.#db.prepare(`
      SELECT deployments.*, applications.name AS application_name
      FROM deployments
      JOIN applications ON applications.id = deployments.application_id
      WHERE deployments.id = ?
    `).get(id) as Record<string, unknown> | undefined;
    return row ? this.#deploymentFromRow(row) : undefined;
  }

  markDeploymentRunning(id: string): void {
    this.#db.prepare(`
      UPDATE deployments SET status = 'running', started_at = ? WHERE id = ? AND status = 'queued'
    `).run(new Date().toISOString(), id);
  }

  finishDeployment(input: {
    id: string;
    status: "succeeded" | "failed";
    message: string;
    version?: string;
    imageReference?: string;
    imageId?: string;
    buildLog?: string;
  }): void {
    this.#db.prepare(`
      UPDATE deployments SET
        status = ?, message = ?, version = ?, image_reference = ?, image_id = ?, build_log = ?, finished_at = ?
      WHERE id = ? AND status IN ('queued', 'running')
    `).run(
      input.status,
      input.message,
      input.version ?? null,
      input.imageReference ?? null,
      input.imageId ?? null,
      input.buildLog?.slice(0, 65_536) ?? null,
      new Date().toISOString(),
      input.id,
    );
  }

  listDeployments(limit: number): readonly DeploymentRecord[] {
    const rows = this.#db.prepare(`
      SELECT deployments.*, applications.name AS application_name
      FROM deployments
      JOIN applications ON applications.id = deployments.application_id
      ORDER BY deployments.created_at DESC LIMIT ?
    `).all(limit) as readonly Record<string, unknown>[];
    return rows.map((row) => this.#deploymentFromRow(row));
  }

  #deploymentFromRow(row: Record<string, unknown>): DeploymentRecord {
    return {
      id: String(row.id),
      applicationId: String(row.application_id),
      applicationName: String(row.application_name),
      sourceId: String(row.source_id),
      repositoryUrl: String(row.repository_url),
      commitSha: String(row.commit_sha),
      status: String(row.status) as DeploymentStatus,
      version: row.version === null ? null : String(row.version),
      imageReference: row.image_reference === null ? null : String(row.image_reference),
      imageId: row.image_id === null ? null : String(row.image_id),
      buildLog: row.build_log === null ? null : String(row.build_log),
      message: row.message === null ? null : String(row.message),
      requestedBy: String(row.requested_by),
      createdAt: String(row.created_at),
      startedAt: row.started_at === null ? null : String(row.started_at),
      finishedAt: row.finished_at === null ? null : String(row.finished_at),
    };
  }

  createSession(userId: string, tokenHash: string, ttlSeconds: number): string {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    this.#db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), userId, tokenHash, now.toISOString(), expiresAt, now.toISOString());
    return expiresAt;
  }

  findSession(tokenHash: string): SessionUser | undefined {
    const now = new Date().toISOString();
    this.#db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
    const row = this.#db.prepare(`
      SELECT users.id, users.username, sessions.expires_at
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(tokenHash, now) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    this.#db.prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?").run(now, tokenHash);
    return {
      id: String(row.id),
      username: String(row.username),
      expiresAt: String(row.expires_at),
    };
  }

  revokeSession(tokenHash: string): void {
    this.#db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
  }

  addAudit(input: {
    actorUserId?: string;
    actorUsername?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    outcome: "succeeded" | "failed";
    detail?: string;
    ipAddress?: string;
  }): void {
    this.#db.prepare(`
      INSERT INTO audit_events (
        actor_user_id, actor_username, action, resource_type, resource_id,
        outcome, detail, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.actorUserId ?? null,
      input.actorUsername ?? null,
      input.action,
      input.resourceType,
      input.resourceId ?? null,
      input.outcome,
      input.detail ?? null,
      input.ipAddress ?? null,
      new Date().toISOString(),
    );
  }

  listAudit(limit: number): readonly AuditRecord[] {
    const rows = this.#db.prepare(`
      SELECT id, actor_username, action, resource_type, resource_id, outcome,
             detail, ip_address, created_at
      FROM audit_events ORDER BY id DESC LIMIT ?
    `).all(limit) as readonly Record<string, unknown>[];
    return rows.map((row) => ({
      id: Number(row.id),
      actorUsername: row.actor_username === null ? null : String(row.actor_username),
      action: String(row.action),
      resourceType: String(row.resource_type),
      resourceId: row.resource_id === null ? null : String(row.resource_id),
      outcome: String(row.outcome),
      detail: row.detail === null ? null : String(row.detail),
      ipAddress: row.ip_address === null ? null : String(row.ip_address),
      createdAt: String(row.created_at),
    }));
  }

  close(): void {
    this.#db.close();
  }
}
