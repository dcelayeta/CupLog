export function getDaysSinceRoast(roastDateISO: string): number {
  const roast = new Date(roastDateISO + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - roast.getTime()) / (1000 * 60 * 60 * 24));
}

export type FreshnessColor = "orange" | "green" | "red";

// ─── Per-bag peak window estimate ─────────────────────────────────────────────

export type RoastLevel = "light" | "medium_light" | "medium" | "medium_dark" | "dark" | "unspecified";
export type ProcessingMethod = "washed" | "natural" | "honey" | "anaerobic" | "ea_washed" | "swiss_water" | "other" | "unspecified";

/**
 * Returns estimated { peakStartDay, peakEndDay } based on roast level and
 * processing method. Used to auto-populate new bags — user can override.
 */
export function estimatePeakWindow(
  roastLevel: RoastLevel,
  processingMethod: ProcessingMethod,
  isDecaf: boolean
): { peakStartDay: number; peakEndDay: number } {
  // Decaf extracts sooner and goes stale faster
  if (isDecaf || processingMethod === "ea_washed" || processingMethod === "swiss_water") {
    return { peakStartDay: 4, peakEndDay: 21 };
  }

  // Base by roast level
  let start: number;
  let end: number;
  if (roastLevel === "light") {
    start = 14; end = 42;
  } else if (roastLevel === "medium_light") {
    start = 10; end = 38;
  } else if (roastLevel === "medium") {
    start = 7; end = 35;
  } else if (roastLevel === "medium_dark") {
    start = 5; end = 28;
  } else if (roastLevel === "dark") {
    start = 3; end = 21;
  } else {
    // unspecified — use medium defaults
    start = 7; end = 35;
  }

  // Natural and anaerobic need extra degassing time
  if (processingMethod === "natural" || processingMethod === "anaerobic") {
    start += 4;
    end += 4;
  } else if (processingMethod === "honey") {
    start += 2;
    end += 2;
  }

  return { peakStartDay: start, peakEndDay: end };
}

// ─── Freshness classification ─────────────────────────────────────────────────

export function getFreshnessColor(
  days: number,
  peakStartDay = 7,
  peakEndDay = 35
): FreshnessColor {
  if (days < 0) return "orange";
  if (days < peakStartDay) return "orange";
  if (days <= peakEndDay) return "green";
  if (days <= peakEndDay + 10) return "orange";
  return "red";
}

export function getFreshnessLabel(
  days: number,
  peakStartDay = 7,
  peakEndDay = 35
): string {
  const midPeak = Math.round((peakStartDay + peakEndDay) / 2);
  if (days < 0) return `Ready in ${Math.abs(days)}d`;
  if (days < peakStartDay) return `Too fresh — wait (${peakStartDay - days}d)`;
  if (days <= midPeak) return "Peak window";
  if (days <= peakEndDay) return "Still excellent";
  if (days <= peakEndDay + 10) return "Use soon";
  return "Past peak";
}

export const FRESHNESS_CSS: Record<FreshnessColor, string> = {
  green: "var(--success)",
  orange: "var(--warning)",
  red: "var(--destructive)",
};

export function describePeakWindow(
  roastLevel: string,
  processingMethod: string,
  isDecaf: boolean,
  peakStartDay: number,
  peakEndDay: number
): string {
  const windowDays = peakEndDay - peakStartDay;

  if (isDecaf || processingMethod === "ea_washed" || processingMethod === "swiss_water") {
    const name =
      processingMethod === "ea_washed" ? "EA Washed" :
      processingMethod === "swiss_water" ? "Swiss Water Process" :
      "Decaffeinated";
    return `Auto-estimated. ${name} coffee degasses faster than regular beans — the decaffeination process opens the bean structure, reducing CO₂ content and accelerating flavor development. Peak freshness starts around day ${peakStartDay} and holds through day ${peakEndDay} (${windowDays} day window).`;
  }

  const bases: Record<string, { start: number; end: number; intro: string }> = {
    light:        { start: 14, end: 42, intro: "Light roasts need significantly more rest — the dense cell structure degasses slowly" },
    medium_light: { start: 10, end: 38, intro: "Medium-light roasts benefit from a longer rest than medium before reaching peak flavor" },
    medium:       { start:  7, end: 35, intro: "Medium roasts follow typical degassing curves" },
    medium_dark:  { start:  5, end: 28, intro: "Medium-dark roasts degas faster due to higher roast temperatures" },
    dark:         { start:  3, end: 21, intro: "Dark roasts degas very quickly — high temperatures break down cell structure and release CO₂ rapidly" },
  };
  const base = bases[roastLevel] ?? null;

  const adjustments: Partial<Record<string, { days: number; reason: string }>> = {
    natural:   { days: 4, reason: "fermentation compounds and higher mucilage content require more degassing time" },
    anaerobic: { days: 4, reason: "intense fermentation produces more CO₂ and requires additional degassing time" },
    honey:     { days: 2, reason: "partial mucilage retention means slightly more degassing time than washed" },
  };
  const adj = adjustments[processingMethod] ?? null;

  if (!base) {
    if (adj) {
      return `Auto-estimated. Roast level not specified, medium defaults applied — baseline peak from day 7–35. The ${processingMethod.replace("_", " ")} process adds ~${adj.days} days — ${adj.reason} — shifting the window to days ${peakStartDay}–${peakEndDay}.`;
    }
    return `Auto-estimated. Roast level not specified, medium defaults applied — peak freshness estimated days ${peakStartDay}–${peakEndDay} after roasting (${windowDays} day window).`;
  }

  if (adj) {
    const baseWindowDays = base.end - base.start;
    return `Auto-estimated. ${base.intro}, with a baseline peak from day ${base.start}–${base.end} (${baseWindowDays} days). The ${processingMethod.replace("_", " ")} process adds ~${adj.days} days — ${adj.reason} — shifting the window to days ${peakStartDay}–${peakEndDay}.`;
  }

  return `Auto-estimated. ${base.intro} — peak freshness from day ${peakStartDay}–${peakEndDay} after roasting, a ${windowDays} day window.`;
}
