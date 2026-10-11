import type { ApplicationsResponse, AuditResponse, UserSession } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new ApiError(
      body?.message || "Không thể kết nối với hệ thống.",
      response.status,
      body?.error || "request_failed",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  session: () => request<UserSession>("/api/v1/auth/session"),
  login: (username: string, password: string) => request<UserSession>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  }),
  logout: () => request<void>("/api/v1/auth/logout", { method: "POST" }),
  applications: () => request<ApplicationsResponse>("/api/v1/applications"),
  audit: () => request<AuditResponse>("/api/v1/audit-events?limit=12"),
};
