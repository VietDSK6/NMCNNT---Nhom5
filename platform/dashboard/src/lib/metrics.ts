import type { ApplicationItem } from "../types";

export interface StatusSlice {
  readonly key: "running" | "stopped" | "attention";
  readonly value: number;
}

export function containerStatusCounts(applications: readonly ApplicationItem[]): readonly StatusSlice[] {
  const counts = { running: 0, stopped: 0, attention: 0 };
  for (const application of applications) {
    const status = application.runtime.status;
    if (status === "running") counts.running += 1;
    else if (status === "stopped") counts.stopped += 1;
    else counts.attention += 1;
  }
  return [
    { key: "running", value: counts.running },
    { key: "stopped", value: counts.stopped },
    { key: "attention", value: counts.attention },
  ];
}
