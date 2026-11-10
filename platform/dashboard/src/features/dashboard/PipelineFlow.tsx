import { useReducedMotion } from "motion/react";
import { ChevronIcon } from "../../icons";

const stages = [
  { label: "Git commit", hint: "Commit tin cậy trên nhánh main" },
  { label: "Runner", hint: "Build image và tạo container" },
  { label: "Container", hint: "Web Service chạy với giới hạn cố định" },
  { label: "Metrics", hint: "Prometheus thu thập, Grafana hiển thị" },
] as const;

export function PipelineFlow() {
  const reduced = useReducedMotion() ?? false;
  return (
    <ol className="pipeline-flow" aria-label="Luồng hệ thống">
      {stages.map((stage, index) => (
        <li key={stage.label} className="pipeline-flow__stage glass-subtle" title={stage.hint}>
          {stage.label}
          {index < stages.length - 1 && <ChevronIcon aria-hidden="true" />}
          {index < stages.length - 1 && !reduced && <i className="pipeline-flow__dot" style={{ animationDelay: `${index * 0.6}s` }} />}
        </li>
      ))}
    </ol>
  );
}
