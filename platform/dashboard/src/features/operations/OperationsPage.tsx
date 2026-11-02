import { useMemo, useState } from "react";
import { api } from "../../api";
import { ListToolbar } from "../../components/ui/ListToolbar";
import { usePolling } from "../../hooks/usePolling";
import { AlertIcon, CheckIcon, HistoryIcon, ServerIcon } from "../../icons";
import { operationActionLabels } from "../../shared/labels";
import type { OperationItem } from "../../types";
import { KpiGrid } from "../dashboard/KpiGrid";
import type { KpiDefinition } from "../dashboard/kpis";
import { ListError } from "../../components/ui/ListError";
import { OperationsTable } from "./OperationsTable";

type FilterId = "all" | "succeeded" | "failed" | "active";

const filters: readonly { readonly id: FilterId; readonly label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "succeeded", label: "Thành công" },
  { id: "failed", label: "Thất bại" },
  { id: "active", label: "Đang xử lý" },
];

function matchesFilter(operation: OperationItem, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "active") return operation.status === "queued" || operation.status === "running";
  return operation.status === filter;
}

const listLimit = 100;
const pollMilliseconds = 5_000;
const emptyList: readonly OperationItem[] = [];

export function OperationsPage() {
  const list = usePolling((signal) => api.operations(listLimit, { signal }), pollMilliseconds);
  const operations = list.data?.data ?? emptyList;
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const count = (id: FilterId) => operations.filter((operation) => matchesFilter(operation, id)).length;

  const kpis = useMemo<readonly KpiDefinition[]>(() => [
    { id: "total", label: "Tổng thao tác", hint: "Gần đây nhất", tone: "sky", icon: ServerIcon, value: operations.length },
    { id: "succeeded", label: "Thành công", hint: "Đã hoàn tất", tone: "mint", icon: CheckIcon, value: operations.filter((item) => item.status === "succeeded").length },
    { id: "failed", label: "Thất bại", hint: "Cần xem kết quả", tone: "rose", icon: AlertIcon, value: operations.filter((item) => item.status === "failed").length },
    { id: "active", label: "Đang xử lý", hint: "Chờ hoặc đang chạy", tone: "amber", icon: HistoryIcon, value: operations.filter((item) => item.status === "queued" || item.status === "running").length },
  ], [operations]);

  const needle = query.trim().toLowerCase();
  const visible = operations.filter((operation) => matchesFilter(operation, filter)
    && `${operation.applicationName} ${operationActionLabels[operation.action]} ${operation.message ?? ""}`.toLowerCase().includes(needle));

  return (
    <div className="list-page">
      <KpiGrid kpis={kpis} />
      <ListToolbar
        filters={filters.map((item) => ({ ...item, count: count(item.id) }))}
        active={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
        placeholder="Tìm theo ứng dụng, thao tác…"
        total={visible.length}
        refreshing={list.refreshing}
        onRefresh={list.reload}
      />
      {list.error && !list.data ? <ListError message={list.error} onRetry={list.reload} /> : <OperationsTable operations={visible} />}
    </div>
  );
}
