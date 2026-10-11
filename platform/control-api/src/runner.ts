export type RunnerAction = "start" | "stop" | "restart" | "update";
export type RunnerRuntimeStatus = "running" | "stopped" | "starting" | "unhealthy" | "unknown";

export interface RunnerStatus {
  readonly appId: string;
  readonly status: RunnerRuntimeStatus;
  readonly containerId: string;
  readonly containerName: string;
  readonly image: string;
  readonly observedVersion: string | null;
  readonly health: string | null;
  readonly startedAt: string | null;
}

export interface RunnerActionResult {
  readonly message: string;
  readonly runtime: RunnerStatus;
}

export interface RunnerClient {
  status(appId: string): Promise<RunnerStatus>;
  execute(appId: string, action: RunnerAction, version?: string): Promise<RunnerActionResult>;
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

  execute(appId: string, action: RunnerAction, version?: string): Promise<RunnerActionResult> {
    return this.request<RunnerActionResult>(
      `/v1/apps/${encodeURIComponent(appId)}/actions`,
      { method: "POST", body: JSON.stringify({ action, ...(version ? { version } : {}) }) },
      45_000,
    );
  }
}
