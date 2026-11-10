export const parallaxSpring = { stiffness: 60, damping: 20, mass: 0.6 } as const;

export interface BlobConfig {
  readonly color: string;
  readonly size: string;
  readonly top: string;
  readonly left: string;
  readonly seconds: number;
}

export const blobs: readonly BlobConfig[] = [
  { color: "var(--aurora-blue)", size: "62vmax", top: "-18%", left: "-12%", seconds: 18 },
  { color: "var(--aurora-sky)", size: "54vmax", top: "-10%", left: "52%", seconds: 21 },
  { color: "var(--aurora-ice)", size: "48vmax", top: "46%", left: "-8%", seconds: 24 },
  { color: "var(--aurora-mint)", size: "52vmax", top: "52%", left: "48%", seconds: 27 },
  { color: "var(--aurora-teal)", size: "40vmax", top: "24%", left: "28%", seconds: 30 },
];

export const parallaxAmplitude = { blob: 24, shape: 16, bokeh: 32, particle: 12 } as const;

export const density = {
  desktop: { blobs: 5, bokeh: 12, particles: 44 },
  mobile: { blobs: 3, bokeh: 5, particles: 0 },
} as const;
