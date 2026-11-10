import { useMemo } from "react";
import { motion, useReducedMotion, useTransform } from "motion/react";
import { blobs, density, parallaxAmplitude } from "../../config/background";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useMouseParallax } from "../../hooks/useMouseParallax";
import { usePageVisibility } from "../../hooks/usePageVisibility";

interface Scatter {
  readonly left: number;
  readonly top: number;
  readonly size: number;
  readonly seconds: number;
  readonly delay: number;
}

// Bộ sinh giả ngẫu nhiên xác định để bố cục nền ổn định giữa các lần render.
function scatter(count: number, seed: number, size: readonly [number, number], seconds: readonly [number, number]): readonly Scatter[] {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    left: next() * 100,
    top: next() * 100,
    size: size[0] + next() * (size[1] - size[0]),
    seconds: seconds[0] + next() * (seconds[1] - seconds[0]),
    delay: -next() * seconds[1],
  }));
}

export function AuroraBackground({ calm }: { readonly calm: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const visible = usePageVisibility();
  const mobile = useMediaQuery("(max-width: 767px)");
  const limits = mobile ? density.mobile : density.desktop;
  const { x, y } = useMouseParallax(!reduced && !mobile);

  const range = [-0.5, 0.5];
  const blobX = useTransform(x, range, [parallaxAmplitude.blob, -parallaxAmplitude.blob]);
  const blobY = useTransform(y, range, [parallaxAmplitude.blob, -parallaxAmplitude.blob]);
  const shapeX = useTransform(x, range, [parallaxAmplitude.shape, -parallaxAmplitude.shape]);
  const shapeY = useTransform(y, range, [parallaxAmplitude.shape, -parallaxAmplitude.shape]);
  const bokehX = useTransform(x, range, [parallaxAmplitude.bokeh, -parallaxAmplitude.bokeh]);
  const bokehY = useTransform(y, range, [parallaxAmplitude.bokeh, -parallaxAmplitude.bokeh]);
  const particleX = useTransform(x, range, [parallaxAmplitude.particle, -parallaxAmplitude.particle]);
  const particleY = useTransform(y, range, [parallaxAmplitude.particle, -parallaxAmplitude.particle]);

  const bokeh = useMemo(() => scatter(limits.bokeh, 7, [28, 120], [40, 70]), [limits.bokeh]);
  const particles = useMemo(() => scatter(limits.particles, 19, [2, 4], [4, 9]), [limits.particles]);
  const paused = reduced || !visible || calm;

  return (
    <motion.div
      className="aurora"
      data-paused={paused || undefined}
      data-reduced={reduced || undefined}
      data-calm={calm || undefined}
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="aurora__breath">
        <motion.div className="aurora__layer" style={{ x: blobX, y: blobY }}>
          {blobs.slice(0, limits.blobs).map((blob) => (
            <span
              key={blob.color}
              className="aurora__blob"
              style={{ background: blob.color, width: blob.size, height: blob.size, top: blob.top, left: blob.left, animationDuration: `${blob.seconds}s` }}
            />
          ))}
        </motion.div>
      </div>
      <motion.div className="aurora__layer" style={{ x: shapeX, y: shapeY }}>
        <span className="aurora__shape aurora__shape--ring" />
        <span className="aurora__shape aurora__shape--diamond" />
      </motion.div>
      <motion.div className="aurora__layer" style={{ x: bokehX, y: bokehY }}>
        {bokeh.map((item, index) => (
          <span key={index} className="aurora__bokeh" style={{ left: `${item.left}%`, width: item.size, height: item.size, animationDuration: `${item.seconds}s`, animationDelay: `${item.delay}s` }} />
        ))}
      </motion.div>
      <motion.div className="aurora__layer" style={{ x: particleX, y: particleY }}>
        {particles.map((item, index) => (
          <span key={index} className="aurora__particle" style={{ left: `${item.left}%`, top: `${item.top}%`, width: item.size, height: item.size, animationDuration: `${item.seconds}s`, animationDelay: `${item.delay}s` }} />
        ))}
      </motion.div>
      <span className="aurora__grain" />
      <span className="aurora__vignette" />
      <span className="aurora__flash" />
    </motion.div>
  );
}
