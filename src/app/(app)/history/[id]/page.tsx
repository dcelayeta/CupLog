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
import FlowIllustration from "@/components/shots/FlowIllustration";


function DetailRow({ label, value, noDivider }: { label: string; value: React.ReactNode; noDivider?: boolean }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={`${noDivider ? "" : "row-divider "}flex items-center px-6 min-h-[52px]`}>
      <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>
        {label}
      </span>
      <span className="text-[17px]" style={{ color: "var(--text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}

function CalcBand({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-6 py-2.5 flex items-center gap-3 flex-wrap"
      style={{ backgroundColor: "var(--card-secondary)", borderBottom: "1px solid var(--separator)" }}
    >
      {children}
    </div>
  );
}

function CalcText({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{children}</span>
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

const LATTE_ART_LABELS: Record<string, string> = {
  pollock: "Pollock",
  calder: "Calder",
  picasso: "Picasso",
  monet: "Monet",
  van_gogh: "Van Gogh",
};

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
  const adjDose = shot.grinderRetentionG != null ? shot.doseG - shot.grinderRetentionG : null;
  const brewRatio = shot.yieldG != null
    ? shot.yieldG / (adjDose ?? shot.doseG)
    : null;
  const espressoBase = shot.yieldG != null ? detectEspressoBase(shot.doseG, shot.yieldG) : null;
  const flowRate = shot.yieldG != null && shot.shotTimeSeconds != null && shot.shotTimeSeconds > 0
    ? (shot.yieldG / shot.shotTimeSeconds).toFixed(2)
    : null;
  const hasMetrics = brewRatio !== null || flowRate !== null
    || !!shot.timeClassification || !!shot.ratioClassification;
  const shotLocalDate = new Date(shot.pulledAt).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const shotDate = new Date(shotLocalDate + "T00:00:00");
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

      {/* Failed shot banner */}
      {shot.isFailed && (
        <div className="mx-4 mb-3 px-4 py-2.5 rounded-2xl flex items-center gap-2" style={{ backgroundColor: "#FF3B3022", border: "1px solid #FF3B3044" }}>
          <span className="text-[15px] font-semibold" style={{ color: "#FF3B30" }}>Failed Shot</span>
          {shot.failReason && (
            <span className="text-[14px]" style={{ color: "#FF3B30AA" }}>
              · {{
                channeling: "Channeling",
                choking: "Choking",
                puck_collapse: "Puck Collapse",
                grind_error: "Grind Error",
                equipment_issue: "Equipment Issue",
                other: "Other",
              }[shot.failReason] ?? shot.failReason}
            </span>
          )}
        </div>
      )}

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

      {/* Parameters locked */}
      {shot.isLocked && (
        <div
          className="mx-4 mb-3 flex items-center gap-2 px-4 py-3 rounded-2xl"
          style={{ backgroundColor: "#AF52DE18" }}
        >
          <svg width="13" height="16" viewBox="0 0 13 16" fill="#AF52DE">
            <rect x="1" y="7" width="11" height="9" rx="1.5" />
            <path d="M3.5 7V5a3 3 0 0 1 6 0v2" stroke="#AF52DE" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
          <p className="text-[15px] font-medium" style={{ color: "#AF52DE" }}>Parameters locked</p>
        </div>
      )}

      {/* Shot details */}
      <SectionHeader title="Shot" />
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        {/* Grind → Dose → Retention */}
        {shot.grindSetting !== null && (
          <DetailRow label="Grind Setting" value={shot.grindSetting} />
        )}
        <DetailRow label="Dose" value={`${shot.doseG}g`} />
        {shot.grinderRetentionG !== null && (
          <>
            <DetailRow label="Grinder Retention" value={`${shot.grinderRetentionG}g`} noDivider />
            <CalcBand>
              <CalcText>Adjusted dose {adjDose!.toFixed(1)}g</CalcText>
            </CalcBand>
          </>
        )}

        {/* Prep */}
        <DetailRow label="WDT Used" value={shot.wdtUsed ? "Yes" : "No"} />
        <DetailRow label="Distribution Tool" value={shot.distributionToolUsed ? "Yes" : "No"} />
        {shot.springWeightLbs !== null && (
          <DetailRow label="Spring Weight" value={`${shot.springWeightLbs} lbs`} />
        )}

        {/* Pull */}
        {shot.preinfusionSeconds !== null && (
          <DetailRow label="Pre-infusion" value={`${shot.preinfusionSeconds}s`} />
        )}
        {shot.flowCharacteristics != null && (
          <>
            <DetailRow label="Flow" value={FLOW_LABELS[shot.flowCharacteristics] ?? shot.flowCharacteristics} />
            <div className="py-2">
              <FlowIllustration flow={shot.flowCharacteristics} />
            </div>
          </>
        )}
        <DetailRow label="Shot Time" value={shot.shotTimeSeconds != null ? `${shot.shotTimeSeconds}s` : "—"} />
        {shot.lagG !== null && shot.yieldG !== null && (
          <DetailRow
            label="Stopped at"
            value={`${(shot.yieldG - shot.lagG).toFixed(1)}g (+${shot.lagG}g drip)`}
          />
        )}

        {/* Yield → calculated metrics */}
        <DetailRow
          label="Yield"
          value={shot.yieldG != null ? `${shot.yieldG}g` : "—"}
          noDivider={hasMetrics}
        />
        {hasMetrics && (
          <CalcBand>
            {brewRatio !== null && (
              <CalcText>Ratio 1:{brewRatio.toFixed(2)}</CalcText>
            )}
            {flowRate !== null && (
              <CalcText>{flowRate} g/s</CalcText>
            )}
            <ClassificationBadge classification={shot.timeClassification} size="sm" />
            <ClassificationBadge classification={shot.ratioClassification} size="sm" />
          </CalcBand>
        )}
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
            {shot.drink.latteArtRating && (
              <div className="row-divider px-6 min-h-[52px] flex items-center justify-between">
                <p className="text-[17px]" style={{ color: "var(--text-primary)" }}>Latte Art</p>
                <span
                  className="text-[13px] font-semibold px-3 py-1 rounded-full"
                  style={{ backgroundColor: "#AF52DE22", color: "#AF52DE" }}
                >
                  {LATTE_ART_LABELS[shot.drink.latteArtRating] ?? shot.drink.latteArtRating}
                </span>
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
