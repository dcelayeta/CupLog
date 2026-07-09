export type TargetRatioPreset = {
  label: string;
  ratio: number;
  description: string;
  timeMinSeconds: number;
  timeMaxSeconds: number;
};

export const TARGET_RATIOS: TargetRatioPreset[] = [
  { label: "Turbo Ristretto", ratio: 1.0, description: "Very concentrated, intense", timeMinSeconds: 15, timeMaxSeconds: 20 },
  { label: "Ristretto", ratio: 1.5, description: "Short, syrupy, sweet-forward", timeMinSeconds: 20, timeMaxSeconds: 25 },
  { label: "Espresso", ratio: 2.0, description: "Standard espresso", timeMinSeconds: 25, timeMaxSeconds: 30 },
  { label: "Normale", ratio: 2.5, description: "Balanced, slightly longer", timeMinSeconds: 28, timeMaxSeconds: 32 },
  { label: "Long Pull", ratio: 3.0, description: "More volume, lighter body", timeMinSeconds: 35, timeMaxSeconds: 40 },
  { label: "Lungo", ratio: 4.0, description: "Extended pull, thin body", timeMinSeconds: 40, timeMaxSeconds: 50 },
];

export function formatTimeRange(preset: TargetRatioPreset): string {
  return `${preset.timeMinSeconds}–${preset.timeMaxSeconds}s`;
}
