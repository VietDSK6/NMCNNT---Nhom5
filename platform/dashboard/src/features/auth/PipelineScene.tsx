import { useReducedMotion } from "motion/react";
import { BoxIcon, ActivityIcon, GitIcon, ServerIcon } from "../../icons";
import { type PipelineNodeId, pipelineNodes } from "./strings";

const nodeIcons: Readonly<Record<PipelineNodeId, typeof GitIcon>> = {
  git: GitIcon,
  runner: ServerIcon,
  container: BoxIcon,
  metrics: ActivityIcon,
};

const pipelinePath = "M40 110 C 95 110, 95 50, 150 50 S 205 110, 260 110 S 315 50, 360 50";
const particleOffsets = [0, 1.3, 2.6] as const;

export function PipelineScene({ activeNode, fast }: { readonly activeNode: PipelineNodeId | null; readonly fast: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const seconds = fast ? 2.2 : 4;

  return (
    <div className="pipeline-scene" role="img" aria-label="Luồng Git commit, Runner, Container, Metrics">
      <svg className="pipeline-scene__line" viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">
        <path d={pipelinePath} className="pipeline-scene__track" />
        {!reduced && particleOffsets.map((offset) => (
          <circle key={`${offset}-${seconds}`} r="3.5" className="pipeline-scene__particle">
            <animateMotion dur={`${seconds}s`} begin={`${offset}s`} repeatCount="indefinite" path={pipelinePath} />
          </circle>
        ))}
      </svg>
      {pipelineNodes.map((node) => {
        const Icon = nodeIcons[node.id];
        return (
          <div
            key={node.id}
            className="pipeline-node glass"
            data-active={activeNode === node.id || undefined}
            style={{ left: `${node.left}%`, top: `${node.top}%` }}
          >
            <Icon />
            <span>{node.label}</span>
          </div>
        );
      })}
    </div>
  );
}
