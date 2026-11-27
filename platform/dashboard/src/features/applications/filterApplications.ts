import type { ApplicationItem } from "../../types";

export type FilterId = "all" | "running" | "stopped" | "attention";

export function matchesFilter(application: ApplicationItem, filter: FilterId): boolean {
  const status = application.runtime.status;
  if (filter === "all") return true;
  if (filter === "running") return status === "running";
  if (filter === "stopped") return status === "stopped";
  return status !== "running" && status !== "stopped";
}

// Tìm theo tên, slug, route, mô tả và URL repository; không phân biệt hoa/thường.
export function filterApplications(items: readonly ApplicationItem[], filter: FilterId, query: string): ApplicationItem[] {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => matchesFilter(item, filter)
    && `${item.name} ${item.slug} ${item.route} ${item.description} ${item.repositoryUrl ?? ""}`.toLowerCase().includes(needle));
}
