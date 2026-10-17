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
  readonly kind: "catalog" | "git";
  readonly repositoryUrl: string | null;
  readonly defaultBranch: string | null;
  readonly buildContext: string | null;
  readonly publicHost: string | null;
  readonly internalPort: number;
}

export interface EnvironmentVariableRecord {
  readonly applicationId: string;
  readonly key: string;
  readonly encryptedValue: string;
  readonly sensitive: boolean;
  readonly updatedAt: string;
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

export type ReleaseOrigin = "catalog" | "source" | "rollback";

export interface ReleaseRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly applicationName: string;
  readonly origin: ReleaseOrigin;
  readonly version: string;
  readonly imageReference: string;
  readonly imageId: string;
  readonly sourceId: string | null;
  readonly commitSha: string | null;
  readonly deploymentId: string | null;
  readonly rollbackOfReleaseId: string | null;
  readonly requestedBy: string;
  readonly createdAt: string;
}
