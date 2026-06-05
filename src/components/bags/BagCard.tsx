import Link from "next/link";
import { getDaysSinceRoast, getFreshnessColor, getFreshnessLabel, FRESHNESS_CSS } from "@/lib/bags/freshness";
import type { BagWithOrigins } from "@/lib/bags/queries";

const ROAST_LABELS: Record<string, string> = {
  light: "Light",
  medium_light: "Med Light",
  medium: "Medium",
  medium_dark: "Med Dark",
  dark: "Dark",
  unspecified: "",
};

const PROCESS_LABELS: Record<string, string> = {
  washed: "Washed",
  natural: "Natural",
  honey: "Honey",
  anaerobic: "Anaerobic",
  ea_washed: "EA Washed",
  swiss_water: "Swiss Water",
  other: "Other",
  unspecified: "",
};

function MiniFreshnessBar({
  roastDate,
  peakStartDay,
  peakEndDay,
}: {
  roastDate: string;
  peakStartDay: number | null;
  peakEndDay: number | null;
}) {
  const days = getDaysSinceRoast(roastDate);
  const start = peakStartDay ?? 7;
  const end = peakEndDay ?? 35;
  const mid = Math.round((start + end) / 2);
  const useSoonEnd = end + 10;
  const total = end + 14;
  const pct = (d: number) => `${((Math.min(d, total) / total) * 100).toFixed(2)}%`;
  const todayPct = `${((Math.min(Math.max(days, 0), total) / total) * 100).toFixed(2)}%`;

  return (
    <div className="relative" style={{ height: 14 }}>
      {/* Base gray */}
      <div className="absolute rounded-full" style={{ inset: "4px 0", height: 6, backgroundColor: "#8E8E93" }} />
      {/* Peak start → mid: bright green */}
      <div className="absolute" style={{ left: pct(start), width: `${((mid - start) / total) * 100}%`, top: 4, height: 6, backgroundColor: "#30D158" }} />
      {/* mid → peak end: dark green */}
      <div className="absolute" style={{ left: pct(mid), width: `${((end - mid) / total) * 100}%`, top: 4, height: 6, backgroundColor: "#248A3D" }} />
      {/* peak end → use-soon end: orange */}
      <div className="absolute" style={{ left: pct(end), width: `${((useSoonEnd - end) / total) * 100}%`, top: 4, height: 6, backgroundColor: "#FF9500" }} />
      {/* use-soon end → total: red */}
      <div className="absolute" style={{ left: pct(useSoonEnd), right: 0, top: 4, height: 6, borderRadius: "0 3px 3px 0", backgroundColor: "#FF3B30" }} />
      {/* Today marker */}
      <div className="absolute" style={{ left: todayPct, transform: "translateX(-50%)", top: 0, width: 2, height: 14, backgroundColor: "var(--text-primary)", borderRadius: 1 }} />
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }}
    >
      {children}
    </span>
  );
}

export default function BagCard({ bag, avgDose }: { bag: BagWithOrigins; avgDose?: number }) {
  const countries = [...new Set(bag.origins.map((o) => o.country))].join(", ");
  const roastLabel = ROAST_LABELS[bag.roastLevel] || "";
  const processLabel = PROCESS_LABELS[bag.processingMethod] || "";

  const metaParts = [roastLabel, processLabel, countries].filter(Boolean);

  const shotCount = bag.shotCount ?? 0;
  const bagIndex = bag.bagIndex ?? 1;
  const bagTotal = bag.bagTotal ?? 1;
  const bagLabel = bagTotal > 1 ? `Bag ${bagIndex}/${bagTotal}` : `Bag ${bagIndex}`;
  const remainingG = bag.weightG != null && (bag.status === "active" || bag.status === "reserve")
    ? Math.round(bag.weightG - (bag.totalDoseG ?? 0) + (bag.weightCorrectionG ?? 0))
    : null;

  const cupsRemaining = (() => {
    if (remainingG == null || remainingG <= 0) return null;
    const dose = avgDose
      ?? (bag.shotCount && bag.shotCount > 0 && bag.totalDoseG ? bag.totalDoseG / bag.shotCount : 18);
    return Math.floor(remainingG / dose);
  })();

  return (
    <Link href={`/bags/${bag.id}`} className="block">
      <div
        className="px-4 py-3 flex flex-col gap-1.5 active:opacity-70 transition-opacity"
        style={{ backgroundColor: "var(--card)" }}
      >
        {/* Line 1: Roaster + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            {bag.roaster}
          </span>
          {bag.isDecaf && <Badge>DECAF</Badge>}
          {bag.isBlend && <Badge>BLEND</Badge>}
        </div>

        {/* Line 2: Bag name */}
        <span className="text-[17px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
          {bag.name}
        </span>

        {/* Line 3: Freshness label + bar (active/reserve) or finished status */}
        {bag.status === "active" || bag.status === "reserve" ? (() => {
          const days = getDaysSinceRoast(bag.roastDate);
          const start = bag.peakStartDay ?? 7;
          const end = bag.peakEndDay ?? 35;
          const colorKey = getFreshnessColor(days, start, end);
          const cssColor = FRESHNESS_CSS[colorKey];
          const label = getFreshnessLabel(days, start, end);
          return (
            <>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cssColor }} />
                <span className="text-[13px]" style={{ color: cssColor }}>
                  {label}
                </span>
                <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  ({days} days since roast)
                </span>
              </div>
              <MiniFreshnessBar
                roastDate={bag.roastDate}
                peakStartDay={bag.peakStartDay}
                peakEndDay={bag.peakEndDay}
              />
            </>
          );
        })() : (
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: "var(--text-secondary)" }}
            />
            <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
              Finished{bag.finishedDate ? ` · ${bag.finishedDate}` : ""}
            </span>
          </div>
        )}

        {/* Line 4: Roast · Process · Origin */}
        {metaParts.length > 0 && (
          <div className="flex items-center gap-x-2 flex-wrap">
            {metaParts.map((part, i) => (
              <span key={i} className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                {i > 0 && <span className="mr-2" style={{ color: "var(--divider)" }}>·</span>}
                {part}
              </span>
            ))}
          </div>
        )}

        {/* Line 5: Rating · Shots · Bag counter */}
        <div className="flex items-center gap-3 flex-wrap">
          {bag.avgShotRating != null && (
            <span className="text-[13px] font-medium" style={{ color: "#FF9500" }}>
              ★ {bag.avgShotRating.toFixed(1)}
            </span>
          )}
          <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            {shotCount} {shotCount === 1 ? "shot" : "shots"}
          </span>
          <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            {bagLabel}
          </span>
          {remainingG != null && remainingG > 0 && (
            <span className="text-[13px]" style={{ color: remainingG < 100 ? "#FF9500" : "var(--text-secondary)" }}>
              ~{remainingG}g left
            </span>
          )}
          {cupsRemaining != null && cupsRemaining > 0 && (
            <span className="text-[13px]" style={{ color: cupsRemaining < 5 ? "#FF9500" : "var(--text-secondary)" }}>
              ~{cupsRemaining} cup{cupsRemaining !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
