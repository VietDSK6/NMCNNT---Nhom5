import type { ApplicationRecord } from "./database.js";

export interface ApplicationHealth {
  readonly status: "healthy" | "unhealthy" | "unknown";
  readonly checkedAt: string;
  readonly latencyMs: number;
  readonly httpStatus: number | null;
  readonly message: string;
  readonly observedVersion: string | null;
}

async function requestJson(url: string, signal: AbortSignal): Promise<{ status: number; ok: boolean; body: unknown }> {
  const response = await fetch(url, {
    signal,
    headers: { accept: "application/json" },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, body };
}

export async function inspectApplication(
  application: ApplicationRecord,
  gatewayBaseUrl: string,
): Promise<ApplicationHealth> {
  const startedAt = performance.now();
  const checkedAt = new Date().toISOString();
  const baseUrl = application.kind === "git"
    ? `http://service-${application.slug}:${application.internalPort}/`
    : `${gatewayBaseUrl}${application.routePath}`;

  try {
    const [health, version] = await Promise.all([
      requestJson(new URL(application.healthPath.replace(/^\//, ""), baseUrl).toString(), AbortSignal.timeout(1_500)),
      requestJson(new URL(application.versionPath.replace(/^\//, ""), baseUrl).toString(), AbortSignal.timeout(1_500)),
    ]);
    const versionBody = version.body as { version?: unknown } | null;
    return {
      status: health.ok ? "healthy" : "unhealthy",
      checkedAt,
      latencyMs: Math.round(performance.now() - startedAt),
      httpStatus: health.status,
      message: health.ok ? "Endpoint HTTP phản hồi bình thường." : `Health endpoint trả về HTTP ${health.status}.`,
      observedVersion: typeof versionBody?.version === "string" ? versionBody.version : null,
    };
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Quá thời gian chờ health endpoint."
      : "Không kết nối được tới ứng dụng qua Gateway.";
    return {
      status: "unknown",
      checkedAt,
      latencyMs: Math.round(performance.now() - startedAt),
      httpStatus: null,
      message,
      observedVersion: null,
    };
  }
}
