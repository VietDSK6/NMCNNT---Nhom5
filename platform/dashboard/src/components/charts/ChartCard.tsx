import type { ReactNode } from "react";
import { AlertIcon, ActivityIcon } from "../../icons";
import { useInView } from "../../hooks/useInView";
import { ErrorBoundary } from "../ui/ErrorBoundary";

export interface ChartDataTable {
  readonly caption: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly (string | number)[])[];
}

// Khung dùng chung: tiêu đề, trạng thái loading/empty/error và bảng dữ liệu thay thế cho trình đọc màn hình.
export function ChartCard({ title, description, summary, actions, loading, error, empty, emptyText, table, onRetry, className, children }: {
  readonly title: string;
  readonly description: string;
  readonly summary: string;
  readonly actions?: ReactNode;
  readonly loading: boolean;
  readonly error?: string;
  readonly empty: boolean;
  readonly emptyText: string;
  readonly table: ChartDataTable;
  readonly onRetry?: () => void;
  readonly className?: string;
  readonly children: (inView: boolean) => ReactNode;
}) {
  const { ref, inView } = useInView<HTMLElement>();

  let body: ReactNode;
  if (loading) body = <div className="chart-card__skeleton" aria-label="Đang tải biểu đồ" />;
  else if (error) {
    body = (
      <div className="inline-state inline-state--error" role="status">
        <AlertIcon /><span><strong>Chưa lấy được dữ liệu</strong>{error}</span>
        {onRetry && <button className="button button--secondary" onClick={onRetry}>Thử lại</button>}
      </div>
    );
  } else if (empty) body = <div className="panel-empty"><ActivityIcon /><div><strong>Chưa có dữ liệu</strong><span>{emptyText}</span></div></div>;
  else {
    body = (
      <>
        <div className="chart-card__plot" role="img" aria-label={summary}>{children(inView)}</div>
        <div className="sr-only">
        <table>
          <caption>{table.caption}</caption>
          <thead><tr>{table.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{table.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
        </table>
        </div>
      </>
    );
  }

  return (
    <section className={`chart-card card ${className ?? ""}`} ref={ref} aria-label={title}>
      <div className="chart-card__heading">
        <div><h2>{title}</h2><p>{description}</p></div>
        {actions}
      </div>
      <ErrorBoundary message={`Biểu đồ "${title}" gặp lỗi hiển thị.`}>{body}</ErrorBoundary>
    </section>
  );
}

export function ChartLegend({ items }: { readonly items: readonly { readonly label: string; readonly color: string; readonly value?: number }[] }) {
  return (
    <ul className="chart-legend">
      {items.map((item) => (
        <li key={item.label}><i style={{ background: item.color }} />{item.label}{item.value !== undefined && <strong>{item.value}</strong>}</li>
      ))}
    </ul>
  );
}

export const chartTooltipStyle = {
  background: "var(--surface-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--text-strong)",
  boxShadow: "var(--shadow-card)",
} as const;
