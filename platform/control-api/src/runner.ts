export type RunnerAction = "start" | "stop" | "restart" | "update";
export type RunnerRuntimeStatus = "running" | "stopped" | "starting" | "unhealthy" | "unknown";

export interface RunnerStatus {
  readonly appId: string;
  readonly status: RunnerRuntimeStatus;
  readonly containerId: string;
  readonly containerName: string;
  readonly image: string;
  readonly imageId: string;
  readonly observedVersion: string | null;
  readonly health: string | null;
  readonly startedAt: string | null;
  readonly environmentVariableCount: number;
}

export interface RunnerActionResult {
  readonly message: string;
  readonly runtime: RunnerStatus;
}

export interface RunnerRollbackTarget {
  readonly version: string;
  readonly imageReference: string;
  readonly imageId: string;
  readonly sourceId?: string;
  readonly commitSha?: string;
}

export interface RunnerLogLine {
  readonly timestamp: string | null;
  readonly stream: "stdout" | "stderr";
  readonly message: string;
}

export interface RunnerLogs {
  readonly appId: string;
  readonly containerId: string;
  readonly requestedTail: number;
  readonly lines: readonly RunnerLogLine[];
  readonly truncated: boolean;
  readonly fetchedAt: string;
}

export interface RunnerStats {
  readonly appId: string;
  readonly containerId: string;
  readonly cpuPercent: number;
  readonly memoryWorkingSetBytes: number;
  readonly memoryLimitBytes: number;
  readonly memoryPercent: number;
  readonly pids: number;
  readonly networkRxBytes: number;
  readonly networkTxBytes: number;
  readonly sampledAt: string;
}

export interface TrustedSource {
  readonly id: string;
  readonly name: string;
  readonly provider: "github";
  readonly repositoryUrl: string;
  readonly defaultBranch: string;
  readonly appId: string;
}

export interface SourceRevision {
  readonly sourceId: string;
  readonly appId: string;
  readonly branch: string;
  readonly commit: string;
}

export interface SourceDeploymentResult {
  readonly sourceId: string;
  readonly appId: string;
  readonly commit: string;
  readonly version: string;
  readonly imageReference: string;
  readonly imageId: string;
  readonly log: string;
  readonly message: string;
  readonly runtime: RunnerStatus;
}

export interface RunnerClient {
  sources(): Promise<readonly TrustedSource[]>;
  latestRevision(sourceId: string): Promise<SourceRevision>;
  deploySource(sourceId: string, commit: string): Promise<SourceDeploymentResult>;
  status(appId: string): Promise<RunnerStatus>;
  logs(appId: string, tail: number): Promise<RunnerLogs>;
  stats(appId: string): Promise<RunnerStats>;
  execute(appId: string, action: RunnerAction, version?: string): Promise<RunnerActionResult>;
  configureEnvironment(
    appId: string,
    variables: readonly { readonly key: string; readonly value: string }[],
  ): Promise<RunnerActionResult>;
  rollback(appId: string, target: RunnerRollbackTarget): Promise<RunnerActionResult>;
}

export class RunnerRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

export class HttpRunnerClient implements RunnerClient {
  constructor(
    private readonly baseUrl: string,
    private readonly sharedSecret: string,
  ) {}

  private async request<T>(path: string, init?: RequestInit, timeoutMs = 5_000): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: "application/json",
        "x-runner-token": this.sharedSecret,
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    const body = await response.json().catch(() => null) as {
      data?: T;
      error?: string;
      message?: string;
    } | null;
    if (!response.ok || !body?.data) {
      throw new RunnerRequestError(
        body?.error || "runner_unavailable",
        body?.message || "Không nhận được phản hồi hợp lệ từ Deployment Runner.",
        response.status,
      );
    }
    return body.data;
  }

  status(appId: string): Promise<RunnerStatus> {
    return this.request<RunnerStatus>(`/v1/apps/${encodeURIComponent(appId)}`);
  }

  sources(): Promise<readonly TrustedSource[]> {
    return this.request<readonly TrustedSource[]>("/v1/sources");
  }

  latestRevision(sourceId: string): Promise<SourceRevision> {
    return this.request<SourceRevision>(
      `/v1/sources/${encodeURIComponent(sourceId)}/latest-revision`,
      undefined,
      15_000,
    );
  }

  deploySource(sourceId: string, commit: string): Promise<SourceDeploymentResult> {
    return this.request<SourceDeploymentResult>(
      `/v1/sources/${encodeURIComponent(sourceId)}/deployments`,
      { method: "POST", body: JSON.stringify({ commit }) },
      180_000,
    );
  }

  logs(appId: string, tail: number): Promise<RunnerLogs> {
    return this.request<RunnerLogs>(`/v1/apps/${encodeURIComponent(appId)}/logs?tail=${tail}`);
  }

  stats(appId: string): Promise<RunnerStats> {
    return this.request<RunnerStats>(`/v1/apps/${encodeURIComponent(appId)}/stats`);
  }

  execute(appId: string, action: RunnerAction, version?: string): Promise<RunnerActionResult> {
    return this.request<RunnerActionResult>(
      `/v1/apps/${encodeURIComponent(appId)}/actions`,
      { method: "POST", body: JSON.stringify({ action, ...(version ? { version } : {}) }) },
      45_000,
    );
  }

  configureEnvironment(
    appId: string,
    variables: readonly { readonly key: string; readonly value: string }[],
  ): Promise<RunnerActionResult> {
    return this.request<RunnerActionResult>(
      `/v1/apps/${encodeURIComponent(appId)}/environment`,
      { method: "PUT", body: JSON.stringify({ variables }) },
      45_000,
    );
  }

  rollback(appId: string, target: RunnerRollbackTarget): Promise<RunnerActionResult> {
    return this.request<RunnerActionResult>(
      `/v1/apps/${encodeURIComponent(appId)}/rollbacks`,
      { method: "POST", body: JSON.stringify(target) },
      45_000,
    );
  }
}
