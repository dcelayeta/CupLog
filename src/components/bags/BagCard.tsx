import Link from "next/link";
import FreshnessIndicator from "./FreshnessIndicator";
import type { BagWithOrigins } from "@/lib/bags/queries";

const ROAST_LABELS: Record<string, string> = {
  light: "Light",
  medium_light: "Medium Light",
  medium: "Medium",
  medium_dark: "Medium Dark",
  dark: "Dark",
  unspecified: "",
};

export default function BagCard({ bag }: { bag: BagWithOrigins }) {
  const countries = [...new Set(bag.origins.map((o) => o.country))].join(", ");
  const roastLabel = ROAST_LABELS[bag.roastLevel] || "";

  return (
    <Link href={`/bags/${bag.id}`} className="block">
      <div
        className="px-4 py-3 flex flex-col gap-1 active:opacity-70 transition-opacity"
        style={{ backgroundColor: "var(--card)" }}
      >
        {/* Top row: roaster + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[13px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {bag.roaster}
          </span>
          {bag.isDecaf && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--card-secondary)",
                color: "var(--text-secondary)",
              }}
            >
              DECAF
            </span>
          )}
          {bag.isBlend && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--card-secondary)",
                color: "var(--text-secondary)",
              }}
            >
              BLEND
            </span>
          )}
        </div>

        {/* Bag name */}
        <span
          className="text-[17px] font-semibold leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {bag.name}
        </span>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap mt-0.5">
          {bag.status === "active" ? (
            <FreshnessIndicator roastDate={bag.roastDate} peakStartDay={bag.peakStartDay} peakEndDay={bag.peakEndDay} />
          ) : (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: "var(--text-secondary)" }}
              />
              <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                Finished{bag.finishedDate ? ` · ${bag.finishedDate}` : ""}
              </span>
            </span>
          )}
          {roastLabel && (
            <span
              className="text-[13px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {roastLabel}
            </span>
          )}
          {countries && (
            <span
              className="text-[13px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {countries}
            </span>
          )}
          {bag.avgShotRating != null && (
            <span className="text-[13px]" style={{ color: "#FF9500" }}>
              {"★".repeat(Math.round(bag.avgShotRating))}{"☆".repeat(5 - Math.round(bag.avgShotRating))} {bag.avgShotRating}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
