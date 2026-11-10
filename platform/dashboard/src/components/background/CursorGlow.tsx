import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const interactiveSelector = "a, button, input, select, textarea, [role='button']";

export function CursorGlow() {
  const reduced = useReducedMotion() ?? false;
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const enabled = canHover && !reduced;
  const rawX = useMotionValue(-400);
  const rawY = useMotionValue(-400);
  const x = useSpring(rawX, { stiffness: 140, damping: 22, mass: 0.5 });
  const y = useSpring(rawY, { stiffness: 140, damping: 22, mass: 0.5 });
  const scale = useSpring(1, { stiffness: 200, damping: 20 });

  useEffect(() => {
    if (!enabled) return;
    const onMove = (event: PointerEvent) => {
      rawX.set(event.clientX);
      rawY.set(event.clientY);
      scale.set((event.target as Element | null)?.closest?.(interactiveSelector) ? 1.4 : 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, rawX, rawY, scale]);

  if (!enabled) return null;
  return <motion.div className="cursor-glow" aria-hidden="true" style={{ x, y, scale }} />;
}
