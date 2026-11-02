import { motion } from "motion/react";
import { spring } from "../../motion/constants";

// layoutId chung giúp logo bay từ màn đăng nhập về sidebar.
export function BrandMark({ large = false }: { readonly large?: boolean }) {
  return (
    <motion.div layoutId="brand-mark" transition={spring.soft} className={large ? "brand-mark brand-mark--large" : "brand-mark"}>
      <span /><span /><span />
    </motion.div>
  );
}
