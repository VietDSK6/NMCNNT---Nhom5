import { useState } from "react";
import { AppLink } from "../../app/routing";
import { ListToolbar } from "../../components/ui/ListToolbar";
import { TableCard } from "../../components/ui/TableCard";
import { BoxIcon, ExternalIcon } from "../../icons";
import { formatTime } from "../../shared/format";
import type { ApplicationItem, ApplicationsResponse } from "../../types";
import { KpiGrid } from "../dashboard/KpiGrid";
import { RuntimeBadge, StatusBadge } from "./StatusBadges";
import { useUsageKpis } from "./usageKpis";

type FilterId = "all" | "running" | "stopped" | "attention";

const filters: readonly { readonly id: FilterId; readonly label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "running", label: "Đang chạy" },
  { id: "stopped", label: "Tạm dừng" },
  { id: "attention", label: "Lỗi" },
];

function matchesFilter(application: ApplicationItem, filter: FilterId): boolean {
  const status = application.runtime.status;
  if (filter === "all") return true;
  if (filter === "running") return status === "running";
  if (filter === "stopped") return status === "stopped";
  return status !== "running" && status !== "stopped";
}

export function ApplicationsPage({ applications, refreshing, onRefresh }: {
  readonly applications: ApplicationsResponse | null;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const { items, kpis, cpuNow, memoryNow } = useUsageKpis(applications);
  const needle = query.trim().toLowerCase();
  const visible = items.filter((item) => matchesFilter(item, filter)
    && `${item.name} ${item.slug} ${item.route} ${item.description}`.toLowerCase().includes(needle));

  if (!applications) return <div className="skeleton-list"><i /><i /></div>;

  return (
    <div className="list-page">
      <KpiGrid kpis={kpis} />
      <ListToolbar
        filters={filters.map((item) => ({ ...item, count: items.filter((application) => matchesFilter(application, item.id)).length }))}
        active={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
        placeholder="Tìm theo tên, route…"
        total={visible.length}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
      <TableCard footer={`Tổng số: ${visible.length} ứng dụng`}>
        <table>
          <thead><tr><th>Tên ứng dụng</th><th>Phiên bản</th><th>Đường dẫn</th><th>Trạng thái</th><th>Tài nguyên</th><th>Cập nhật</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={7} className="empty-cell">Không có ứng dụng phù hợp bộ lọc.</td></tr>
            ) : visible.map((application) => {
              const cpu = cpuNow[application.name];
              const memory = memoryNow[application.name];
              return (
                <tr key={application.id}>
                  <td>
                    <div className="app-cell">
                      <span className="app-icon"><BoxIcon /></span>
                      <div>
                        <AppLink to={`/applications/${application.id}`}><strong>{application.name}</strong></AppLink>
                        <small>{application.description}</small>
                      </div>
                    </div>
                  </td>
                  <td className="mono">{application.observedVersion || application.runtime.observedVersion || "—"}</td>
                  <td><a className="route-link mono" href={application.route} target="_blank" rel="noreferrer">{application.route}<ExternalIcon /></a></td>
                  <td><div className="status-column"><RuntimeBadge status={application.runtime.status} /><StatusBadge status={application.health.status} /></div></td>
                  <td>
                    {typeof cpu === "number" && typeof memory === "number" ? (
                      <div className="usage">
                        <span>{cpu}% CPU · {memory}% RAM</span>
                        <i><b style={{ width: `${Math.min(memory, 100)}%` }} /></i>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="mono">{formatTime(application.health.checkedAt)}</td>
                  <td><AppLink className="button button--secondary" to={`/applications/${application.id}`}>Chi tiết</AppLink></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
