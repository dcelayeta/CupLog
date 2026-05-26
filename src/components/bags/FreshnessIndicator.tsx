import {
  getDaysSinceRoast,
  getFreshnessColor,
  getFreshnessLabel,
  FRESHNESS_CSS,
} from "@/lib/bags/freshness";

export default function FreshnessIndicator({
  roastDate,
  peakStartDay,
  peakEndDay,
  showDays = true,
}: {
  roastDate: string;
  peakStartDay?: number | null;
  peakEndDay?: number | null;
  showDays?: boolean;
}) {
  const days = getDaysSinceRoast(roastDate);
  const start = peakStartDay ?? 7;
  const end = peakEndDay ?? 35;
  const color = getFreshnessColor(days, start, end);
  const label = getFreshnessLabel(days, start, end);
  const cssColor = FRESHNESS_CSS[color];

  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: cssColor }}
      />
      <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
        {showDays && days >= 0 ? `${days}d · ` : ""}
        {label}
      </span>
    </span>
  );
}
