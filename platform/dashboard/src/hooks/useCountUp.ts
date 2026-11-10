import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { duration } from "../motion/constants";

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

export function useCountUp(target: number, active: boolean): number {
  const reduced = useReducedMotion() ?? false;
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (reduced) { setValue(target); return; }
    const total = duration.slow * 1000;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / total, 1);
      setValue(Math.round(target * easeOutExpo(progress)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, reduced]);

  return value;
}
