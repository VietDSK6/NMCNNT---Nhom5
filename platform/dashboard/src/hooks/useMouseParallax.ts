import { useEffect } from "react";
import { type MotionValue, useMotionValue, useSpring } from "motion/react";
import { parallaxSpring } from "../config/background";

// Trả về toạ độ chuột chuẩn hoá -0.5..0.5, làm mượt bằng spring; không gây re-render.
export function useMouseParallax(enabled: boolean): { x: MotionValue<number>; y: MotionValue<number> } {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, parallaxSpring);
  const y = useSpring(rawY, parallaxSpring);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (event: PointerEvent) => {
      rawX.set(event.clientX / window.innerWidth - 0.5);
      rawY.set(event.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, rawX, rawY]);

  return { x, y };
}
