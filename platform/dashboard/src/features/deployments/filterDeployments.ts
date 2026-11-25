import type { DeploymentItem } from "../../types";

export type DeploymentFilter = "all" | "succeeded" | "failed" | "active";

// "active" gom queued + running; ứng dụng "" nghĩa là mọi ứng dụng.
export function filterDeployments(items: readonly DeploymentItem[], filter: DeploymentFilter, applicationId: string): DeploymentItem[] {
  return items.filter((item) => (applicationId === "" || item.applicationId === applicationId)
    && (filter === "all"
      || (filter === "active" ? item.status === "queued" || item.status === "running" : item.status === filter)));
}
