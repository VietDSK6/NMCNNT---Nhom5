import type { ApplicationsResponse } from "../../types";
import { useUsageKpis } from "../applications/usageKpis";
import { KpiGrid } from "../dashboard/KpiGrid";

export function UsageSummary({ applications }: { readonly applications: ApplicationsResponse | null }) {
  const { kpis } = useUsageKpis(applications);
  return <KpiGrid kpis={kpis} />;
}
