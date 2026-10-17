export function hardenedHostConfig(network) {
  return {
    NetworkMode: network,
    RestartPolicy: { Name: "unless-stopped", MaximumRetryCount: 0 },
    ReadonlyRootfs: true,
    Tmpfs: { "/tmp": "size=16m,noexec,nosuid" },
    CapDrop: ["ALL"],
    SecurityOpt: ["no-new-privileges:true"],
    NanoCpus: 350_000_000,
    Memory: 134_217_728,
    PidsLimit: 100,
    LogConfig: { Type: "json-file", Config: { "max-size": "5m", "max-file": "2" } },
    Init: true,
  };
}
