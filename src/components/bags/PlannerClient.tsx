"use client";

import { useState, useEffect } from "react";
import { estimatePeakWindow, describePeakWindow, getDaysSinceRoast } from "@/lib/bags/freshness";
import type { RoastLevel, ProcessingMethod } from "@/lib/bags/freshness";
import type { BagWithOrigins } from "@/lib/bags/queries";
import type { ShotDosageRecord } from "@/lib/shots/queries";

const ROAST_LEVELS: { value: RoastLevel; label: string }[] = [
  { value: "unspecified", label: "Unspecified" },
  { value: "light", label: "Light" },
  { value: "medium_light", label: "Medium Light" },
  { value: "medium", label: "Medium" },
  { value: "medium_dark", label: "Medium Dark" },
  { value: "dark", label: "Dark" },
];

const PROCESSING_METHODS: { value: ProcessingMethod; label: string }[] = [
  { value: "unspecified", label: "Unspecified" },
  { value: "washed", label: "Washed" },
  { value: "natural", label: "Natural" },
  { value: "honey", label: "Honey" },
  { value: "anaerobic", label: "Anaerobic" },
  { value: "ea_washed", label: "EA Washed (Decaf)" },
  { value: "swiss_water", label: "Swiss Water (Decaf)" },
  { value: "other", label: "Other" },
];

