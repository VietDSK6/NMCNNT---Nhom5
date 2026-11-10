export interface ChartSeries {
  readonly key: string;
  readonly label: string;
  readonly color: string;
}

export const containerStatusSeries: readonly ChartSeries[] = [
  { key: "running", label: "Đang chạy", color: "var(--success)" },
  { key: "stopped", label: "Đã dừng", color: "var(--warning)" },
  { key: "attention", label: "Cần kiểm tra", color: "var(--danger)" },
];

// Màu cho từng đường (mỗi ứng dụng một màu), lặp lại khi nhiều ứng dụng hơn số màu.
export const lineColors: readonly string[] = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
