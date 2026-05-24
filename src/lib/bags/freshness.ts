export function getDaysSinceRoast(roastDateISO: string): number {
  const roast = new Date(roastDateISO + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - roast.getTime()) / (1000 * 60 * 60 * 24));
}

export type FreshnessColor = "orange" | "green" | "red";

export function getFreshnessColor(days: number): FreshnessColor {
  if (days < 0) return "orange";
  if (days <= 6) return "orange";
  if (days <= 35) return "green";
  if (days <= 45) return "orange";
  return "red";
}

export function getFreshnessLabel(days: number): string {
  if (days < 0) return `Ready in ${Math.abs(days)}d`;
  if (days <= 6) return "Too fresh — wait";
  if (days <= 21) return "Peak window";
  if (days <= 35) return "Still excellent";
  if (days <= 45) return "Use soon";
  return "Past peak";
}

export const FRESHNESS_CSS: Record<FreshnessColor, string> = {
  green: "var(--success)",
  orange: "var(--warning)",
  red: "var(--destructive)",
};
