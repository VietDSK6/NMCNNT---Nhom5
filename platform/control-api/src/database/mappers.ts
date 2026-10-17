import type {
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
} from "./types.js";

export type DatabaseRow = Record<string, unknown>;

function nullableString(value: unknown): string | null {
  return value === null ? null : String(value);
}

export function userFromRow(row: DatabaseRow): UserRecord {
  return {
    id: String(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
    passwordSalt: String(row.password_salt),
  };
}

export function sessionUserFromRow(row: DatabaseRow): SessionUser {
  return {
    id: String(row.id),
    username: String(row.username),
    expiresAt: String(row.expires_at),
  };
}

export function applicationFromRow(row: DatabaseRow): ApplicationRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    routePath: String(row.route_path),
    healthPath: String(row.health_path),
    versionPath: String(row.version_path),
    desiredVersion: String(row.desired_version),
    kind: String(row.kind) as ApplicationRecord["kind"],
    repositoryUrl: nullableString(row.repository_url),
    defaultBranch: nullableString(row.default_branch),
    buildContext: nullableString(row.build_context),
    publicHost: nullableString(row.public_host),
    internalPort: Number(row.internal_port),
  };
}

export function environmentVariableFromRow(row: DatabaseRow): EnvironmentVariableRecord {
  return {
    applicationId: String(row.application_id),
    key: String(row.key),
    encryptedValue: String(row.encrypted_value),
    sensitive: Number(row.sensitive) === 1,
    updatedAt: String(row.updated_at),
  };
}

export function operationFromRow(row: DatabaseRow): OperationRecord {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    applicationName: String(row.application_name),
    action: String(row.action) as OperationAction,
    requestedVersion: nullableString(row.requested_version),
    status: String(row.status) as OperationStatus,
    message: nullableString(row.message),
    requestedBy: String(row.requested_by),
    createdAt: String(row.created_at),
    startedAt: nullableString(row.started_at),
    finishedAt: nullableString(row.finished_at),
  };
}

export function deploymentFromRow(row: DatabaseRow): DeploymentRecord {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    applicationName: String(row.application_name),
    sourceId: String(row.source_id),
    repositoryUrl: String(row.repository_url),
    commitSha: String(row.commit_sha),
    status: String(row.status) as DeploymentStatus,
    version: nullableString(row.version),
    imageReference: nullableString(row.image_reference),
    imageId: nullableString(row.image_id),
    buildLog: nullableString(row.build_log),
    message: nullableString(row.message),
    requestedBy: String(row.requested_by),
    createdAt: String(row.created_at),
    startedAt: nullableString(row.started_at),
    finishedAt: nullableString(row.finished_at),
  };
}

export function releaseFromRow(row: DatabaseRow): ReleaseRecord {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    applicationName: String(row.application_name),
    origin: String(row.origin) as ReleaseOrigin,
    version: String(row.version),
    imageReference: String(row.image_reference),
    imageId: String(row.image_id),
    sourceId: nullableString(row.source_id),
    commitSha: nullableString(row.commit_sha),
    deploymentId: nullableString(row.deployment_id),
    rollbackOfReleaseId: nullableString(row.rollback_of_release_id),
    requestedBy: String(row.requested_by),
    createdAt: String(row.created_at),
  };
}

export function auditFromRow(row: DatabaseRow): AuditRecord {
  return {
    id: Number(row.id),
    actorUsername: nullableString(row.actor_username),
    action: String(row.action),
    resourceType: String(row.resource_type),
    resourceId: nullableString(row.resource_id),
    outcome: String(row.outcome),
    detail: nullableString(row.detail),
    ipAddress: nullableString(row.ip_address),
    createdAt: String(row.created_at),
  };
}
