export interface AppConfig {
  readonly host: string;
  readonly port: number;
  readonly databasePath: string;
  readonly adminUsername: string;
  readonly adminPassword: string;
  readonly sessionTtlSeconds: number;
  readonly sessionCookieName: string;
  readonly sessionCookieSecure: boolean;
  readonly publicOrigin: string;
  readonly gatewayBaseUrl: string;
  readonly appAVersion: string;
  readonly appBVersion: string;
}

function integerFromEnv(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} phải là số nguyên dương.`);
  }
  return parsed;
}

function booleanFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("SESSION_COOKIE_SECURE chỉ nhận true hoặc false.");
}

function requiredSecret(env: NodeJS.ProcessEnv): string {
  const value = env.ADMIN_PASSWORD;
  if (!value || value.length < 12 || value.length > 256 || value.startsWith("CHANGE_ME")) {
    throw new Error("ADMIN_PASSWORD phải có từ 12 đến 256 ký tự.");
  }
  return value;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = integerFromEnv(env.PORT, 3000, "PORT");
  const sessionTtlSeconds = integerFromEnv(
    env.SESSION_TTL_SECONDS,
    28_800,
    "SESSION_TTL_SECONDS",
  );

  return {
    host: env.HOST || "0.0.0.0",
    port,
    databasePath: env.DATABASE_PATH || "/data/control.db",
    adminUsername: env.ADMIN_USERNAME || "admin",
    adminPassword: requiredSecret(env),
    sessionTtlSeconds,
    sessionCookieName: "mini_paas_session",
    sessionCookieSecure: booleanFromEnv(env.SESSION_COOKIE_SECURE, false),
    publicOrigin: env.PUBLIC_ORIGIN || "http://127.0.0.1:8080",
    gatewayBaseUrl: (env.GATEWAY_BASE_URL || "http://gateway:8080").replace(/\/$/, ""),
    appAVersion: env.APP_A_VERSION || "v1.0.0",
    appBVersion: env.APP_B_VERSION || "v1.0.0",
  };
}
