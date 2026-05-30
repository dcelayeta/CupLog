import { notFound } from "next/navigation";
import Link from "next/link";
import { getShotById, getLatestShotId } from "@/lib/shots/queries";
import { getShotPositionInHistory } from "@/lib/analysis/queries";
import { DRINK_DEFAULTS, detectEspressoBase } from "@/lib/shots/drinkDetection";
import { getAnalysisForShot } from "@/lib/analysis/queries";
import ClassificationBadge from "@/components/shots/ClassificationBadge";
import ClientDateTime from "@/components/ClientDateTime";
import { getFreshnessLabel, getFreshnessColor, FRESHNESS_CSS } from "@/lib/bags/freshness";
import TasteBalanceDisplay from "@/components/shots/TasteBalanceDisplay";
import ShotAnalysisClient from "@/components/shots/ShotAnalysisClient";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DetailRow({ label, value, noDivider }: { label: string; value: React.ReactNode; noDivider?: boolean }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div
      className={`${noDivider ? "" : "row-divider "}flex items-center px-6 min-h-[52px]`}
    >
      <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>
        {label}
      </span>
      <span className="text-[17px]" style={{ color: "var(--text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}

const MAX_DRINK_ML = 300;

function DrinkCompositionBar({ espressoMl, milkMl, foamMl, hotWaterMl, hasChocolate, hasIceCream, hasChai }: {
  espressoMl: number; milkMl: number; foamMl: number; hotWaterMl: number;
  hasChocolate: boolean; hasIceCream: boolean; hasChai: boolean;
}) {
  const chaiMl = hasChai ? 30 : 0;
  const chocolateMl = hasChocolate ? 10 : 0;
  const iceCreamMl = hasIceCream ? 60 : 0;
  const filled = espressoMl + chaiMl + chocolateMl + hotWaterMl + milkMl + iceCreamMl + foamMl;
  const empty = Math.max(0, MAX_DRINK_ML - filled);
  const segments = [
    { ml: espressoMl, color: "var(--drink-espresso)" },
    { ml: chaiMl,     color: "var(--drink-chai)" },
    { ml: chocolateMl,color: "#79564d" },
    { ml: hotWaterMl, color: "#a0cee7" },
    { ml: milkMl,     color: "#f3f2f6" },
    { ml: iceCreamMl, color: "#d2d3c4" },
    { ml: foamMl,     color: "#fefce6" },
    { ml: empty,      color: "#c9c9ce" },
  ].filter((s) => s.ml > 0);
  return (
    <div className="flex overflow-hidden rounded-full" style={{ height: 12 }}>
      {segments.map((seg, i) => (
        <div key={i} style={{ width: `${(seg.ml / MAX_DRINK_ML) * 100}%`, backgroundColor: seg.color, flexShrink: 0 }} />
      ))}
    </div>
  );
}

const FLOW_LABELS: Record<string, string> = {
  normal: "Normal",
  one_spout_dominant: "One spout dominant",
  both_spouts_uneven: "Both spouts uneven",
  spraying: "Spraying",
  dripping_restricted: "Dripping / Restricted",
  very_fast: "Very fast",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {title}
      </p>
    </div>
  );
}

export default async function ShotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [shot, existingAnalysis, latestShotId] = await Promise.all([
    getShotById(Number(id)),
    getAnalysisForShot(Number(id)),
    getLatestShotId(),
  ]);
  if (!shot) notFound();
  const { shotNumber } = await getShotPositionInHistory(Number(id), shot.pulledAt);
  const brewRatio = shot.yieldG != null ? shot.yieldG / shot.doseG : null;
  const espressoBase = shot.yieldG != null ? detectEspressoBase(shot.doseG, shot.yieldG) : null;
  const flowRate = shot.yieldG != null && shot.shotTimeSeconds != null && shot.shotTimeSeconds > 0
    ? (shot.yieldG / shot.shotTimeSeconds).toFixed(2)
    : null;
  const shotDate = new Date(shot.pulledAt.slice(0, 10) + "T00:00:00");
  const roastDate = new Date(shot.bagRoastDate + "T00:00:00");
  const daysSinceRoast = Math.floor((shotDate.getTime() - roastDate.getTime()) / (1000 * 60 * 60 * 24));
  const peakStart = shot.bagPeakStartDay ?? undefined;
  const peakEnd = shot.bagPeakEndDay ?? undefined;
  const freshnessColor = FRESHNESS_CSS[getFreshnessColor(daysSinceRoast, peakStart, peakEnd)];
  const freshnessLabel = getFreshnessLabel(daysSinceRoast, peakStart, peakEnd);

  return (
    <div className="pt-4 pb-24">
      {/* Back + Edit */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <Link
          href="/history"
          className="text-[17px] flex items-center gap-1"
          style={{ color: "var(--accent)" }}
        >
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1L1 8.5L9 16" />
          </svg>
          History
        </Link>
        <Link href={`/history/${shot.id}/edit`} className="text-[17px] font-medium" style={{ color: "var(--accent)" }}>
          Edit
        </Link>
      </div>

      {/* Header */}
      <div className="px-4 mb-4">
        <h1 className="text-[28px] font-bold" style={{ color: "var(--text-primary)" }}>
          {shot.roasterName} · {shot.bagName}
        </h1>
        <p className="text-[15px] mt-1" style={{ color: "var(--text-secondary)" }}>
          <ClientDateTime iso={shot.pulledAt} />{" "}
          <span style={{ color: shot.id === latestShotId ? "#007AFF" : "var(--text-secondary)" }}>
            (Shot {shotNumber}{shot.id === latestShotId ? " — Latest shot" : ""})
          </span>
        </p>
      </div>

      {/* Classifications + freshness */}
      <div className="px-4 mb-3 flex gap-2 flex-wrap">
        {espressoBase && (
          <span
            style={{
              display: "inline-block",
              backgroundColor: "var(--card-secondary)",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 20,
              paddingLeft: 10,
              paddingRight: 10,
              paddingTop: 3,
              paddingBottom: 3,
              lineHeight: 1.3,
            }}
          >
            {espressoBase}
          </span>
        )}
        <ClassificationBadge classification={shot.timeClassification} />
        <ClassificationBadge classification={shot.ratioClassification} />
        <span
          style={{
            display: "inline-block",
            backgroundColor: freshnessColor + "22",
            color: freshnessColor,
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 20,
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 3,
            paddingBottom: 3,
            lineHeight: 1.3,
          }}
        >
          Day {daysSinceRoast} · {freshnessLabel}
        </span>
      </div>

      {/* Shot details */}
      <SectionHeader title="Shot" />
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        <DetailRow label="Dose" value={`${shot.doseG}g`} />
        <DetailRow label="Yield" value={shot.yieldG != null ? `${shot.yieldG}g` : "—"} />
        <DetailRow label="Brew Ratio" value={brewRatio != null ? `1:${brewRatio.toFixed(2)}` : "—"} />
        <DetailRow label="Shot Time" value={shot.shotTimeSeconds != null ? `${shot.shotTimeSeconds}s` : "—"} />
        {flowRate !== null && (
          <DetailRow label="Flow Rate" value={`${flowRate} g/s`} />
        )}
        {shot.flowCharacteristics != null && (
          <DetailRow label="Flow" value={FLOW_LABELS[shot.flowCharacteristics] ?? shot.flowCharacteristics} />
        )}
        {shot.lagG !== null && shot.yieldG != null && (
          <DetailRow
            label="Stopped at"
            value={`${(shot.yieldG - shot.lagG).toFixed(1)}g (+${shot.lagG}g drip)`}
          />
        )}
        {shot.grindSetting !== null && (
          <DetailRow label="Grind Setting" value={shot.grindSetting} />
        )}
        {shot.preinfusionSeconds !== null && (
          <DetailRow label="Pre-infusion" value={`${shot.preinfusionSeconds}s`} />
        )}
        {shot.temperatureC !== null && (
          <DetailRow label="Temperature" value={`${shot.temperatureC}°C`} />
        )}
        {shot.springWeightLbs !== null && (
          <DetailRow label="Spring Weight" value={`${shot.springWeightLbs} lbs`} />
        )}
        {shot.grinderRetentionG !== null && (
          <DetailRow label="Grinder Retention" value={`${shot.grinderRetentionG}g`} />
        )}
        <div
          className="flex items-center px-6 min-h-[52px]"
        >
          <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>WDT Used</span>
          <span className="text-[17px]" style={{ color: "var(--text-secondary)" }}>
            {shot.wdtUsed ? "Yes" : "No"}
          </span>
        </div>
      </div>

      {/* Taste */}
      {(shot.tasteBalance !== null || shot.shotRating !== null) && (
        <>
          <SectionHeader title="Taste" />
          <div
            className="mx-4 rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
          >
            {shot.tasteBalance !== null && (
              <div className={`px-6 py-3${shot.shotRating !== null ? " row-divider" : ""}`}>
                <p className="text-[17px] mb-2" style={{ color: "var(--text-primary)" }}>Balance</p>
                <TasteBalanceDisplay value={shot.tasteBalance} />
              </div>
            )}
            {shot.shotRating !== null && (
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[17px]" style={{ color: "var(--text-primary)" }}>Shot Rating</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className="text-[28px] leading-none"
                        style={{ color: shot.shotRating !== null && n <= shot.shotRating ? "#FF9500" : "var(--card-secondary)" }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Shot Notes */}
      {shot.notes && (
        <>
          <SectionHeader title="Notes" />
          <div
            className="mx-4 rounded-2xl px-4 py-3"
            style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
          >
            <p className="text-[17px]" style={{ color: "var(--text-primary)" }}>{shot.notes}</p>
          </div>
        </>
      )}

      {/* Drink */}
      {shot.drink && (
        <>
          <SectionHeader title="Drink" />
          <div
            className="mx-4 rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
          >
            {shot.drink.detectedDrinkName && (
              <DetailRow label="Drink" value={shot.drink.detectedDrinkName} noDivider />
            )}
            {/* Composition bar — no dividers above or below */}
            <div className="px-6 py-3">
              {(() => {
                const defaults = shot.drink!.detectedDrinkName
                  ? DRINK_DEFAULTS[shot.drink!.detectedDrinkName as keyof typeof DRINK_DEFAULTS]
                  : null;
                return (
                  <DrinkCompositionBar
                    espressoMl={shot.yieldG ?? 0}
                    milkMl={shot.drink!.milkQuantityMl ?? 0}
                    foamMl={shot.drink!.foamMl ?? 0}
                    hotWaterMl={shot.drink!.hotWaterMl ?? 0}
                    hasChocolate={defaults?.hasChocolate ?? false}
                    hasIceCream={defaults?.hasIceCream ?? false}
                    hasChai={defaults?.hasChai ?? false}
                  />
                );
              })()}
            </div>
            {shot.drink.milkType && (
              <DetailRow label="Milk" value={shot.drink.milkType} />
            )}
            {shot.drink.milkQuantityMl !== null && (
              <DetailRow label="Milk Quantity" value={`${shot.drink.milkQuantityMl}ml`} />
            )}
            {shot.drink.foamMl !== null && (
              <DetailRow label="Foam" value={`${shot.drink.foamMl}ml`} />
            )}
            {shot.drink.hotWaterMl !== null && (
              <DetailRow label="Hot Water" value={`${shot.drink.hotWaterMl}ml`} />
            )}
            {shot.drink.overallRating !== null && (
              <div
                className="row-divider px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[17px]" style={{ color: "var(--text-primary)" }}>Overall Rating</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className="text-[28px] leading-none"
                        style={{ color: shot.drink!.overallRating !== null && n <= shot.drink!.overallRating ? "#FF9500" : "var(--card-secondary)" }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {shot.drink.notes && (
              <div className="px-4 py-3">
                <p className="text-[17px]" style={{ color: "var(--text-primary)" }}>{shot.drink.notes}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* AI Analysis */}
      <SectionHeader title="Analysis" />
      <ShotAnalysisClient shotId={shot.id} existingAnalysis={existingAnalysis} />

      {/* Bean info */}
      <SectionHeader title="Bean" />
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        <DetailRow label="Roaster" value={shot.roasterName} />
        <DetailRow label="Bean" value={shot.bagName} />
        <DetailRow label="Days Since Roast" value={`${daysSinceRoast} days — ${freshnessLabel}`} />
        <div className="flex items-center px-6 min-h-[52px]">
          <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Roast Date</span>
          <Link href={`/bags/${shot.bagId}`} className="text-[17px]" style={{ color: "var(--accent)" }}>
            {shot.bagRoastDate}
          </Link>
        </div>
      </div>
    </div>
  );
}
