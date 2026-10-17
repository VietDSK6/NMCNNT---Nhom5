import type { ApplicationItem } from "../../types";

export function StatusBadge({ status }: { readonly status: ApplicationItem["health"]["status"] }) {
  const label = status === "healthy" ? "HTTP ổn định" : status === "unhealthy" ? "HTTP có lỗi" : "HTTP chưa rõ";
  return <span className={`status status--${status}`}><i />{label}</span>;
}

export function RuntimeBadge({ status }: { readonly status: ApplicationItem["runtime"]["status"] }) {
  const labels = {
    running: "Container chạy",
    stopped: "Container dừng",
    starting: "Đang khởi động",
    unhealthy: "Container có lỗi",
    unknown: "Chưa đọc được",
  } as const;
  const tone = status === "running" ? "healthy" : status === "stopped" || status === "unhealthy" ? "unhealthy" : "unknown";
  return <span className={`status status--${tone}`}><i />{labels[status]}</span>;
}
