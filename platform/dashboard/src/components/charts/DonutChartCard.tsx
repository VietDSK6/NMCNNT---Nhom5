import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { containerStatusSeries } from "../../config/chartSeries";
import type { StatusSlice } from "../../lib/metrics";
import { ChartCard, ChartLegend, chartTooltipStyle } from "./ChartCard";

export function DonutChartCard({ slices, loading }: { readonly slices: readonly StatusSlice[]; readonly loading: boolean }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const data = containerStatusSeries.map((series) => ({
    ...series,
    value: slices.find((slice) => slice.key === series.key)?.value ?? 0,
  }));
  const summary = `Trạng thái container: ${data.map((item) => `${item.value} ${item.label.toLowerCase()}`).join(", ")}.`;

  return (
    <ChartCard
      title="Trạng thái container"
      description="Theo trạng thái Docker hiện tại"
      summary={summary}
      loading={loading}
      empty={total === 0}
      emptyText="Chưa có ứng dụng nào được đăng ký."
      table={{ caption: "Trạng thái container", headers: ["Trạng thái", "Số ứng dụng"], rows: data.map((item) => [item.label, item.value]) }}
    >
      {(inView) => (
        <div className="donut">
          <div className="donut__chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={inView ? data.filter((item) => item.value > 0) : []} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="92%" paddingAngle={3} cornerRadius={8} stroke="none" startAngle={90} endAngle={-270} animationDuration={900}>
                  {data.filter((item) => item.value > 0).map((item) => <Cell key={item.key} fill={item.color} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut__total"><strong>{total}</strong><span>ứng dụng</span></div>
          </div>
          <ChartLegend items={data} />
        </div>
      )}
    </ChartCard>
  );
}
