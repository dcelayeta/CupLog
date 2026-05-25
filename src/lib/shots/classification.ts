import type { ExtractionThreshold } from "@/db/schema";

export type Classification = { label: string; color: string };

// Color mapping by label — used when building Classification from DB thresholds
const LABEL_COLORS: Record<string, string> = {
  "Very Fast": "#FF3B30",
  "Fast": "#FF9500",
  "Normal": "#34C759",
  "Slow": "#FF9500",
  "Very Slow": "#FF3B30",
  "Ristretto": "#007AFF",
  "Short": "#8E8E93",
  "Long": "#8E8E93",
  "Lungo": "#007AFF",
};

// Default thresholds — used as fallback when DB is empty, and for "Restore defaults"
export const DEFAULT_TIME_THRESHOLDS = [
  { minValue: 0, maxValue: 20, label: "Very Fast", description: "Severely under-extracted — grind much finer", sortOrder: 1 },
  { minValue: 20, maxValue: 25, label: "Fast", description: "Under-extracted — grind finer", sortOrder: 2 },
  { minValue: 25, maxValue: 35, label: "Normal", description: "Good extraction range", sortOrder: 3 },
  { minValue: 35, maxValue: 45, label: "Slow", description: "Slightly over-extracted — grind coarser", sortOrder: 4 },
  { minValue: 45, maxValue: null, label: "Very Slow", description: "Severely over-extracted — grind much coarser", sortOrder: 5 },
] as const;

export const DEFAULT_RATIO_THRESHOLDS = [
  { minValue: 0, maxValue: 1.5, label: "Ristretto", description: "Very concentrated, short pull", sortOrder: 1 },
  { minValue: 1.5, maxValue: 2.0, label: "Short", description: "Slightly under target ratio", sortOrder: 2 },
  { minValue: 2.0, maxValue: 2.5, label: "Normal", description: "Standard espresso ratio", sortOrder: 3 },
  { minValue: 2.5, maxValue: 3.0, label: "Long", description: "Extended pull, less concentrated", sortOrder: 4 },
  { minValue: 3.0, maxValue: null, label: "Lungo", description: "Very long pull, highly diluted", sortOrder: 5 },
] as const;

type ThresholdLike = { minValue: number; maxValue: number | null; label: string };

function classifyValue(value: number, thresholds: readonly ThresholdLike[]): Classification {
  const match = thresholds.find(
    (t) => value >= t.minValue && (t.maxValue === null || value < t.maxValue)
  );
  const label = match?.label ?? "Unknown";
  return { label, color: LABEL_COLORS[label] ?? "#8E8E93" };
}

export function classifyTime(seconds: number, thresholds?: ExtractionThreshold[]): Classification {
  const t = thresholds?.filter((t) => t.metric === "time");
  return classifyValue(seconds, t && t.length > 0 ? t : DEFAULT_TIME_THRESHOLDS);
}

export function classifyRatio(ratio: number, thresholds?: ExtractionThreshold[]): Classification {
  const t = thresholds?.filter((t) => t.metric === "ratio");
  return classifyValue(ratio, t && t.length > 0 ? t : DEFAULT_RATIO_THRESHOLDS);
}
