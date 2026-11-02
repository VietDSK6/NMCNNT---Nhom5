import type { Variants } from "motion/react";
import { distance, duration, easing, stagger } from "./constants";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: distance.fadeUp, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: duration.base, ease: easing.out } },
};

export const staggerContainer = (delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { delayChildren, staggerChildren: stagger.base } },
});
