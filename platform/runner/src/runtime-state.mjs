export const ENVIRONMENT_KEYS_LABEL = "io.mini-paas.environment-keys";

export function envValue(environment, key) {
  const prefix = `${key}=`;
  return environment?.find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? null;
}

export function replaceEnv(environment = [], key, value) {
  const prefix = `${key}=`;
  return [...environment.filter((item) => !item.startsWith(prefix)), `${key}=${value}`];
}

function environmentKey(item) {
  const index = item.indexOf("=");
  return index === -1 ? item : item.slice(0, index);
}

export function managedEnvironmentKeys(labels = {}) {
  const value = labels?.[ENVIRONMENT_KEYS_LABEL];
  if (typeof value !== "string" || value === "") return [];
  return value.split(",").filter((key) => /^[A-Z][A-Z0-9_]{0,63}$/.test(key));
}

export function replaceManagedEnvironment(environment = [], previousKeys, variables) {
  const managed = new Set([...previousKeys, ...variables.map((variable) => variable.key)]);
  return [
    ...environment.filter((item) => !managed.has(environmentKey(item))),
    ...variables.map((variable) => `${variable.key}=${variable.value}`),
  ];
}

export function runtimeStatus(inspect) {
  if (inspect.State?.Restarting) return "starting";
  if (!inspect.State?.Running) return "stopped";
  const health = inspect.State?.Health?.Status;
  if (health === "starting") return "starting";
  if (health === "unhealthy") return "unhealthy";
  return "running";
}

export function publicStatus(appId, inspect) {
  return {
    appId,
    status: runtimeStatus(inspect),
    containerId: String(inspect.Id).slice(0, 12),
    containerName: String(inspect.Name || "").replace(/^\//, ""),
    image: String(inspect.Config?.Image || ""),
    imageId: String(inspect.Image || ""),
    observedVersion: envValue(inspect.Config?.Env, "APP_VERSION"),
    health: inspect.State?.Health?.Status ?? null,
    startedAt: inspect.State?.StartedAt || null,
    environmentVariableCount: managedEnvironmentKeys(inspect.Config?.Labels).length,
  };
}
