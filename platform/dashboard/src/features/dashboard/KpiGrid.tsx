import { motion } from "motion/react";
import { staggerContainer } from "../../motion/variants";
import { KpiCard } from "./KpiCard";
import type { KpiDefinition } from "./kpis";

export function KpiGrid({ kpis }: { readonly kpis: readonly KpiDefinition[] }) {
  return (
    <motion.section className="metrics-grid" aria-label="Chỉ số tổng quan" variants={staggerContainer()} initial="hidden" animate="visible">
      {kpis.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
    </motion.section>
  );
}
