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
    if (version.user_version >= 1) return;
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
        desired_version = excluded.desired_version,
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
