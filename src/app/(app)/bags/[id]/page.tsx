import Link from "next/link";
import { notFound } from "next/navigation";
import { getBagById } from "@/lib/bags/queries";
import { getBagAnalysis } from "@/lib/bags/bagAnalysis";
import FreshnessIndicator from "@/components/bags/FreshnessIndicator";
import BagActions from "@/components/bags/BagActions";
import BagAnalysisClient from "@/components/bags/BagAnalysisClient";
import BagDialInClient from "@/components/bags/BagDialInClient";
import { getDaysSinceRoast, getFreshnessLabel, getFreshnessColor, FRESHNESS_CSS } from "@/lib/bags/freshness";

const ROAST_LABELS: Record<string, string> = {
  light: "Light",
  medium_light: "Medium Light",
  medium: "Medium",
  medium_dark: "Medium Dark",
  dark: "Dark",
  unspecified: "—",
};

const PROCESS_LABELS: Record<string, string> = {
  washed: "Washed",
  natural: "Natural",
  honey: "Honey",
  anaerobic: "Anaerobic",
  ea_washed: "EA Washed",
  swiss_water: "Swiss Water",
  other: "Other",
  unspecified: "—",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div
      className="flex items-center justify-between px-6 min-h-[52px]"
    >
      <span
        className="text-[17px]"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </span>
      <span
        className="text-[17px] text-right"
        style={{ color: "var(--text-secondary)" }}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="ml-4"
      style={{ height: "1px", backgroundColor: "var(--divider)" }}
    />
  );
}

