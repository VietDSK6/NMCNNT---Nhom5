import { useMemo, useState } from "react";
import { api } from "../../api";
import { ListError } from "../../components/ui/ListError";
import { ListToolbar } from "../../components/ui/ListToolbar";
import { usePolling } from "../../hooks/usePolling";
import { AlertIcon, CheckIcon, HistoryIcon, ShieldIcon } from "../../icons";
import { actionLabels } from "../../shared/labels";
import type { AuditEvent } from "../../types";
import { KpiGrid } from "../dashboard/KpiGrid";
import type { KpiDefinition } from "../dashboard/kpis";
import { AuditTable } from "./AuditTable";

type FilterId = "all" | "succeeded" | "failed";

const filters: readonly { readonly id: FilterId; readonly label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "succeeded", label: "Thành công" },
  { id: "failed", label: "Thất bại" },
];

const listLimit = 100;
const pollMilliseconds = 5_000;
const emptyList: readonly AuditEvent[] = [];

export function AuditPage() {
  const list = usePolling((signal) => api.audit(listLimit, { signal }), pollMilliseconds);
  const events = list.data?.data ?? emptyList;
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const count = (id: FilterId) => (id === "all" ? events.length : events.filter((event) => event.outcome === id).length);

  const kpis = useMemo<readonly KpiDefinition[]>(() => [
    { id: "total", label: "Tổng sự kiện", hint: "Gần đây nhất", tone: "sky", icon: HistoryIcon, value: events.length },
    { id: "succeeded", label: "Thành công", hint: "Thao tác hợp lệ", tone: "mint", icon: CheckIcon, value: events.filter((event) => event.outcome === "succeeded").length },
    { id: "failed", label: "Thất bại", hint: "Bị từ chối hoặc lỗi", tone: "rose", icon: AlertIcon, value: events.filter((event) => event.outcome === "failed").length },
    { id: "login", label: "Lượt đăng nhập", hint: "Ghi nhận trong nhật ký", tone: "teal", icon: ShieldIcon, value: events.filter((event) => event.action === "auth.login").length },
  ], [events]);

  const needle = query.trim().toLowerCase();
  const visible = events.filter((event) => (filter === "all" || event.outcome === filter)
    && `${actionLabels[event.action] ?? event.action} ${event.actorUsername ?? ""} ${event.ipAddress ?? ""}`.toLowerCase().includes(needle));

  return (
    <div className="list-page">
      <KpiGrid kpis={kpis} />
      <ListToolbar
        filters={filters.map((item) => ({ ...item, count: count(item.id) }))}
        active={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
        placeholder="Tìm theo thao tác, người dùng, IP…"
        total={visible.length}
        refreshing={list.refreshing}
        onRefresh={list.reload}
      />
      {list.error && !list.data ? <ListError message={list.error} onRetry={list.reload} /> : <AuditTable events={visible} />}
    </div>
  );
}
