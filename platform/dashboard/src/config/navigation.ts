import type { ComponentType, SVGProps } from "react";
import { ActivityIcon, BoxIcon, ChartIcon, DeployIcon, GridIcon, HistoryIcon, ServerIcon } from "../icons";

export const grafanaUrl = "/monitoring/d/mini-paas-overview/mini-paas-tai-nguyen-ung-dung";

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly to: string;
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly matchPrefix?: boolean;
  readonly external?: boolean;
  readonly showCount?: boolean;
  readonly inBottomNav?: boolean;
}

export interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
}

export const navigation: readonly NavGroup[] = [
  {
    label: "VẬN HÀNH",
    items: [
      { id: "overview", label: "Tổng quan", to: "/", icon: GridIcon, inBottomNav: true },
      { id: "applications", label: "Ứng dụng", to: "/applications", icon: BoxIcon, matchPrefix: true, showCount: true, inBottomNav: true },
      { id: "deployments", label: "Triển khai Git", to: "/deployments", icon: DeployIcon, inBottomNav: true },
      { id: "operations", label: "Thao tác", to: "/operations", icon: ServerIcon, inBottomNav: true },
      { id: "audit", label: "Kiểm toán", to: "/audit", icon: HistoryIcon },
    ],
  },
  {
    label: "QUAN SÁT",
    items: [
      { id: "observability", label: "Log và tài nguyên", to: "/observability", icon: ActivityIcon, inBottomNav: true },
      { id: "grafana", label: "Đồ thị lịch sử", to: grafanaUrl, icon: ChartIcon, external: true },
    ],
  },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.external) return false;
  return item.matchPrefix ? pathname.startsWith(item.to) : pathname === item.to;
}
