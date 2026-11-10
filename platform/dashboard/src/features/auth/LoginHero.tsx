import { motion } from "motion/react";
import { BrandMark } from "../../components/ui/BrandMark";
import { choreography } from "../../motion/constants";
import { fadeUp, staggerContainer } from "../../motion/variants";
import { PipelineScene } from "./PipelineScene";
import { authStrings, heroWidgets, type PipelineNodeId } from "./strings";

export function LoginHero({
  activeNode,
  fast,
  converging,
}: {
  readonly activeNode: PipelineNodeId | null;
  readonly fast: boolean;
  readonly converging: boolean;
}) {
  return (
    <motion.section
      className="login-hero"
      data-converging={converging || undefined}
      variants={staggerContainer(choreography.hero)}
      initial="hidden"
      animate="visible"
      aria-label="Giới thiệu hệ thống"
    >
      <motion.div className="login-hero__brand" variants={fadeUp}>
        <BrandMark />
        <div><strong>{authStrings.brandName}</strong><small>{authStrings.brandSub}</small></div>
      </motion.div>
      <motion.div className="login-hero__copy" variants={fadeUp}>
        <span className="eyebrow">NỀN TẢNG THỰC HÀNH · P1</span>
        <h1>{authStrings.heroTitle}</h1>
        <p>{authStrings.heroText}</p>
      </motion.div>
      <motion.div className="login-hero__stage" variants={fadeUp}>
        <PipelineScene activeNode={activeNode} fast={fast} />
        {heroWidgets.map((widget) => (
          <span key={widget.id} className={`hero-widget hero-widget--${widget.id} glass-subtle`}>
            <i className={`status-dot status-dot--${widget.tone}`} />{widget.label}
          </span>
        ))}
      </motion.div>
    </motion.section>
  );
}
