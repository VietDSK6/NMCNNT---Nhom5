import type { ComponentType, SVGProps } from "react";
import { ActivityIcon, BoxIcon, ServerIcon, ShieldIcon } from "../../icons";
import type { ApplicationsResponse } from "../../types";

export type KpiTone = "sky" | "mint" | "amber" | "teal" | "rose";

export interface KpiDefinition {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly tone: KpiTone;
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly value: number | string;
  readonly suffix?: string;
}

export function buildKpis(applications: ApplicationsResponse | null): readonly KpiDefinition[] {
  const total = applications?.summary.total ?? 0;
  const running = applications?.summary.running ?? 0;
  const healthy = applications?.summary.healthy ?? 0;
  const gateway = !applications ? "Đang kiểm tra" : healthy === total ? "Ổn định" : "Cần kiểm tra";

  return [
    { id: "total", label: "Tổng ứng dụng", hint: "Đã đăng ký trong SQLite", tone: "sky", icon: BoxIcon, value: total },
    { id: "running", label: "Container đang chạy", hint: "Đọc từ Docker qua Runner", tone: "mint", icon: ServerIcon, value: running, suffix: `/${total}` },
    { id: "gateway", label: "Gateway", hint: "Health HTTP qua một cổng", tone: "teal", icon: ActivityIcon, value: gateway },
    { id: "boundary", label: "Ranh giới quyền", hint: "Socket chỉ gắn vào Runner", tone: "amber", icon: ShieldIcon, value: "Đã tách" },
  ];
}
