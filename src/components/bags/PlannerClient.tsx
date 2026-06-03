"use client";

import { useState } from "react";
import { estimatePeakWindow } from "@/lib/bags/freshness";
import type { RoastLevel, ProcessingMethod } from "@/lib/bags/freshness";
import type { BagWithOrigins } from "@/lib/bags/queries";

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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {title}
      </p>
    </div>
  );
}

export default function PlannerClient({ activeBags }: { activeBags: BagWithOrigins[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [roastDate, setRoastDate] = useState(toDateStr(today));
  const [roastLevel, setRoastLevel] = useState<RoastLevel>("medium");
  const [processingMethod, setProcessingMethod] = useState<ProcessingMethod>("washed");
  const [isDecaf, setIsDecaf] = useState(false);

  const isDecafMethod = processingMethod === "ea_washed" || processingMethod === "swiss_water";
  const effectiveIsDecaf = isDecaf || isDecafMethod;

  const { peakStartDay, peakEndDay } = estimatePeakWindow(roastLevel, processingMethod, effectiveIsDecaf);
  const candidateRoast = parseDate(roastDate || toDateStr(today));
  const candidate = buildWindow(candidateRoast, peakStartDay, peakEndDay);

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

  // Timeline window: today-7 to furthest useSoonEnd+14
  const windowStart = addDays(today, -7);
  let windowEnd = addDays(candidate.useSoonEnd, 14);
  for (const bw of bagWindows) {
    const e = addDays(bw.useSoonEnd, 14);
    if (e > windowEnd) windowEnd = e;
  }

  const totalMs = windowEnd.getTime() - windowStart.getTime();
  const toPct = (d: Date) =>
    Math.max(0, Math.min(100, ((d.getTime() - windowStart.getTime()) / totalMs) * 100));

  // Month axis markers
  const monthMarkers: { pct: number; label: string }[] = [];
  const mCursor = new Date(windowStart.getFullYear(), windowStart.getMonth() + 1, 1);
  while (mCursor < windowEnd) {
    monthMarkers.push({
      pct: toPct(new Date(mCursor)),
      label: mCursor.toLocaleDateString("en-US", { month: "short" }),
    });
    mCursor.setMonth(mCursor.getMonth() + 1);
  }

  const todayPct = toPct(today);

  // ── Analysis ────────────────────────────────────────────────────────────────

  const daysUntilPeak = daysBetween(today, candidate.peakStart);
  const daysPastPeak = daysBetween(candidate.peakEnd, today);

  // Latest peak end and use-soon end across all active bags
  const latestBagPeakEnd = bagWindows.reduce<Date | null>(
    (acc, bw) => (acc === null || bw.peakEnd > acc ? bw.peakEnd : acc),
    null
  );
  const latestBagUseSoonEnd = bagWindows.reduce<Date | null>(
    (acc, bw) => (acc === null || bw.useSoonEnd > acc ? bw.useSoonEnd : acc),
    null
  );

  // Gap between latest peak end and candidate peak start (negative = overlap)
  const gapDays = latestBagPeakEnd ? daysBetween(latestBagPeakEnd, candidate.peakStart) : null;

  // Days of true dead zone: after even use-soon ends before candidate peaks
  const deadZoneDays =
    latestBagUseSoonEnd && gapDays !== null && gapDays > 0
      ? Math.max(0, daysBetween(latestBagUseSoonEnd, candidate.peakStart))
      : 0;

  // Per-bag peak overlap with candidate
  const bagOverlaps = bagWindows
    .map((bw) => {
      const overlapStart = Math.max(bw.peakStart.getTime(), candidate.peakStart.getTime());
      const overlapEnd = Math.min(bw.peakEnd.getTime(), candidate.peakEnd.getTime());
      const days = Math.max(0, Math.round((overlapEnd - overlapStart) / 86400000));
      return { label: bw.label, days };
    })
    .filter((b) => b.days > 0);

  // Total days where candidate peak overlaps with at least one active bag's peak
  const simultaneousPeakDays = Math.max(0, gapDays !== null ? -gapDays : 0);

  // ── Render helpers ───────────────────────────────────────────────────────────

  const BAR_H = 10;

  function renderBar(w: ReturnType<typeof buildWindow>, isCandidate = false) {
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
      </div>
    );
  }

  // Candidate bar with date tick marks below
  function renderCandidateBar() {
    const peakStartPct = toPct(candidate.peakStart);
    const peakEndPct = toPct(candidate.peakEnd);

    // Clamp label anchor so text doesn't overflow the container
    const clampLabelPct = (pct: number) => Math.max(5, Math.min(95, pct));

    return (
      <div className="relative" style={{ height: BAR_H + 20 }}>
        {/* Bar */}
        <div className="absolute inset-x-0 top-0">
          {renderBar(candidate, true)}
        </div>
        {/* Tick + date for peak start */}
        <div
          className="absolute"
          style={{ left: `${peakStartPct}%`, top: BAR_H + 1, bottom: 0, width: 1, backgroundColor: "#30D158", opacity: 0.5 }}
        />
        <span
          className="absolute text-[10px] font-medium whitespace-nowrap"
          style={{
            left: `${clampLabelPct(peakStartPct)}%`,
            top: BAR_H + 4,
            transform: "translateX(-50%)",
            color: "#30D158",
            opacity: 0.85,
          }}
        >
          {fmtShort(candidate.peakStart)}
        </span>
        {/* Tick + date for peak end */}
        <div
          className="absolute"
          style={{ left: `${peakEndPct}%`, top: BAR_H + 1, bottom: 0, width: 1, backgroundColor: "#FF9500", opacity: 0.5 }}
        />
        <span
          className="absolute text-[10px] font-medium whitespace-nowrap"
          style={{
            left: `${clampLabelPct(peakEndPct)}%`,
            top: BAR_H + 4,
            transform: "translateX(-50%)",
            color: "#FF9500",
            opacity: 0.85,
          }}
        >
          {fmtShort(candidate.peakEnd)}
        </span>
      </div>
    );
  }

  const readyText = () => {
    if (daysPastPeak >= 0) return { text: "Past peak", color: "var(--destructive)" };
    if (daysUntilPeak <= 0) return { text: "In peak window now", color: "var(--success)" };
    return { text: `${daysUntilPeak} day${daysUntilPeak !== 1 ? "s" : ""}`, color: "var(--text-secondary)" };
  };

  type Verdict = { icon: string; color: string; headline: string; detail: string | null; warning: string | null };

  const buildVerdict = (): Verdict | null => {
    if (gapDays === null || bagWindows.length === 0) return null;

    if (gapDays > 21) {
      return {
        icon: "✕",
        color: "#FF3B30",
        headline: `${gapDays}-day gap after current bags' peak.`,
        detail: deadZoneDays > 0
          ? `Even using the "use soon" window, you'll have ${deadZoneDays} days with no fresh coffee. Consider buying a bag with an earlier roast date.`
          : `Your current bags' "use soon" window partially covers the gap, but consider buying sooner.`,
        warning: null,
      };
    }

    if (gapDays > 7) {
      return {
        icon: "⚑",
        color: "#FF9500",
        headline: `${gapDays}-day gap after current bags' peak.`,
        detail: deadZoneDays > 0
          ? `${deadZoneDays} days with no fresh coffee after the use-soon window ends. Ordering slightly sooner would close this.`
          : `Bridged by the use-soon window — acceptable, but not ideal.`,
        warning: null,
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
        detail: hasGap
          ? null
          : gapDays < 0
          ? `From ${fmtShort(candidate.peakStart)} to ${fmtShort(new Date(Math.min(...bagWindows.map(b => b.peakEnd.getTime()))))}, you'll have ${bagOverlaps.length > 1 ? "multiple bags" : "two bags"} in peak simultaneously. Stick to one primarily to minimize retention waste.`
          : null,
        warning: null,
      };
    }

    if (gapDays >= -21) {
      return {
        icon: "⚑",
        color: "#FF9500",
        headline: `${simultaneousPeakDays}-day overlap — ${bagOverlaps.length > 1 ? "multiple bags" : "two bags"} in peak at the same time.`,
        detail: `You'll be dividing use between bags during the overlap. Each switch between bags wastes 7–8g to purge grinder retention — commit to one as your primary and only switch occasionally.`,
        warning: null,
      };
    }

    // > 21 days of overlap
    return {
      icon: "✕",
      color: "#FF3B30",
      headline: `${simultaneousPeakDays}-day overlap — too many peak bags at once.`,
      detail: `With ${bagOverlaps.length + 1} bags in peak simultaneously for this long, you risk coffee going stale before you can use it. Each grinder switch wastes 7–8g of retained coffee. Consider waiting for a later roast date or finishing current bags first.`,
      warning: null,
    };
  };

  const verdict = buildVerdict();
  const ready = readyText();

  return (
    <div>
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
            {ROAST_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
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
            {PROCESSING_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {!isDecafMethod && (
          <div className="flex items-center px-6 min-h-[52px]">
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
      </div>

      <SectionHeader title="Freshness Timeline" />
      <div
        className="mx-4 rounded-2xl px-4 pt-3 pb-4"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        {/* Today label */}
        <div className="relative" style={{ height: 14, marginBottom: 10 }}>
          <span
            className="absolute text-[10px] font-medium whitespace-nowrap"
            style={{
              left: `${todayPct}%`,
              bottom: 0,
              transform: "translateX(-50%)",
              color: "var(--text-primary)",
              opacity: 0.55,
            }}
          >
            Today
          </span>
        </div>

        {/* Active bag rows */}
        {bagWindows.map((bw) => (
          <div key={bw.id} className="mb-3">
            <p className="text-[11px] mb-1.5 truncate" style={{ color: "var(--text-secondary)" }}>
              {bw.label}
            </p>
            {renderBar(bw)}
          </div>
        ))}

        {/* Separator before candidate */}
        <div style={{ borderTop: "1px dashed var(--card-secondary)", marginTop: 4, marginBottom: 10 }} />

        {/* Candidate row with date labels */}
        <div className="mb-1">
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--accent)" }}>
            Candidate · {ROAST_LEVELS.find((l) => l.value === roastLevel)?.label} · {PROCESSING_METHODS.find((m) => m.value === processingMethod)?.label}
          </p>
          {renderCandidateBar()}
        </div>

        {/* Month axis */}
        <div className="relative" style={{ height: 14, marginTop: 10 }}>
          {monthMarkers.map((m, i) => (
            <span
              key={i}
              className="absolute text-[10px]"
              style={{
                left: `${m.pct}%`,
                top: 0,
                transform: "translateX(-50%)",
                color: "var(--text-secondary)",
                opacity: 0.45,
              }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4">
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
        </div>
      </div>

      <SectionHeader title="Analysis" />
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
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
      </div>
    </div>
  );
}
