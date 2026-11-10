import { motion } from "motion/react";
import { duration, easing } from "../../motion/constants";
import { PipelineFlow } from "./PipelineFlow";

export function HeroBanner({ username }: { readonly username: string }) {
  return (
    <motion.section
      className="stage-banner"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: easing.out }}
    >
      <svg className="stage-banner__waves" viewBox="0 0 800 200" preserveAspectRatio="none" aria-hidden="true">
        <path className="wave wave--1" d="M0 120 C 150 60, 300 180, 450 110 S 700 70, 800 120 V200 H0Z" />
        <path className="wave wave--2" d="M0 150 C 180 110, 320 190, 500 140 S 720 110, 800 150 V200 H0Z" />
      </svg>
      <div className="stage-banner__copy">
        <h2>Xin chào, <span>{username}</span>!</h2>
        <p>Theo dõi và vận hành các Web Service của nhóm từ một nơi.</p>
      </div>
      <PipelineFlow />
    </motion.section>
  );
}