function describePeakWindow(
  roastLevel: string,
  processingMethod: string,
  isDecaf: boolean,
  peakStartDay: number,
  peakEndDay: number
): string {
  const windowDays = peakEndDay - peakStartDay;

  // Decaf path
  if (isDecaf || processingMethod === "ea_washed" || processingMethod === "swiss_water") {
    const name =
      processingMethod === "ea_washed" ? "EA Washed" :
      processingMethod === "swiss_water" ? "Swiss Water Process" :
      "Decaffeinated";
    return `Auto-estimated. ${name} coffee degasses faster than regular beans — the decaffeination process opens the bean structure, reducing CO₂ content and accelerating flavor development. Peak freshness starts around day ${peakStartDay} and holds through day ${peakEndDay} (${windowDays} day window).`;
  }

  // Roast-level baselines (before any processing adjustment)
  const bases: Record<string, { start: number; end: number; intro: string }> = {
    light:        { start: 14, end: 42, intro: "Light roasts need significantly more rest — the dense cell structure degasses slowly" },
    medium_light: { start: 10, end: 38, intro: "Medium-light roasts benefit from a longer rest than medium before reaching peak flavor" },
    medium:       { start:  7, end: 35, intro: "Medium roasts follow typical degassing curves" },
    medium_dark:  { start:  5, end: 28, intro: "Medium-dark roasts degas faster due to higher roast temperatures" },
    dark:         { start:  3, end: 21, intro: "Dark roasts degas very quickly — high temperatures break down cell structure and release CO₂ rapidly" },
  };
  const base = bases[roastLevel] ?? null;

  // Processing adjustments
  const adjustments: Partial<Record<string, { days: number; reason: string }>> = {
    natural:   { days: 4, reason: "fermentation compounds and higher mucilage content require more degassing time" },
    anaerobic: { days: 4, reason: "intense fermentation produces more CO₂ and requires additional degassing time" },
    honey:     { days: 2, reason: "partial mucilage retention means slightly more degassing time than washed" },
  };
  const adj = adjustments[processingMethod] ?? null;

  // Unspecified roast level
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

function FreshnessTimeline({
  peakStartDay,
  peakEndDay,
  daysSinceRoast,
  isUserDefined,
  roastLevel,
  processingMethod,
  isDecaf,
}: {
  peakStartDay: number;
  peakEndDay: number;
  daysSinceRoast: number;
  isUserDefined: boolean;
  roastLevel: string;
  processingMethod: string;
  isDecaf: boolean;
}) {
  const midPeak = Math.round((peakStartDay + peakEndDay) / 2);
  const useSoonEnd = peakEndDay + 10;
  const total = peakEndDay + 14;
  const pct = (d: number) =>
    `${((Math.min(d, total) / total) * 100).toFixed(2)}%`;
  const todayClipped = Math.min(Math.max(daysSinceRoast, 0), total);
  const showToday = daysSinceRoast >= 0;

  const freshnessLabel = getFreshnessLabel(daysSinceRoast, peakStartDay, peakEndDay);
  const freshnessColorKey = getFreshnessColor(daysSinceRoast, peakStartDay, peakEndDay);
  const freshnessColor = FRESHNESS_CSS[freshnessColorKey];
  const autoDescription = isUserDefined ? null : describePeakWindow(roastLevel, processingMethod, isDecaf, peakStartDay, peakEndDay);

  return (
    <div className="px-4 pt-3 pb-4">
      {/* Current freshness status legend */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: freshnessColor }}
        />
        <span className="text-[15px] font-medium" style={{ color: freshnessColor }}>
          {freshnessLabel}
        </span>
        <span className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
          ({daysSinceRoast} days since roast)
        </span>
      </div>

      {/* Today label above bar */}
      {showToday && (
        <div className="relative" style={{ height: 18, marginBottom: 4 }}>
          <span
            className="absolute text-[11px] font-medium whitespace-nowrap"
            style={{
              left: pct(todayClipped),
              bottom: 0,
              transform: "translateX(-50%)",
              color: "var(--text-primary)",
            }}
          >
            Today
          </span>
        </div>
      )}

      {/* Bar + circles */}
      <div className="relative" style={{ height: 16 }}>
        {/* Base gray */}
        <div
          className="absolute rounded-full"
          style={{ left: 0, right: 0, top: 4, height: 8, backgroundColor: "#8E8E93" }}
        />
        {/* Peak window: peakStart → midPeak (bright green) */}
        <div
          className="absolute"
          style={{
            left: pct(peakStartDay),
            width: `${((midPeak - peakStartDay) / total) * 100}%`,
            top: 4, height: 8,
            backgroundColor: "#30D158",
          }}
        />
        {/* Still excellent: midPeak → peakEnd (darker green) */}
        <div
          className="absolute"
          style={{
            left: pct(midPeak),
            width: `${((peakEndDay - midPeak) / total) * 100}%`,
            top: 4, height: 8,
            backgroundColor: "#248A3D",
          }}
        />
        {/* Use soon: peakEnd → useSoonEnd (orange) */}
        <div
          className="absolute"
          style={{
            left: pct(peakEndDay),
            width: `${((useSoonEnd - peakEndDay) / total) * 100}%`,
            top: 4, height: 8,
            backgroundColor: "#FF9500",
          }}
        />
        {/* Past peak: useSoonEnd → total (red) */}
        <div
          className="absolute"
          style={{
            left: pct(useSoonEnd),
            right: 0,
            top: 4, height: 8,
            borderRadius: "0 4px 4px 0",
            backgroundColor: "#FF3B30",
          }}
        />

        {/* Circle at peak start */}
        <div
          className="absolute"
          style={{
            left: pct(peakStartDay),
            top: 0,
            transform: "translateX(-50%)",
            width: 16, height: 16,
            borderRadius: "50%",
            backgroundColor: "#30D158",
            border: "2px solid var(--card)",
            zIndex: 1,
          }}
        />
        {/* Circle at peak end */}
        <div
          className="absolute"
          style={{
            left: pct(peakEndDay),
            top: 0,
            transform: "translateX(-50%)",
            width: 16, height: 16,
            borderRadius: "50%",
            backgroundColor: "#248A3D",
            border: "2px solid var(--card)",
            zIndex: 1,
          }}
        />

        {/* Today marker (white vertical line) */}
        {showToday && (
          <div
            className="absolute"
            style={{
              left: pct(todayClipped),
              top: 0,
              height: 16,
              width: 2,
              backgroundColor: "white",
              transform: "translateX(-50%)",
              borderRadius: 1,
              zIndex: 2,
              boxShadow: "0 0 3px rgba(0,0,0,0.5)",
            }}
          />
        )}
      </div>

      {/* Day labels below bar */}
      <div className="relative mt-2" style={{ height: 16 }}>
        <span
          className="absolute text-[11px]"
          style={{
            left: pct(peakStartDay),
            transform: "translateX(-50%)",
            color: "#30D158",
          }}
        >
          Day {peakStartDay}
        </span>
        <span
          className="absolute text-[11px]"
          style={{
            left: pct(midPeak),
            transform: "translateX(-50%)",
            color: "#248A3D",
          }}
        >
          Day {midPeak}
        </span>
        <span
          className="absolute text-[11px]"
          style={{
            left: pct(peakEndDay),
            transform: "translateX(-50%)",
            color: "#248A3D",
          }}
        >
          Day {peakEndDay}
        </span>
      </div>

      {/* Description + source */}
      {isUserDefined ? (
        <p className="text-[13px] mt-3" style={{ color: "var(--text-secondary)" }}>
          User-defined peak freshness: Days {peakStartDay}–{peakEndDay} after roast ({peakEndDay - peakStartDay} days)
        </p>
      ) : (
        <p className="text-[13px] mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {autoDescription}
        </p>
      )}
    </div>
  );
}

