export interface UserSession {
  readonly user: { readonly username: string };
  readonly expiresAt: string;
}

export type HealthStatus = "healthy" | "unhealthy" | "unknown";

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
    readonly status: "not_integrated";
    readonly source: "runner_pending";
    readonly message: string;
  };
}

export interface ApplicationsResponse {
  readonly data: readonly ApplicationItem[];
  readonly summary: {
    readonly total: number;
    readonly healthy: number;
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
