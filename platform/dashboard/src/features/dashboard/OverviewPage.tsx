import { useMemo } from "react";
import { DonutChartCard } from "../../components/charts/DonutChartCard";
import { LineChartCard } from "../../components/charts/LineChartCard";
import { useStoredHistory } from "../../hooks/useStoredHistory";
import { containerStatusCounts } from "../../lib/metrics";
import type { ApplicationsResponse, AuditEvent } from "../../types";
import { AuditFeed } from "./AuditFeed";
import { HeroBanner } from "./HeroBanner";
import { KpiGrid } from "./KpiGrid";
import { buildKpis } from "./kpis";
import { QuickAccess } from "./QuickAccess";

const historyNote = "Lưu trong cơ sở dữ liệu, lấy mẫu mỗi 15 giây";
const emptyHistoryText = "Chưa có mẫu nào được lưu. Số liệu xuất hiện sau khoảng một phút khi có container đang chạy.";
const ranges = [{ id: "1h", label: "1 giờ" }, { id: "24h", label: "24 giờ" }] as const;

export function OverviewPage({ username, applications, auditEvents }: {
  readonly username: string;
  readonly applications: ApplicationsResponse | null;
  readonly auditEvents: readonly AuditEvent[];
}) {
  const kpis = useMemo(() => buildKpis(applications), [applications]);
  const slices = useMemo(() => containerStatusCounts(applications?.data ?? []), [applications]);
  const history = useStoredHistory();
  const loading = applications === null || history.loading;
  const rangeTabs = (
    <div className="filter-tabs" role="group" aria-label="Khoảng thời gian">
      {ranges.map((item) => (
        <button key={item.id} type="button" aria-pressed={history.range === item.id} onClick={() => history.setRange(item.id)}>{item.label}</button>
      ))}
    </div>
  );

  return (
    <div className="overview">
      <HeroBanner username={username} />
      <KpiGrid kpis={kpis} />
      <div className="overview__split">
        <LineChartCard title="CPU theo thời gian" description={historyNote} unit="%" names={history.names} points={history.cpu} loading={loading} error={history.error} actions={rangeTabs} emptyText={emptyHistoryText} />
        <AuditFeed events={auditEvents} />
      </div>
      <div className="overview__trio">
        <QuickAccess />
        <DonutChartCard slices={slices} loading={applications === null} />
        <LineChartCard title="RAM theo thời gian" description={historyNote} unit="%" names={history.names} points={history.memory} loading={loading} error={history.error} emptyText={emptyHistoryText} />
      </div>
    </div>
  );
}
