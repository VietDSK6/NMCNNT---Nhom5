import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  applicationFromRow,
  auditFromRow,
  deploymentFromRow,
  environmentVariableFromRow,
  operationFromRow,
  releaseFromRow,
  sessionUserFromRow,
  userFromRow,
} from "./database/mappers.js";
import { runMigrations } from "./database/migrations.js";
import type {
  ApplicationRecord,
  AuditRecord,
  DeploymentRecord,
  EnvironmentVariableRecord,
  OperationAction,
  OperationRecord,
  ReleaseOrigin,
  ReleaseRecord,
  SessionUser,
  UserRecord,
} from "./database/types.js";
import { hashPassword, verifyPassword } from "./security.js";

export type {
  ApplicationRecord,
  AuditRecord,
  DeploymentRecord,
  DeploymentStatus,
  EnvironmentVariableRecord,
  OperationAction,
  OperationRecord,
  OperationStatus,
  ReleaseOrigin,
  ReleaseRecord,
  SessionUser,
  UserRecord,
} from "./database/types.js";

export class ControlDatabase {
  readonly #db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.#db = new DatabaseSync(path);
    this.#db.exec("PRAGMA foreign_keys = ON;");
    if (path !== ":memory:") this.#db.exec("PRAGMA journal_mode = WAL;");
    runMigrations(this.#db);
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
    return userFromRow(row);
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
      SELECT id, slug, name, description, route_path, health_path, version_path,
             desired_version, kind, repository_url, default_branch, build_context,
             public_host, internal_port
      FROM applications ORDER BY name ASC
    `).all() as readonly Record<string, unknown>[];
    return rows.map(applicationFromRow);
  }

  createWebService(input: {
    slug: string;
    name: string;
    repositoryUrl: string;
    defaultBranch: string;
    buildContext: string;
    publicHost: string;
  }): ApplicationRecord {
    const now = new Date().toISOString();
    this.#db.prepare(`
      INSERT INTO applications (
        id, slug, name, description, route_path, health_path, version_path,
        desired_version, kind, repository_url, default_branch, build_context,
        public_host, internal_port, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, '/health', '/version', 'Chưa triển khai', 'git', ?, ?, ?, ?, 3000, ?, ?)
    `).run(
      input.slug,
      input.slug,
      input.name,
      `Web Service triển khai từ ${input.repositoryUrl}.`,
      `/services/${input.slug}/`,
      input.repositoryUrl,
      input.defaultBranch,
      input.buildContext,
      input.publicHost,
      now,
      now,
    );
    return this.findApplication(input.slug)!;
  }

  findApplication(id: string): ApplicationRecord | undefined {
    return this.listApplications().find((application) => application.id === id);
  }

  setDesiredVersion(id: string, version: string): void {
    this.#db.prepare(`
      UPDATE applications SET desired_version = ?, updated_at = ? WHERE id = ?
    `).run(version, new Date().toISOString(), id);
  }

  listEnvironmentVariables(applicationId: string): readonly EnvironmentVariableRecord[] {
    const rows = this.#db.prepare(`
      SELECT application_id, key, encrypted_value, sensitive, updated_at
      FROM application_environment_variables
      WHERE application_id = ?
      ORDER BY key ASC
    `).all(applicationId) as readonly Record<string, unknown>[];
    return rows.map(environmentVariableFromRow);
  }

  replaceEnvironmentVariables(
    applicationId: string,
    variables: readonly Pick<EnvironmentVariableRecord, "key" | "encryptedValue" | "sensitive">[],
  ): void {
    const now = new Date().toISOString();
    const insert = this.#db.prepare(`
      INSERT INTO application_environment_variables (
        application_id, key, encrypted_value, sensitive, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    this.#db.exec("BEGIN IMMEDIATE;");
    try {
      this.#db.prepare("DELETE FROM application_environment_variables WHERE application_id = ?").run(applicationId);
      for (const variable of variables) {
        insert.run(
          applicationId,
          variable.key,
          variable.encryptedValue,
          variable.sensitive ? 1 : 0,
          now,
          now,
        );
      }
      this.#db.exec("COMMIT;");
    } catch (error) {
      this.#db.exec("ROLLBACK;");
      throw error;
    }
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
    return row ? operationFromRow(row) : undefined;
  }

  findOperation(id: string): OperationRecord | undefined {
    const row = this.#db.prepare(`
      SELECT operations.*, applications.name AS application_name
      FROM operations
      JOIN applications ON applications.id = operations.application_id
      WHERE operations.id = ?
    `).get(id) as Record<string, unknown> | undefined;
    return row ? operationFromRow(row) : undefined;
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
    return rows.map(operationFromRow);
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
    return row ? deploymentFromRow(row) : undefined;
  }

  findDeployment(id: string): DeploymentRecord | undefined {
    const row = this.#db.prepare(`
      SELECT deployments.*, applications.name AS application_name
      FROM deployments
      JOIN applications ON applications.id = deployments.application_id
      WHERE deployments.id = ?
    `).get(id) as Record<string, unknown> | undefined;
    return row ? deploymentFromRow(row) : undefined;
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
    return rows.map(deploymentFromRow);
  }

  createRelease(input: {
    applicationId: string;
    origin: ReleaseOrigin;
    version: string;
    imageReference: string;
    imageId: string;
    sourceId?: string;
    commitSha?: string;
    deploymentId?: string;
    rollbackOfReleaseId?: string;
    requestedBy: string;
  }): ReleaseRecord {
    const id = randomUUID();
    this.#db.prepare(`
      INSERT INTO releases (
        id, application_id, origin, version, image_reference, image_id,
        source_id, commit_sha, deployment_id, rollback_of_release_id,
        requested_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.applicationId,
      input.origin,
      input.version,
      input.imageReference,
      input.imageId,
      input.sourceId ?? null,
      input.commitSha ?? null,
      input.deploymentId ?? null,
      input.rollbackOfReleaseId ?? null,
      input.requestedBy,
      new Date().toISOString(),
    );
    return this.findRelease(id)!;
  }

  findRelease(id: string): ReleaseRecord | undefined {
    const row = this.#db.prepare(`
      SELECT releases.*, applications.name AS application_name
      FROM releases
      JOIN applications ON applications.id = releases.application_id
      WHERE releases.id = ?
    `).get(id) as Record<string, unknown> | undefined;
    return row ? releaseFromRow(row) : undefined;
  }

  listReleases(limit: number, applicationId?: string): readonly ReleaseRecord[] {
    const query = applicationId
      ? `
        SELECT releases.*, applications.name AS application_name
        FROM releases
        JOIN applications ON applications.id = releases.application_id
        WHERE releases.application_id = ?
        ORDER BY releases.created_at DESC LIMIT ?
      `
      : `
        SELECT releases.*, applications.name AS application_name
        FROM releases
        JOIN applications ON applications.id = releases.application_id
        ORDER BY releases.created_at DESC LIMIT ?
      `;
    const rows = applicationId
      ? this.#db.prepare(query).all(applicationId, limit)
      : this.#db.prepare(query).all(limit);
    return (rows as readonly Record<string, unknown>[]).map(releaseFromRow);
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
    return sessionUserFromRow(row);
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
    return rows.map(auditFromRow);
  }

  close(): void {
    this.#db.close();
  }
}
