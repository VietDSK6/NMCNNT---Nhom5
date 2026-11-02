import { DeployIcon, GitIcon, HistoryIcon, ServerIcon } from "../../icons";
import { deploymentStatusLabels } from "../../shared/labels";
import type { DeploymentItem, TrustedSource } from "../../types";
import { KpiGrid } from "../dashboard/KpiGrid";
import type { KpiDefinition } from "../dashboard/kpis";

export function GitSummary({ sources, deployments }: { readonly sources: readonly TrustedSource[]; readonly deployments: readonly DeploymentItem[] }) {
  const latest = deployments[0];
  const kpis: readonly KpiDefinition[] = [
    { id: "sources", label: "Kho mã kết nối", hint: "Được Runner cho phép", tone: "sky", icon: GitIcon, value: sources.length, suffix: " kho" },
    { id: "branch", label: "Nhánh theo dõi", hint: "Nhánh mặc định của source", tone: "teal", icon: DeployIcon, value: sources[0]?.defaultBranch ?? "—" },
    { id: "commit", label: "Commit gần nhất", hint: "Lần triển khai mới nhất", tone: "mint", icon: HistoryIcon, value: latest ? latest.commitSha.slice(0, 7) : "—" },
    { id: "status", label: "Trạng thái gần nhất", hint: latest ? latest.applicationName : "Chưa có deployment", tone: "amber", icon: ServerIcon, value: latest ? deploymentStatusLabels[latest.status] : "—" },
  ];
  return <KpiGrid kpis={kpis} />;
}
