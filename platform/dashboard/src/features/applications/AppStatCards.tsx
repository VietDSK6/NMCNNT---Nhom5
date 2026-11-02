import { useMemo } from "react";
import { useResourceHistory } from "../../hooks/useResourceHistory";
import { ActivityIcon, BoxIcon, ServerIcon, ShieldIcon } from "../../icons";
import type { ApplicationItem } from "../../types";
import { KpiGrid } from "../dashboard/KpiGrid";
import type { KpiDefinition } from "../dashboard/kpis";
import { runtimeLabels } from "./StatusBadges";
import { formatPercent, latestPoint } from "./usageKpis";

// Bốn thẻ trạng thái nhanh của một ứng dụng, đặt trên tab Tổng quan.
export function AppStatCards({ application }: { readonly application: ApplicationItem }) {
  const items = useMemo(() => [application], [application]);
  const history = useResourceHistory(items);
  const cpu = latestPoint(history.cpu)[application.name];
  const memory = latestPoint(history.memory)[application.name];
  const status = application.runtime.status;

  const kpis: readonly KpiDefinition[] = [
    { id: "version", label: "Phiên bản đang chạy", hint: `Mong muốn: ${application.desiredVersion}`, tone: "sky", icon: BoxIcon, value: application.observedVersion || application.runtime.observedVersion || "—" },
    { id: "status", label: "Trạng thái container", hint: application.runtime.containerName ?? "Chưa đọc được", tone: status === "running" ? "mint" : "rose", icon: ShieldIcon, value: runtimeLabels[status] },
    { id: "cpu", label: "CPU", hint: "Mẫu gần nhất", tone: "teal", icon: ActivityIcon, value: formatPercent(cpu) },
    { id: "memory", label: "RAM", hint: "So với giới hạn container", tone: "amber", icon: ServerIcon, value: formatPercent(memory) },
  ];
  return <KpiGrid kpis={kpis} />;
}
