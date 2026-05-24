import {
  getDaysSinceRoast,
  getFreshnessColor,
  getFreshnessLabel,
  FRESHNESS_CSS,
} from "@/lib/bags/freshness";

export default function FreshnessIndicator({
  roastDate,
  showDays = true,
}: {
  roastDate: string;
  showDays?: boolean;
}) {
  const days = getDaysSinceRoast(roastDate);
  const color = getFreshnessColor(days);
  const label = getFreshnessLabel(days);
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
