import type { ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { lineColors } from "../../config/chartSeries";
import type { ResourcePoint } from "../../hooks/useResourceHistory";
import { ChartCard, ChartLegend, chartTooltipStyle } from "./ChartCard";

const minimumPoints = 2;

export function LineChartCard({ title, description, unit, names, points, loading, error, actions, emptyText }: {
  readonly title: string;
  readonly description: string;
  readonly unit: string;
  readonly names: readonly string[];
  readonly points: readonly ResourcePoint[];
  readonly loading: boolean;
  readonly error: string;
  readonly actions?: ReactNode;
  readonly emptyText?: string;
}) {
  const series = names.map((name, index) => ({ key: name, label: name, color: lineColors[index % lineColors.length] ?? "var(--accent-1)" }));
  return (
    <ChartCard
      title={title}
      description={description}
      summary={`${title}: ${points.length} mẫu gần nhất của ${names.join(", ")}.`}
      loading={loading}
      error={error}
      empty={points.length < minimumPoints}
      emptyText={emptyText ?? "Đang thu thập số liệu, đường biểu diễn xuất hiện sau vài giây."}
      actions={actions}
      table={{ caption: title, headers: ["Thời điểm", ...names], rows: points.map((point) => [point.time, ...names.map((name) => point[name] ?? "")]) }}
    >
      {() => (
        <>
          <div className="bar-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...points]} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={48} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis unit={unit} tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                {series.map((item) => (
                  <Line key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={3} strokeLinecap="round" dot={false} activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend items={series} />
        </>
      )}
    </ChartCard>
  );
}