const URGENCY_WEIGHTS = { stale: 4, use_soon: 3, peak: 2, degassing: 1, resting: 0 } as const;
type UrgencyZone = keyof typeof URGENCY_WEIGHTS;

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(str: string) {
  return new Date(str + "T00:00:00");
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtRange(earliest: Date, latest: Date): string {
  if (
    earliest.getMonth() === latest.getMonth() &&
    earliest.getFullYear() === latest.getFullYear()
  ) {
    return `${fmtShort(earliest)} – ${latest.getDate()}`;
  }
  return `${fmtShort(earliest)} – ${fmtShort(latest)}`;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

type BagWindow = {
  id: number;
  label: string;
  roast: Date;
  peakStart: Date;
  midPeak: Date;
  peakEnd: Date;
  useSoonEnd: Date;
};

function buildWindow(roast: Date, startDay: number, endDay: number) {
  return {
    roast,
    peakStart: addDays(roast, startDay),
    midPeak: addDays(roast, Math.round((startDay + endDay) / 2)),
    peakEnd: addDays(roast, endDay),
    useSoonEnd: addDays(roast, endDay + 10),
  };
}

function getUrgencyZone(daysSinceRoast: number, peakStartDay: number, peakEndDay: number): UrgencyZone {
  if (daysSinceRoast < 0) return "resting";
  if (daysSinceRoast < peakStartDay) return "degassing";
  if (daysSinceRoast <= peakEndDay) return "peak";
  if (daysSinceRoast <= peakEndDay + 10) return "use_soon";
  return "stale";
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {title}
      </p>
    </div>
  );
}

type RunOutRange = { earliest: Date; latest: Date };

type BagComputed = {
  id: number;
  label: string;
  bag: BagWithOrigins;
  bw: BagWindow;
  zone: UrgencyZone;
  urgencyWeight: number;
  allocatedRate: number | null;
  remainingG: number | null;
  runOutRange: RunOutRange | null;
};

export default function PlannerClient({
  activeBags,
  shotDosageHistory,
}: {
  activeBags: BagWithOrigins[];
  shotDosageHistory: ShotDosageRecord[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Candidate form state ─────────────────────────────────────────────────────
  const [roastDate, setRoastDate] = useState(toDateStr(today));
  const [roastLevel, setRoastLevel] = useState<RoastLevel>("medium");
  const [processingMethod, setProcessingMethod] = useState<ProcessingMethod>("washed");
  const [isDecaf, setIsDecaf] = useState(false);
  const [candidateWeightRaw, setCandidateWeightRaw] = useState(300);
  const [weightUnit, setWeightUnit] = useState<"g" | "oz">("g");

  const handleUnitToggle = (newUnit: "g" | "oz") => {
    if (newUnit === weightUnit) return;
    if (newUnit === "oz") setCandidateWeightRaw(Math.round((candidateWeightRaw / 28.3495) * 10) / 10);
    else setCandidateWeightRaw(Math.round(candidateWeightRaw * 28.3495));
    setWeightUnit(newUnit);
  };
  const candidateWeightG = weightUnit === "oz" ? Math.round(candidateWeightRaw * 28.3495) : candidateWeightRaw;

  // ── Rolling window (persisted to localStorage) ───────────────────────────────
  const [rollingWindowDays, setRollingWindowDays] = useState(20);
  useEffect(() => {
    const saved = localStorage.getItem("planner_rolling_window");
    if (saved) {
      const v = parseInt(saved);
      if (!isNaN(v) && v >= 5 && v <= 45) setRollingWindowDays(v);
    }
  }, []);
  const handleWindowChange = (days: number) => {
    setRollingWindowDays(days);
    localStorage.setItem("planner_rolling_window", String(days));
  };

  // ── Candidate derived values ─────────────────────────────────────────────────
  const isDecafMethod = processingMethod === "ea_washed" || processingMethod === "swiss_water";
  const effectiveIsDecaf = isDecaf || isDecafMethod;
  const { peakStartDay, peakEndDay } = estimatePeakWindow(roastLevel, processingMethod, effectiveIsDecaf);
  const candidateRoast = parseDate(roastDate || toDateStr(today));
  const candidate = buildWindow(candidateRoast, peakStartDay, peakEndDay);

  // ── Rate computation from shot history ───────────────────────────────────────
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - rollingWindowDays);

  const inWindow = shotDosageHistory.filter((s) => new Date(s.pulledAt) >= cutoff);
  const cafShots = inWindow.filter((s) => !s.isDecaf);
  const decafShots = inWindow.filter((s) => s.isDecaf);

  const cafTotalDose = cafShots.reduce((sum, s) => sum + s.doseG, 0);
  const decafTotalDose = decafShots.reduce((sum, s) => sum + s.doseG, 0);

  const cafSufficient = cafShots.length >= 3;
  const decafSufficient = decafShots.length >= 3;
  const cafRate = cafSufficient ? Math.round((cafTotalDose / rollingWindowDays) * 10) / 10 : null;
  const decafRate = decafSufficient ? Math.round((decafTotalDose / rollingWindowDays) * 10) / 10 : null;

  // ── Bag windows for timeline (all active bags) ───────────────────────────────
  const bagWindows: BagWindow[] = activeBags.map((bag) => {
    const { peakStartDay: ps, peakEndDay: pe } =
      bag.peakStartDay != null && bag.peakEndDay != null
        ? { peakStartDay: bag.peakStartDay, peakEndDay: bag.peakEndDay }
        : estimatePeakWindow(
            (bag.roastLevel as RoastLevel) || "unspecified",
            (bag.processingMethod as ProcessingMethod) || "unspecified",
            bag.isDecaf
          );
    return {
      id: bag.id,
      label: `${bag.roaster} · ${bag.name}`,
      ...buildWindow(parseDate(bag.roastDate), ps, pe),
    };
  });

  // ── Caf bags: urgency-weighted consumption split ─────────────────────────────
  const activeCafBagsRaw = activeBags.filter((b) => !b.isDecaf);
  const activeCafBagsTagged = activeCafBagsRaw.map((bag) => {
    const { peakStartDay: ps, peakEndDay: pe } =
      bag.peakStartDay != null && bag.peakEndDay != null
        ? { peakStartDay: bag.peakStartDay, peakEndDay: bag.peakEndDay }
        : estimatePeakWindow(
            (bag.roastLevel as RoastLevel) || "unspecified",
            (bag.processingMethod as ProcessingMethod) || "unspecified",
            false
          );
    const days = getDaysSinceRoast(bag.roastDate);
    const zone = getUrgencyZone(days, ps, pe);
    return { bag, zone, urgencyWeight: URGENCY_WEIGHTS[zone] };
  });

  const totalCafUrgencyWeight = activeCafBagsTagged
    .filter((b) => b.urgencyWeight > 0)
    .reduce((s, b) => s + b.urgencyWeight, 0);

  const cafBagsComputed: BagComputed[] = activeCafBagsTagged.map(({ bag, zone, urgencyWeight }) => {
    const bw = bagWindows.find((w) => w.id === bag.id)!;
    const allocatedRate =
      cafRate != null && totalCafUrgencyWeight > 0 && urgencyWeight > 0
        ? Math.round((cafRate * (urgencyWeight / totalCafUrgencyWeight)) * 10) / 10
        : null;
    const totalWeight = (bag.weightG ?? 0) + (bag.weightCorrectionG ?? 0);
    const remainingG = bag.weightG != null ? Math.max(0, totalWeight - (bag.totalDoseG ?? 0)) : null;
    const runOutRange: RunOutRange | null =
      remainingG != null && allocatedRate != null && allocatedRate > 0
        ? {
            earliest: addDays(today, Math.round(remainingG / (allocatedRate * 1.2))),
            latest: addDays(today, Math.round(remainingG / (allocatedRate * 0.8))),
          }
        : null;
    return {
      id: bag.id,
      label: `${bag.roaster} · ${bag.name}`,
      bag,
      bw,
      zone,
      urgencyWeight,
      allocatedRate,
      remainingG: remainingG != null ? Math.round(remainingG) : null,
      runOutRange,
    };
  });

  // ── Decaf bags: run at full decaf rate ───────────────────────────────────────
  const decafBagsComputed: BagComputed[] = activeBags
    .filter((b) => b.isDecaf)
    .map((bag) => {
      const bw = bagWindows.find((w) => w.id === bag.id)!;
      const { peakStartDay: ps, peakEndDay: pe } =
        bag.peakStartDay != null && bag.peakEndDay != null
          ? { peakStartDay: bag.peakStartDay, peakEndDay: bag.peakEndDay }
          : estimatePeakWindow(
              (bag.roastLevel as RoastLevel) || "unspecified",
              (bag.processingMethod as ProcessingMethod) || "unspecified",
              true
            );
      const days = getDaysSinceRoast(bag.roastDate);
      const zone = getUrgencyZone(days, ps, pe);
      const totalWeight = (bag.weightG ?? 0) + (bag.weightCorrectionG ?? 0);
      const remainingG = bag.weightG != null ? Math.max(0, totalWeight - (bag.totalDoseG ?? 0)) : null;
      const runOutRange: RunOutRange | null =
        remainingG != null && decafRate != null && decafRate > 0
          ? {
              earliest: addDays(today, Math.round(remainingG / (decafRate * 1.2))),
              latest: addDays(today, Math.round(remainingG / (decafRate * 0.8))),
            }
          : null;
      return {
        id: bag.id,
        label: `${bag.roaster} · ${bag.name}`,
        bag,
        bw,
        zone,
        urgencyWeight: URGENCY_WEIGHTS[zone],
        allocatedRate: decafRate,
        remainingG: remainingG != null ? Math.round(remainingG) : null,
        runOutRange,
      };
    });

  // Combined run-out map for timeline
  const allBagsRunOuts = new Map<number, { remainingG: number; runOutRange: RunOutRange } | null>(
    [...cafBagsComputed, ...decafBagsComputed].map((b) => [
      b.id,
      b.runOutRange != null && b.remainingG != null
        ? { remainingG: b.remainingG, runOutRange: b.runOutRange }
        : null,
    ])
  );

  // ── Candidate run-out range ──────────────────────────────────────────────────
  const relevantRate = effectiveIsDecaf ? decafRate : cafRate;
  const candidateRunOutRange: RunOutRange | null =
    relevantRate != null && relevantRate > 0
      ? {
          earliest: addDays(candidate.peakStart, Math.round(candidateWeightG / (relevantRate * 1.2))),
          latest: addDays(candidate.peakStart, Math.round(candidateWeightG / (relevantRate * 0.8))),
        }
      : null;

  // ── Peak pipeline ────────────────────────────────────────────────────────────
  const candidatePeakWindowStart = new Date(Math.max(candidate.peakStart.getTime(), today.getTime()));
  const candidatePeakWindowDays = Math.max(0, daysBetween(candidatePeakWindowStart, candidate.peakEnd));
  const candidatePeakGrams =
    relevantRate != null
      ? Math.min(candidateWeightG, Math.round(candidatePeakWindowDays * relevantRate))
      : null;

  const existingPeakGrams = [...cafBagsComputed, ...decafBagsComputed]
    .filter((b) => b.allocatedRate != null && b.remainingG != null)
    .map((b) => {
      const windowStart = new Date(Math.max(b.bw.peakStart.getTime(), today.getTime()));
      const runOutEnd = b.runOutRange ? b.runOutRange.latest : b.bw.peakEnd;
      const windowEnd = new Date(Math.min(b.bw.peakEnd.getTime(), runOutEnd.getTime()));
      const daysInPeak = Math.max(0, daysBetween(windowStart, windowEnd));
      return Math.round(daysInPeak * (b.allocatedRate ?? 0));
    });

  const totalExistingPeakGrams = existingPeakGrams.reduce((s, g) => s + g, 0);
  const totalPeakGrams =
    candidatePeakGrams != null ? totalExistingPeakGrams + candidatePeakGrams : totalExistingPeakGrams;
  const totalDailyRate = (cafRate ?? 0) + (decafRate ?? 0);
  const daysOfPeakCoffee =
    totalDailyRate > 0 && (cafRate != null || decafRate != null)
      ? Math.round(totalPeakGrams / totalDailyRate)
      : null;

  // ── Timeline window ──────────────────────────────────────────────────────────
  const timelineWindowStart = addDays(today, -7);
  let timelineWindowEnd = addDays(candidate.useSoonEnd, 14);
  for (const bw of bagWindows) {
    const e = addDays(bw.useSoonEnd, 14);
    if (e > timelineWindowEnd) timelineWindowEnd = e;
  }
  for (const b of [...cafBagsComputed, ...decafBagsComputed]) {
    if (b.runOutRange) {
      const e = addDays(b.runOutRange.latest, 7);
      if (e > timelineWindowEnd) timelineWindowEnd = e;
    }
  }
  if (candidateRunOutRange) {
    const e = addDays(candidateRunOutRange.latest, 7);
    if (e > timelineWindowEnd) timelineWindowEnd = e;
  }

  const totalMs = timelineWindowEnd.getTime() - timelineWindowStart.getTime();
  const toPct = (d: Date) =>
    Math.max(0, Math.min(100, ((d.getTime() - timelineWindowStart.getTime()) / totalMs) * 100));

  const monthMarkers: { pct: number; label: string }[] = [];
  const mCursor = new Date(timelineWindowStart.getFullYear(), timelineWindowStart.getMonth() + 1, 1);
  while (mCursor < timelineWindowEnd) {
    monthMarkers.push({
      pct: toPct(new Date(mCursor)),
      label: mCursor.toLocaleDateString("en-US", { month: "short" }),
    });
    mCursor.setMonth(mCursor.getMonth() + 1);
  }
  const todayPct = toPct(today);

  // ── Gap / overlap analysis ───────────────────────────────────────────────────
  const daysUntilPeak = daysBetween(today, candidate.peakStart);
  const daysPastPeak = daysBetween(candidate.peakEnd, today);

  const latestBagPeakEnd = bagWindows.reduce<Date | null>(
    (acc, bw) => (acc === null || bw.peakEnd > acc ? bw.peakEnd : acc),
    null
  );
  const latestBagUseSoonEnd = bagWindows.reduce<Date | null>(
    (acc, bw) => (acc === null || bw.useSoonEnd > acc ? bw.useSoonEnd : acc),
    null
  );
  const gapDays = latestBagPeakEnd ? daysBetween(latestBagPeakEnd, candidate.peakStart) : null;
  const deadZoneDays =
    latestBagUseSoonEnd && gapDays !== null && gapDays > 0
      ? Math.max(0, daysBetween(latestBagUseSoonEnd, candidate.peakStart))
      : 0;

  const bagOverlaps = bagWindows
    .map((bw) => {
      const overlapStart = Math.max(bw.peakStart.getTime(), candidate.peakStart.getTime());
      const overlapEnd = Math.min(bw.peakEnd.getTime(), candidate.peakEnd.getTime());
      const days = Math.max(0, Math.round((overlapEnd - overlapStart) / 86400000));
      return { label: bw.label, days };
    })
    .filter((b) => b.days > 0);

  const simultaneousPeakDays = Math.max(0, gapDays !== null ? -gapDays : 0);

  // ── Buy date recommendation ──────────────────────────────────────────────────
  const relevantRateForBuy = effectiveIsDecaf ? decafRate : cafRate;
  const buyOnDate =
    relevantRateForBuy != null && relevantRateForBuy > 0
      ? addDays(candidate.peakStart, -Math.round(candidateWeightG / relevantRateForBuy))
      : null;
  const daysUntilBuyOn = buyOnDate ? daysBetween(today, buyOnDate) : null;

  type BuyState = "buy_now" | "good" | "too_early";
  const buyState: BuyState | null = (() => {
    if (!buyOnDate || daysUntilBuyOn == null) return null;
    if (daysUntilBuyOn <= 3) return "buy_now";
    if (simultaneousPeakDays >= 14) return "too_early";
    return "good";
  })();

  // ── Render helpers ───────────────────────────────────────────────────────────
  const BAR_H = 10;

  function renderBar(
    w: ReturnType<typeof buildWindow>,
    isCandidate = false,
    runOutRange?: RunOutRange
  ) {
    const segments: { startPct: number; widthPct: number; color: string; opacity: number }[] = [];
    const addSeg = (a: Date, b: Date, color: string, opacity: number) => {
      const s = toPct(a);
      const e = toPct(b);
      if (e - s > 0) segments.push({ startPct: s, widthPct: e - s, color, opacity });
    };

    addSeg(w.roast, w.peakStart, "#8E8E93", 0.35);
    addSeg(w.peakStart, w.midPeak, "#30D158", isCandidate ? 0.6 : 1);
    addSeg(w.midPeak, w.peakEnd, "#248A3D", isCandidate ? 0.6 : 1);
    addSeg(w.peakEnd, w.useSoonEnd, "#FF9500", isCandidate ? 0.6 : 1);

    const rp1 = runOutRange ? toPct(runOutRange.earliest) : null;
    const rp2 = runOutRange ? toPct(runOutRange.latest) : null;
    const rpMid = rp1 != null && rp2 != null ? (rp1 + rp2) / 2 : null;

    return (
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          height: BAR_H,
          backgroundColor: "var(--card-secondary)",
          ...(isCandidate ? { outline: "1.5px dashed var(--accent)", outlineOffset: 1 } : {}),
        }}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${seg.startPct}%`,
              width: `${seg.widthPct}%`,
              top: 0,
              height: BAR_H,
              backgroundColor: seg.color,
              opacity: seg.opacity,
            }}
          />
        ))}
        <div
          className="absolute"
          style={{
            left: `${todayPct}%`,
            top: -3,
            bottom: -3,
            width: 2,
            backgroundColor: "var(--text-primary)",
            opacity: 0.4,
            zIndex: 10,
          }}
        />
        {/* Run-out range band */}
        {rp1 != null && rp2 != null && (
          <div
            className="absolute"
            style={{
              left: `${Math.max(0, rp1)}%`,
              width: `${Math.max(0, Math.min(100, rp2) - Math.max(0, rp1))}%`,
              top: 0,
              height: BAR_H,
              backgroundColor: "var(--destructive)",
              opacity: 0.18,
              zIndex: 10,
            }}
          />
        )}
        {/* Midpoint line */}
        {rpMid != null && rpMid > 0 && rpMid < 100 && (
          <div
            className="absolute"
            style={{
              left: `${rpMid}%`,
              top: -3,
              bottom: -3,
              width: 2,
              backgroundColor: "var(--destructive)",
              opacity: 0.65,
              zIndex: 11,
            }}
          />
        )}
      </div>
    );
  }

  function renderCandidateBar() {
    const peakStartPct = toPct(candidate.peakStart);
    const peakEndPct = toPct(candidate.peakEnd);
    const runOutMidPct =
      candidateRunOutRange
        ? (toPct(candidateRunOutRange.earliest) + toPct(candidateRunOutRange.latest)) / 2
        : null;
    const clampLabelPct = (pct: number) => Math.max(5, Math.min(95, pct));

    return (
      <div className="relative" style={{ height: BAR_H + 20 }}>
        <div className="absolute inset-x-0 top-0">
          {renderBar(candidate, true, candidateRunOutRange ?? undefined)}
        </div>
        {/* Peak start tick */}
        <div
          className="absolute"
          style={{ left: `${peakStartPct}%`, top: BAR_H + 1, bottom: 0, width: 1, backgroundColor: "#30D158", opacity: 0.5 }}
        />
        <span
          className="absolute text-[10px] font-medium whitespace-nowrap"
          style={{ left: `${clampLabelPct(peakStartPct)}%`, top: BAR_H + 4, transform: "translateX(-50%)", color: "#30D158", opacity: 0.85 }}
        >
          {fmtShort(candidate.peakStart)}
        </span>
        {/* Peak end tick */}
        <div
          className="absolute"
          style={{ left: `${peakEndPct}%`, top: BAR_H + 1, bottom: 0, width: 1, backgroundColor: "#FF9500", opacity: 0.5 }}
        />
        <span
          className="absolute text-[10px] font-medium whitespace-nowrap"
          style={{ left: `${clampLabelPct(peakEndPct)}%`, top: BAR_H + 4, transform: "translateX(-50%)", color: "#FF9500", opacity: 0.85 }}
        >
          {fmtShort(candidate.peakEnd)}
        </span>
        {/* Run-out midpoint label */}
        {runOutMidPct != null && runOutMidPct > 0 && runOutMidPct < 100 &&
          candidateRunOutRange && Math.abs(runOutMidPct - peakEndPct) > 5 && (
          <span
            className="absolute text-[10px] font-medium whitespace-nowrap"
            style={{ left: `${clampLabelPct(runOutMidPct)}%`, top: BAR_H + 4, transform: "translateX(-50%)", color: "var(--destructive)", opacity: 0.75 }}
          >
            ~{fmtRange(candidateRunOutRange.earliest, candidateRunOutRange.latest)}
          </span>
        )}
      </div>
    );
  }

  const readyText = () => {
    if (daysPastPeak >= 0) return { text: "Past peak", color: "var(--destructive)" };
    if (daysUntilPeak <= 0) return { text: "In peak window now", color: "var(--success)" };
    return { text: `${daysUntilPeak} day${daysUntilPeak !== 1 ? "s" : ""}`, color: "var(--text-secondary)" };
  };

  type Verdict = { icon: string; color: string; headline: string; detail: string | null };
  const buildVerdict = (): Verdict | null => {
    if (gapDays === null || bagWindows.length === 0) return null;
    if (gapDays > 21) {
      return {
        icon: "✕",
        color: "#FF3B30",
        headline: `${gapDays}-day gap after current bags' peak.`,
        detail:
          deadZoneDays > 0
            ? `Even using the "use soon" window, you'll have ${deadZoneDays} days with no fresh coffee. Consider a bag with an earlier roast date.`
            : `Your current bags' "use soon" window partially covers the gap, but consider buying sooner.`,
      };
    }
    if (gapDays > 7) {
      return {
        icon: "⚑",
        color: "#FF9500",
        headline: `${gapDays}-day gap after current bags' peak.`,
        detail:
          deadZoneDays > 0
            ? `${deadZoneDays} days with no fresh coffee after the use-soon window ends. Ordering slightly sooner would close this.`
            : `Bridged by the use-soon window — acceptable, but not ideal.`,
      };
    }
    if (gapDays >= -6) {
      const isSeamless = gapDays === 0;
      const hasGap = gapDays > 0;
      return {
        icon: "✓",
        color: "#30D158",
        headline: isSeamless
          ? "Seamless handoff from current bags."
          : hasGap
          ? `${gapDays}-day gap — use-soon window will bridge it.`
          : `${Math.abs(gapDays)}-day overlap — smooth transition.`,
        detail:
          gapDays < 0
            ? `From ${fmtShort(candidate.peakStart)} to ${fmtShort(new Date(Math.min(...bagWindows.map((b) => b.peakEnd.getTime()))))}, you'll have ${bagOverlaps.length > 1 ? "multiple bags" : "two bags"} in peak simultaneously. Stick to one primarily to minimize retention waste.`
            : null,
      };
    }
    if (gapDays >= -21) {
      return {
        icon: "⚑",
        color: "#FF9500",
        headline: `${simultaneousPeakDays}-day overlap — ${bagOverlaps.length > 1 ? "multiple bags" : "two bags"} in peak at the same time.`,
        detail: `You'll be dividing use between bags during the overlap. Each switch between bags wastes 7–8g to purge grinder retention — commit to one as your primary and only switch occasionally.`,
      };
    }
    return {
      icon: "✕",
      color: "#FF3B30",
      headline: `${simultaneousPeakDays}-day overlap — too many peak bags at once.`,
      detail: `With ${bagOverlaps.length + 1} bags in peak simultaneously for this long, you risk coffee going stale before you can use it. Each grinder switch wastes 7–8g of retained coffee. Consider waiting for a later roast date or finishing current bags first.`,
    };
  };

  const verdict = buildVerdict();
  const ready = readyText();

  return (
    <div>
      {/* ── Candidate Bag form ─────────────────────────────────────────────── */}
      <SectionHeader title="Candidate Bag" />
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        <div className="flex items-center px-6 min-h-[52px] row-divider">
          <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Roast Date</span>
          <input
            type="date"
            value={roastDate}
            onChange={(e) => setRoastDate(e.target.value)}
            className="text-right outline-none bg-transparent text-[17px]"
            style={{ color: "var(--accent)" }}
          />
        </div>
        <div className="flex items-center px-6 min-h-[52px] row-divider">
          <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Roast Level</span>
          <select
            value={roastLevel}
            onChange={(e) => setRoastLevel(e.target.value as RoastLevel)}
            className="text-right outline-none bg-transparent text-[17px]"
            style={{ color: "var(--accent)" }}
          >
            {ROAST_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="flex items-center px-6 min-h-[52px] row-divider">
          <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Process</span>
          <select
            value={processingMethod}
            onChange={(e) => setProcessingMethod(e.target.value as ProcessingMethod)}
            className="text-right outline-none bg-transparent text-[17px]"
            style={{ color: "var(--accent)" }}
          >
            {PROCESSING_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        {!isDecafMethod && (
          <div className="flex items-center px-6 min-h-[52px] row-divider">
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Decaf</span>
            <button
              type="button"
              onClick={() => setIsDecaf(!isDecaf)}
              className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
              style={{ backgroundColor: isDecaf ? "var(--accent)" : "#E5E5EA" }}
            >
              <span
                className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200 mt-[2px]"
                style={{ marginLeft: isDecaf ? 22 : 2 }}
              />
            </button>
          </div>
        )}
        <div className="flex items-center px-6 min-h-[52px]">
          <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Weight</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={candidateWeightRaw}
              onChange={(e) => setCandidateWeightRaw(Number(e.target.value) || 0)}
              className="text-right outline-none bg-transparent text-[17px] w-16"
              style={{ color: "var(--accent)" }}
              min={0}
              step={weightUnit === "oz" ? 0.5 : 10}
            />
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--card-secondary)" }}>
              {(["g", "oz"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => handleUnitToggle(unit)}
                  className="px-2.5 py-1 text-[13px] font-medium"
                  style={{
                    backgroundColor: weightUnit === unit ? "var(--accent)" : "transparent",
                    color: weightUnit === unit ? "white" : "var(--text-secondary)",
                  }}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Consumption Average ────────────────────────────────────────────── */}
      <SectionHeader title="Consumption Average" />
      <div
        className="mx-4 rounded-2xl px-6 pt-4 pb-5"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[15px]" style={{ color: "var(--text-primary)" }}>
            Based on last{" "}
            <span className="font-semibold" style={{ color: "var(--accent)" }}>
              {rollingWindowDays} days
            </span>
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={45}
          step={1}
          value={rollingWindowDays}
          onChange={(e) => handleWindowChange(parseInt(e.target.value))}
          className="w-full mb-4"
          style={{ accentColor: "var(--accent)" }}
        />
        <div className="flex justify-between mb-4">
          <span className="text-[11px]" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>5 days</span>
          <span className="text-[11px]" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>45 days</span>
        </div>

        {/* Caf rate */}
        {cafSufficient ? (
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[15px]" style={{ color: "var(--text-primary)" }}>Caffeinated</span>
            <span className="text-[15px] text-right">
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{cafRate}g/day</span>
              <span className="text-[13px] ml-2" style={{ color: "var(--text-secondary)" }}>
                {cafShots.length} shot{cafShots.length !== 1 ? "s" : ""}
              </span>
            </span>
          </div>
        ) : (
          <div className="mb-1">
            <p className="text-[13px]" style={{ color: "var(--warning)" }}>
              Caffeinated: not enough data — {cafShots.length} shot{cafShots.length !== 1 ? "s" : ""} in window (need 3+)
            </p>
          </div>
        )}

        {/* Decaf rate */}
        {activeBags.some((b) => b.isDecaf) && (
          decafSufficient ? (
            <div className="flex items-baseline justify-between">
              <span className="text-[15px]" style={{ color: "var(--text-primary)" }}>Decaffeinated</span>
              <span className="text-[15px] text-right">
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{decafRate}g/day</span>
                <span className="text-[13px] ml-2" style={{ color: "var(--text-secondary)" }}>
                  {decafShots.length} shot{decafShots.length !== 1 ? "s" : ""}
                </span>
              </span>
            </div>
          ) : (
            <div>
              <p className="text-[13px]" style={{ color: "var(--warning)" }}>
                Decaffeinated: not enough data — {decafShots.length} shot{decafShots.length !== 1 ? "s" : ""} in window (need 3+)
              </p>
            </div>
          )
        )}
      </div>

      {/* ── Freshness Timeline ─────────────────────────────────────────────── */}
      <SectionHeader title="Freshness Timeline" />
      <div
        className="mx-4 rounded-2xl px-4 pt-3 pb-4"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        <div className="relative" style={{ height: 14, marginBottom: 10 }}>
          <span
            className="absolute text-[10px] font-medium whitespace-nowrap"
            style={{ left: `${todayPct}%`, bottom: 0, transform: "translateX(-50%)", color: "var(--text-primary)", opacity: 0.55 }}
          >
            Today
          </span>
        </div>

        {bagWindows.map((bw) => {
          const info = allBagsRunOuts.get(bw.id);
          return (
            <div key={bw.id} className="mb-3">
              <p className="text-[11px] mb-1.5 truncate" style={{ color: "var(--text-secondary)" }}>
                {bw.label}
                {info && (
                  <span style={{ color: "var(--destructive)", opacity: 0.75 }}>
                    {" · "}{info.remainingG}g · runs out {fmtRange(info.runOutRange.earliest, info.runOutRange.latest)}
                  </span>
                )}
              </p>
              {renderBar(bw, false, info?.runOutRange)}
            </div>
          );
        })}

        <div style={{ borderTop: "1px dashed var(--card-secondary)", marginTop: 4, marginBottom: 10 }} />

        <div className="mb-1">
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--accent)" }}>
            Candidate · {ROAST_LEVELS.find((l) => l.value === roastLevel)?.label} · {PROCESSING_METHODS.find((m) => m.value === processingMethod)?.label}
          </p>
          {renderCandidateBar()}
        </div>

        <div className="relative" style={{ height: 14, marginTop: 10 }}>
          {monthMarkers.map((m, i) => (
            <span
              key={i}
              className="absolute text-[10px]"
              style={{ left: `${m.pct}%`, top: 0, transform: "translateX(-50%)", color: "var(--text-secondary)", opacity: 0.45 }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-4 mt-4 flex-wrap">
          {[
            { color: "#30D158", label: "Peak" },
            { color: "#FF9500", label: "Use soon" },
            { color: "#8E8E93", label: "Degassing" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
            </div>
          ))}
          {[...cafBagsComputed, ...decafBagsComputed].some((b) => b.runOutRange != null) && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: "var(--destructive)", opacity: 0.4 }} />
              <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Est. run-out</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Analysis ──────────────────────────────────────────────────────── */}
      <SectionHeader title="Analysis" />
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        {/* Buy recommendation — prominent card at top */}
        {buyState != null && (
          <div
            className="px-6 py-4 row-divider"
            style={{
              borderLeft: `3px solid ${
                buyState === "good" ? "var(--success)" :
                buyState === "buy_now" ? "var(--accent)" :
                "var(--warning)"
              }`,
            }}
          >
            <p className="text-[17px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {buyState === "buy_now" && "Buy now"}
              {buyState === "good" && `Buy on or after ${fmtShort(buyOnDate!)}`}
              {buyState === "too_early" && `Wait until ${fmtShort(buyOnDate!)} to buy`}
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {buyState === "buy_now" && (
                daysUntilBuyOn! < -7
                  ? "Ideal timing has passed — buy soon to avoid a freshness gap."
                  : "Peaks just as your current bags are running out."
              )}
              {buyState === "good" && "Peaks just as your current bags run out."}
              {buyState === "too_early" &&
                `Buying now creates ${simultaneousPeakDays} days of overlap with current bags in peak — each grinder switch wastes 7–8g.`}
            </p>
          </div>
        )}

        {/* Peak window */}
        <div className="flex items-center px-6 min-h-[52px] row-divider">
          <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Peak window</span>
          <span className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
            {fmtShort(candidate.peakStart)} – {fmtShort(candidate.peakEnd)}
          </span>
        </div>

        {/* Ready in / status */}
        <div className="flex items-center px-6 min-h-[52px] row-divider">
          <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>
            {daysUntilPeak > 0 ? "Ready in" : "Status"}
          </span>
          <span className="text-[15px]" style={{ color: ready.color }}>{ready.text}</span>
        </div>

        {/* Candidate peak grams */}
        {candidatePeakGrams != null && (
          <div className="flex items-center px-6 min-h-[52px] row-divider">
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Candidate in peak</span>
            <span className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
              {candidatePeakGrams}g of {candidateWeightG}g
            </span>
          </div>
        )}

        {/* Peak pipeline */}
        {daysOfPeakCoffee != null && (
          <div className="px-6 py-4 row-divider">
            <div className="flex items-center">
              <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Peak pipeline</span>
              <span className="text-[17px] font-semibold" style={{ color: "var(--success)" }}>
                {daysOfPeakCoffee} day{daysOfPeakCoffee !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
              {totalPeakGrams}g total at {totalDailyRate}g/day
              {existingPeakGrams.length > 0 &&
                ` — ${totalExistingPeakGrams}g from current bags + ${candidatePeakGrams ?? 0}g from candidate`}
            </p>
          </div>
        )}

        {/* Per-bag run-out rows (caf) */}
        {cafBagsComputed.filter((b) => b.runOutRange != null).map((b, i) => {
          const daysUntilMidRunOut = daysBetween(today, new Date((b.runOutRange!.earliest.getTime() + b.runOutRange!.latest.getTime()) / 2));
          const runsOutBeforePeak = b.runOutRange!.latest < candidate.peakStart;
          return (
            <div key={i} className="row-divider">
              <div className="flex items-center px-6 min-h-[52px]">
                <span className="text-[15px] flex-1 truncate pr-4" style={{ color: "var(--text-secondary)" }}>
                  Runs out · {b.label}
                </span>
                <span
                  className="text-[15px] flex-shrink-0"
                  style={{ color: runsOutBeforePeak ? "var(--destructive)" : "var(--text-secondary)" }}
                >
                  {fmtRange(b.runOutRange!.earliest, b.runOutRange!.latest)}
                </span>
              </div>
              <p className="px-6 pb-3 text-[13px]" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
                {b.remainingG}g at {b.allocatedRate}g/day
                {b.urgencyWeight > 0 && totalCafUrgencyWeight > 0
                  ? ` (${Math.round((b.urgencyWeight / totalCafUrgencyWeight) * 100)}% of caf share — ${b.zone.replace("_", " ")})`
                  : ""}
                {runsOutBeforePeak && " · runs out before this bag peaks"}
              </p>
            </div>
          );
        })}

        {/* Per-bag run-out rows (decaf) */}
        {decafBagsComputed.filter((b) => b.runOutRange != null).map((b, i) => {
          const runsOutBeforePeak = b.runOutRange!.latest < candidate.peakStart;
          return (
            <div key={`d${i}`} className="row-divider">
              <div className="flex items-center px-6 min-h-[52px]">
                <span className="text-[15px] flex-1 truncate pr-4" style={{ color: "var(--text-secondary)" }}>
                  Runs out · {b.label}
                </span>
                <span className="text-[15px] flex-shrink-0" style={{ color: runsOutBeforePeak ? "var(--destructive)" : "var(--text-secondary)" }}>
                  {fmtRange(b.runOutRange!.earliest, b.runOutRange!.latest)}
                </span>
              </div>
              <p className="px-6 pb-3 text-[13px]" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
                {b.remainingG}g at {b.allocatedRate}g/day (full decaf rate)
              </p>
            </div>
          );
        })}

        {/* Per-bag overlap rows */}
        {bagOverlaps.map((b, i) => (
          <div key={i} className="flex items-center px-6 min-h-[52px] row-divider">
            <span className="text-[15px] flex-1 truncate pr-4" style={{ color: "var(--text-secondary)" }}>
              Overlap · {b.label}
            </span>
            <span className="text-[15px] flex-shrink-0" style={{ color: "#FF9500" }}>
              {b.days} day{b.days !== 1 ? "s" : ""}
            </span>
          </div>
        ))}

        {/* Verdict */}
        {verdict && (
          <div className="px-6 py-4">
            <div className="flex items-start gap-2 mb-1">
              <span className="text-[15px] font-semibold flex-shrink-0" style={{ color: verdict.color }}>
                {verdict.icon}
              </span>
              <p className="text-[15px] font-medium" style={{ color: "var(--text-primary)" }}>
                {verdict.headline}
              </p>
            </div>
            {verdict.detail && (
              <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)", paddingLeft: 20 }}>
                {verdict.detail}
              </p>
            )}
          </div>
        )}

        {bagWindows.length === 0 && (
          <div className="px-6 py-4">
            <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
              No active bags to compare against.
            </p>
          </div>
        )}

        {bagWindows.length > 0 && activeBags.some((b) => b.weightG == null) && (
          <div className="px-6 pb-4">
            <p className="text-[13px]" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
              Add bag weight in the bag edit form to see run-out estimates for bags missing it.
            </p>
          </div>
        )}

        <div className="px-6 py-4 row-divider-t">
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {describePeakWindow(roastLevel, processingMethod, effectiveIsDecaf, peakStartDay, peakEndDay)}
          </p>
        </div>
      </div>
    </div>
  );
}
