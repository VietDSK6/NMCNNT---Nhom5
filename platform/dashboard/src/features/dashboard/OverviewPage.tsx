import { useMemo } from "react";
import { DonutChartCard } from "../../components/charts/DonutChartCard";
import { LineChartCard } from "../../components/charts/LineChartCard";
import { useResourceHistory } from "../../hooks/useResourceHistory";
import { containerStatusCounts } from "../../lib/metrics";
import type { ApplicationsResponse, AuditEvent } from "../../types";
import { AuditFeed } from "./AuditFeed";
import { HeroBanner } from "./HeroBanner";
import { KpiGrid } from "./KpiGrid";
import { buildKpis } from "./kpis";
import { QuickAccess } from "./QuickAccess";

const historyNote = "Lấy mẫu mỗi 5 giây từ lúc mở trang";

export function OverviewPage({ username, applications, auditEvents }: {
  readonly username: string;
  readonly applications: ApplicationsResponse | null;
  readonly auditEvents: readonly AuditEvent[];
}) {
  const kpis = useMemo(() => buildKpis(applications), [applications]);
  const slices = useMemo(() => containerStatusCounts(applications?.data ?? []), [applications]);
  const history = useResourceHistory(applications?.data ?? []);
  const loading = applications === null || history.loading;

  return (
    <div className="overview">
      <HeroBanner username={username} />
      <KpiGrid kpis={kpis} />
      <div className="overview__split">
        <LineChartCard title="CPU theo thời gian" description={historyNote} unit="%" names={history.names} points={history.cpu} loading={loading} error={history.error} />
        <AuditFeed events={auditEvents} />
      </div>
      <div className="overview__trio">
        <QuickAccess />
        <DonutChartCard slices={slices} loading={applications === null} />
        <LineChartCard title="RAM theo thời gian" description={historyNote} unit="%" names={history.names} points={history.memory} loading={loading} error={history.error} />
      </div>
    </div>
  );
}
