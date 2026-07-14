import { TARGET_RATIOS, type TargetRatioPreset } from "./targetRatios";

export const YIELD_TOLERANCE_G = 3; // a bit lax to absorb lag-drip variance around the averaged "stop at" hint

export type TargetZone = TargetRatioPreset & { yieldForDose: number };

export type TargetHitClassification = {
  effectiveDose: number;
  zones: TargetZone[];
  targetZone: TargetZone | null;
  nearestActualZone: TargetZone;
  yieldDelta: number | null;
  timeInRange: boolean | null;
  yieldInRange: boolean | null;
  hitTarget: boolean;
  /** The zone the shot landed closer to when it missed its target, or the
   * closest style as a reference when no target was recorded at all. */
  nearMissZone: TargetZone | null;
};

export function classifyShotAgainstTarget({
  doseG,
  grinderRetentionG,
  yieldG,
  shotTimeSeconds,
  targetRatioLabel,
}: {
  doseG: number;
  grinderRetentionG: number | null;
  yieldG: number;
  shotTimeSeconds: number;
  targetRatioLabel: string | null;
}): TargetHitClassification {
  const effectiveDose = grinderRetentionG != null ? doseG - grinderRetentionG : doseG;

  // Each preset's target yield scales linearly with dose (yield = dose × ratio).
  const zones: TargetZone[] = TARGET_RATIOS.map((preset) => ({
    ...preset,
    yieldForDose: effectiveDose * preset.ratio,
  }));

  const targetZone = zones.find((z) => z.label === targetRatioLabel) ?? null;

  const actualRatio = effectiveDose > 0 ? yieldG / effectiveDose : 0;
  const nearestActualZone = zones.reduce((best, z) =>
    Math.abs(z.ratio - actualRatio) < Math.abs(best.ratio - actualRatio) ? z : best
  , zones[0]);

  const yieldDelta = targetZone ? yieldG - targetZone.yieldForDose : null;
  const timeInRange = targetZone
    ? shotTimeSeconds >= targetZone.timeMinSeconds && shotTimeSeconds <= targetZone.timeMaxSeconds
    : null;
  const yieldInRange = yieldDelta !== null ? Math.abs(yieldDelta) <= YIELD_TOLERANCE_G : null;
  const hitTarget = timeInRange === true && yieldInRange === true;

  const nearMissZone = !targetZone
    ? nearestActualZone
    : !hitTarget && nearestActualZone.label !== targetZone.label
      ? nearestActualZone
      : null;

  return { effectiveDose, zones, targetZone, nearestActualZone, yieldDelta, timeInRange, yieldInRange, hitTarget, nearMissZone };
}
