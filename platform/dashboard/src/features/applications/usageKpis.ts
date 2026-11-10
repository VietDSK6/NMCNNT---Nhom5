import { useMemo } from "react";
import { type ResourcePoint, useResourceHistory } from "../../hooks/useResourceHistory";
import { ActivityIcon, BoxIcon, ServerIcon } from "../../icons";
import type { ApplicationItem, ApplicationsResponse } from "../../types";
import type { KpiDefinition } from "../dashboard/kpis";

type UsageRecord = Readonly<Record<string, number | string>>;

export function latestPoint(points: readonly ResourcePoint[]): UsageRecord {
  return points[points.length - 1] ?? {};
}

export function formatPercent(value: number | string | undefined): string {
  return typeof value === "number" ? `${value}%` : "—";
}

function average(names: readonly string[], record: UsageRecord): string {
  const values = names.flatMap((name) => (typeof record[name] === "number" ? [record[name] as number] : []));
  if (values.length === 0) return "—";
  return `${(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)}%`;
}

// Bốn thẻ thống kê dùng chung cho trang Ứng dụng và Log và tài nguyên.
export function useUsageKpis(applications: ApplicationsResponse | null) {
  const items = useMemo<readonly ApplicationItem[]>(() => applications?.data ?? [], [applications]);
  const history = useResourceHistory(items);
  const cpuNow = latestPoint(history.cpu);
  const memoryNow = latestPoint(history.memory);

  const kpis = useMemo<readonly KpiDefinition[]>(() => {
    const total = items.length;
    const running = items.filter((item) => item.runtime.status === "running").length;
    return [
      { id: "total", label: "Tổng ứng dụng", hint: "Đã đăng ký trong SQLite", tone: "sky", icon: BoxIcon, value: total },
      { id: "running", label: "Container đang chạy", hint: total ? `${Math.round((running / total) * 100)}% tổng số ứng dụng` : "Chưa có ứng dụng", tone: "mint", icon: ServerIcon, value: running, suffix: `/${total}` },
      { id: "cpu", label: "CPU trung bình", hint: "Các container đang chạy", tone: "teal", icon: ActivityIcon, value: average(history.names, cpuNow) },
      { id: "memory", label: "RAM trung bình", hint: "So với giới hạn container", tone: "amber", icon: ServerIcon, value: average(history.names, memoryNow) },
    ];
  }, [items, history.names, cpuNow, memoryNow]);

  return { items, kpis, cpuNow, memoryNow };
}
