export const duration = {
  instant: 0.12,
  fast: 0.22,
  base: 0.45,
  slow: 0.8,
  ambient: 24,
} as const;

export const easing = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  emphasized: [0.2, 0, 0, 1],
} as const;

export const spring = {
  soft: { type: "spring", stiffness: 120, damping: 18 },
  snappy: { type: "spring", stiffness: 300, damping: 26 },
  bouncy: { type: "spring", stiffness: 220, damping: 12 },
} as const;

export const stagger = {
  tight: 0.04,
  base: 0.07,
  loose: 0.09,
} as const;

export const distance = {
  fadeUp: 24,
  slide: 40,
} as const;

export const choreography = {
  hero: 0.1,
  form: 0.25,
  widget: 0.4,
  successHold: 0.9,
} as const;
