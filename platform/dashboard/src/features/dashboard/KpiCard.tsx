import { motion } from "motion/react";
import { useCountUp } from "../../hooks/useCountUp";
import { useInView } from "../../hooks/useInView";
import { fadeUp } from "../../motion/variants";
import type { KpiDefinition } from "./kpis";

export function KpiCard({ kpi }: { readonly kpi: KpiDefinition }) {
  const { ref, inView } = useInView<HTMLElement>();
  const numeric = typeof kpi.value === "number";
  const counted = useCountUp(numeric ? kpi.value : 0, inView);
  const Icon = kpi.icon;

  return (
    <motion.article ref={ref} className={`kpi-card kpi-card--${kpi.tone}`} variants={fadeUp}>
      <span className="kpi-card__icon"><Icon /></span>
      <div className="kpi-card__body">
        <small>{kpi.label}</small>
        <strong>{numeric ? `${counted}${kpi.suffix ?? ""}` : kpi.value}</strong>
        <span>{kpi.hint}</span>
      </div>
    </motion.article>
  );
}