function WeightBar({ weightG, totalDoseG, weightCorrectionG = 0 }: { weightG: number; totalDoseG: number; weightCorrectionG?: number }) {
  const remaining = Math.max(0, weightG - totalDoseG + weightCorrectionG);
  const pct = Math.min(100, (remaining / weightG) * 100);
  const barColor = pct > 50 ? "var(--accent)" : pct > 25 ? "#FF9500" : "#FF3B30";

  return (
    <div className="px-6 py-4">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Weight</span>
        <span className="text-[17px]" style={{ color: "var(--text-secondary)" }}>
          ~{Math.round(remaining)}g left
        </span>
      </div>
      <div className="relative rounded-full overflow-hidden" style={{ height: 8, backgroundColor: "var(--divider)" }}>
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct.toFixed(1)}%`, backgroundColor: barColor }} />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
          {Math.round(pct)}% remaining
        </span>
        <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
          {weightG}g total{weightCorrectionG !== 0 ? ` · ${weightCorrectionG > 0 ? "+" : ""}${weightCorrectionG}g adjusted` : ""}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      className="px-4 mb-2 text-[13px] font-medium uppercase tracking-wide"
      style={{ color: "var(--text-secondary)" }}
    >
      {label}
    </p>
  );
}

export default async function BagDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bag, existingAnalysis] = await Promise.all([
    getBagById(Number(id)),
    getBagAnalysis(Number(id)),
  ]);
  if (!bag) notFound();

  const infoRows = [
    { label: "Roaster", value: bag.roaster },
    { label: "Roast Level", value: ROAST_LABELS[bag.roastLevel] ?? "—" },
    {
      label: "Process",
      value: PROCESS_LABELS[bag.processingMethod] ?? "—",
    },
    { label: "Roast Date", value: bag.roastDate },
    { label: "Purchase Date", value: bag.purchaseDate ?? "" },
    { label: "Shop", value: bag.purchaseShop ?? "" },
    { label: "Price", value: bag.price ? `$${bag.price}` : "" },
  ].filter((r) => r.value && r.value !== "—");

  return (
    <div className="pt-4 pb-8">
      {/* Nav header */}
      <div className="flex items-center justify-between px-4 mb-4">
        <Link
          href="/bags"
          className="flex items-center gap-1 text-[17px]"
          style={{ color: "var(--accent)" }}
        >
          <svg
            width="11"
            height="18"
            viewBox="0 0 11 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 1L1 9l8 8" />
          </svg>
          Bags
        </Link>
        <Link
          href={`/bags/${bag.id}/edit`}
          className="px-4 py-1.5 rounded-full text-[15px] font-medium"
          style={{
            backgroundColor: "var(--card-secondary)",
            color: "var(--text-primary)",
          }}
        >
          Edit
        </Link>
      </div>

      {/* Title */}
      <div className="px-4 mb-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
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
        <h1
          className="text-[34px] font-display leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {bag.name}
        </h1>
        <p
          className="text-[17px] mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          {bag.roaster}
        </p>
        <div className="mt-2">
          {bag.status === "active" ? (
            <FreshnessIndicator roastDate={bag.roastDate} peakStartDay={bag.peakStartDay} peakEndDay={bag.peakEndDay} />
          ) : (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--text-secondary)" }}
              />
              <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                Finished{bag.finishedDate ? ` · ${bag.finishedDate}` : ""}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-6">
        {/* Info */}
        {infoRows.length > 0 && (
          <div>
            <SectionHeader label="Details" />
            <div
              className="mx-4 rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}
            >
              {infoRows.map((row, i) => (
                <div key={row.label}>
                  {i > 0 && <Divider />}
                  <InfoRow label={row.label} value={row.value} />
                </div>
              ))}
              {bag.weightG != null && bag.status === "active" && (
                <>
                  {infoRows.length > 0 && <Divider />}
                  <WeightBar
                    weightG={bag.weightG}
                    totalDoseG={bag.totalDoseG ?? 0}
                    weightCorrectionG={bag.weightCorrectionG ?? 0}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Origins */}
        {bag.origins.length > 0 && (
          <div>
            <SectionHeader label={bag.origins.length > 1 ? "Origins" : "Origin"} />
            <div
              className="mx-4 rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}
            >
              {bag.origins.map((origin, i) => (
                <div key={origin.id}>
                  {i > 0 && <Divider />}
                  <div className="px-4 py-3">
                    <p
                      className="text-[17px] font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {origin.country}
                      {origin.region ? `, ${origin.region}` : ""}
                    </p>
                    {(origin.variety || origin.farm) && (
                      <p
                        className="text-[14px] mt-0.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {[origin.variety, origin.farm]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {origin.blendPercentage && (
                      <p
                        className="text-[14px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {origin.blendPercentage}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Freshness Timeline */}
        {bag.status === "active" && (
          <div>
            <SectionHeader label="Freshness Window" />
            <div
              className="mx-4 rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}
            >
              <FreshnessTimeline
                peakStartDay={bag.peakStartDay ?? 7}
                peakEndDay={bag.peakEndDay ?? 35}
                daysSinceRoast={getDaysSinceRoast(bag.roastDate)}
                isUserDefined={bag.peakStartDay != null}
                roastLevel={bag.roastLevel}
                processingMethod={bag.processingMethod}
                isDecaf={bag.isDecaf}
              />
            </div>
          </div>
        )}

        {/* Shot count */}
        <div>
          <SectionHeader label="History" />
          <div
            className="mx-4 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "var(--card)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            }}
          >
            <Link
              href={`/history?bagId=${bag.id}`}
              className="flex items-center justify-between px-6 min-h-[52px] active:opacity-70 transition-opacity"
            >
              <span
                className="text-[17px]"
                style={{ color: "var(--text-primary)" }}
              >
                Shots pulled
              </span>
              <span
                className="text-[17px] flex items-center gap-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {bag.shotCount ?? 0}
                <svg
                  width="8"
                  height="13"
                  viewBox="0 0 8 13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 1l6 5.5L1 12" />
                </svg>
              </span>
            </Link>
            {bag.avgShotRating != null && (
              <>
                <div className="ml-4" style={{ height: "1px", backgroundColor: "var(--divider)" }} />
                <div className="flex items-center justify-between px-6 min-h-[52px]">
                  <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Avg Shot Rating</span>
                  <span className="text-[17px]" style={{ color: "#FF9500" }}>
                    {"★".repeat(Math.round(bag.avgShotRating))}{"☆".repeat(5 - Math.round(bag.avgShotRating))} {bag.avgShotRating}
                  </span>
                </div>
              </>
            )}
            {bag.bestGrindRange != null && (
              <>
                <div className="ml-4" style={{ height: "1px", backgroundColor: "var(--divider)" }} />
                <div className="flex items-center justify-between px-6 min-h-[52px]">
                  <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Best Shot Grind</span>
                  <span className="text-[17px]" style={{ color: "var(--accent)" }}>
                    {bag.bestGrindRange.min === bag.bestGrindRange.max
                      ? bag.bestGrindRange.min
                      : `${bag.bestGrindRange.min} – ${bag.bestGrindRange.max}`}
                  </span>
                </div>
              </>
            )}
            {bag.referenceGrindRange != null && (
              <>
                <div className="ml-4" style={{ height: "1px", backgroundColor: "var(--divider)" }} />
                <div className="flex items-center justify-between px-6 min-h-[52px]">
                  <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Ref. Grind (prev bag)</span>
                  <span className="text-[17px]" style={{ color: "var(--text-secondary)" }}>
                    {bag.referenceGrindRange.min === bag.referenceGrindRange.max
                      ? bag.referenceGrindRange.min
                      : `${bag.referenceGrindRange.min} – ${bag.referenceGrindRange.max}`}
                  </span>
                </div>
              </>
            )}
            {bag.avgTasteBalance != null && (
              <>
                <div className="ml-4" style={{ height: "1px", backgroundColor: "var(--divider)" }} />
                <div className="flex items-center justify-between px-6 min-h-[52px]">
                  <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Avg Taste Balance</span>
                  <span className="text-[17px]" style={{ color: "var(--text-secondary)" }}>
                    {["", "Very Sour", "Sour", "Slightly Sour", "Balanced", "Slightly Bitter", "Bitter", "Very Bitter"][Math.round(bag.avgTasteBalance)] ?? `${bag.avgTasteBalance.toFixed(1)}/7`}
                  </span>
                </div>
              </>
            )}
            {bag.avgRetentionG != null && (
              <>
                <div className="ml-4" style={{ height: "1px", backgroundColor: "var(--divider)" }} />
                <div className="flex items-center justify-between px-6 min-h-[52px]">
                  <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Avg Retention</span>
                  <span className="text-[17px]" style={{ color: "var(--text-secondary)" }}>{bag.avgRetentionG}g</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {bag.notes && (
          <div>
            <SectionHeader label="Notes" />
            <div
              className="mx-4 rounded-2xl px-4 py-3"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}
            >
              <p
                className="text-[17px] leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--text-primary)" }}
              >
                {bag.notes}
              </p>
            </div>
          </div>
        )}

        {/* Dial-in tip — active bags only */}
        {bag.status === "active" && (
          <div>
            <SectionHeader label="Dial-in" />
            <BagDialInClient
              bagId={bag.id}
              shotCount={bag.shotCount ?? 0}
              existingTip={bag.dialInTip ?? null}
            />
          </div>
        )}

        {/* AI Bag Review — finished bags only */}
        {bag.status === "finished" && (
          <div>
            <SectionHeader label="AI Review" />
            <BagAnalysisClient bagId={bag.id} existingAnalysis={existingAnalysis} />
          </div>
        )}

        {/* Add same coffee shortcut */}
        <div>
          <Link
            href={`/bags/new?from=${bag.id}`}
            className="mx-4 flex items-center justify-center py-3 rounded-full text-[17px] font-medium active:opacity-70 transition-opacity"
            style={{ backgroundColor: "var(--card)", color: "var(--accent)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
          >
            + New bag of same coffee
          </Link>
        </div>

        {/* Actions */}
        {bag.status !== "removed" && (
          <BagActions bagId={bag.id} status={bag.status} />
        )}
      </div>
    </div>
  );
}
