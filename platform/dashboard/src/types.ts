export interface UserSession {
  readonly user: { readonly username: string };
  readonly expiresAt: string;
}

export type HealthStatus = "healthy" | "unhealthy" | "unknown";
export type RuntimeStatus = "running" | "stopped" | "starting" | "unhealthy" | "unknown";
export type OperationAction = "start" | "stop" | "restart" | "update";
export type OperationStatus = "queued" | "running" | "succeeded" | "failed";

export interface OperationItem {
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

export interface ApplicationItem {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly route: string;
  readonly desiredVersion: string;
  readonly observedVersion: string | null;
  readonly health: {
    readonly status: HealthStatus;
    readonly checkedAt: string;
    readonly latencyMs: number;
    readonly httpStatus: number | null;
    readonly message: string;
  };
  readonly runtime: {
    readonly appId: string;
    readonly status: RuntimeStatus;
    readonly containerId: string | null;
    readonly containerName: string | null;
    readonly image: string | null;
    readonly observedVersion: string | null;
    readonly health: string | null;
    readonly startedAt: string | null;
    readonly source: "deployment_runner";
    readonly message?: string;
  };
  readonly activeOperation: OperationItem | null;
}

export interface ApplicationsResponse {
  readonly data: readonly ApplicationItem[];
  readonly summary: {
    readonly total: number;
    readonly healthy: number;
    readonly running: number;
    readonly attention: number;
  };
  readonly checkedAt: string;
}

export interface AuditEvent {
  readonly id: number;
  readonly actorUsername: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly outcome: "succeeded" | "failed";
  readonly detail: string | null;
  readonly ipAddress: string | null;
  readonly createdAt: string;
}

export interface AuditResponse {
  readonly data: readonly AuditEvent[];
}

export interface OperationsResponse {
  readonly data: readonly OperationItem[];
}
