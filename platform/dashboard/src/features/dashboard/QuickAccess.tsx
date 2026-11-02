import { AppLink } from "../../app/routing";
import { navigation } from "../../config/navigation";
import type { KpiTone } from "./kpis";

const quickAccessIds = ["applications", "deployments", "operations", "observability", "audit", "grafana"] as const;
const tones: readonly KpiTone[] = ["sky", "mint", "amber", "teal"];
const items = navigation.flatMap((group) => group.items).filter((item) => (quickAccessIds as readonly string[]).includes(item.id));

export function QuickAccess() {
  return (
    <section className="card" aria-label="Truy cập nhanh">
      <div className="card__head"><h2>Truy cập nhanh</h2></div>
      <div className="card__body quick-access">
        {items.map((item, index) => {
          const Icon = item.icon;
          const tone = tones[index % tones.length];
          const inner = <><span className={`quick-access__icon kpi-card--${tone}`}><Icon /></span>{item.label}</>;
          return item.external
            ? <a key={item.id} href={item.to} target="_blank" rel="noreferrer">{inner}</a>
            : <AppLink key={item.id} to={item.to}>{inner}</AppLink>;
        })}
      </div>
    </section>
  );
}
