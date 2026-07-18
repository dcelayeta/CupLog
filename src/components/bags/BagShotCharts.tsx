import type { BagChartShot } from "@/lib/bags/queries";
import { classifyShotAgainstTarget } from "@/lib/shots/targetHit";
import { TARGET_RATIOS } from "@/lib/shots/targetRatios";

const RATING_COLORS: Record<number, string> = {
  1: "#FF3B30", 2: "#FF9500", 3: "#FFD60A", 4: "#34C759", 5: "#30D158",
};

const TASTE_COLORS: Record<number, string> = {
  1: "#FF3B30", 2: "#FF6B35", 3: "#FFB347", 4: "#34C759",
  5: "#FFD60A", 6: "#FF9500", 7: "#8B5CF6",
};

const HIT_COLORS = { on: "#34C759", off: "#FF9500", none: "#8E8E93", failed: "#FF3B30" } as const;

function ChartCard({
  title,
  legend,
  children,
}: {
  title: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
    >
      <div className="px-4 pt-3 pb-2">
        <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-primary)" }}>
          {title}
        </p>
        {legend && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">{legend}</div>
        )}
      </div>
      <div className="px-3 pb-3">
        {children}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
      <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

// Chart 1: Grind Setting vs. Taste Balance scatter
function GrindVsTasteChart({ shots }: { shots: BagChartShot[] }) {
  const relevant = shots.filter(
    (s) => !s.isFailed && s.grindSetting != null && s.tasteBalance != null
  );
  if (relevant.length === 0) return null;

  const W = 320, H = 190;
  const PAD = { l: 52, r: 16, t: 16, b: 28 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const grinds = relevant.map((s) => s.grindSetting!);
  const rawMin = Math.min(...grinds);
  const rawMax = Math.max(...grinds);
  const spread = Math.max(rawMax - rawMin, 3);
  const minG = rawMin - Math.max(1, Math.round(spread * 0.15));
  const maxG = rawMax + Math.max(1, Math.round(spread * 0.15));

  const toX = (g: number) => PAD.l + ((g - minG) / (maxG - minG)) * cw;
  const toY = (t: number) => PAD.t + ch - ((t - 1) / 6) * ch;

  const yLabels = [
    { v: 1, label: "Sour" },
    { v: 4, label: "Balanced" },
    { v: 7, label: "Bitter" },
  ];

  const grindSpan = maxG - minG;
  const step = grindSpan > 20 ? 10 : grindSpan > 10 ? 5 : grindSpan > 4 ? 2 : 1;
  const firstTick = Math.ceil(minG / step) * step;
  const xTicks: number[] = [];
  for (let g = firstTick; g <= maxG; g += step) xTicks.push(g);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "hidden" }}>
      {/* Balanced zone highlight (taste 3–5) */}
      <rect x={PAD.l} y={toY(5)} width={cw} height={toY(3) - toY(5)} fill="#34C759" fillOpacity="0.1" />

      {/* Grid lines */}
      {yLabels.map(({ v }) => (
        <line
          key={v}
          x1={PAD.l} y1={toY(v)} x2={PAD.l + cw} y2={toY(v)}
          stroke="currentColor" strokeOpacity="0.12" strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + ch}
        stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t + ch} x2={PAD.l + cw} y2={PAD.t + ch}
        stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />

      {/* Y labels */}
      {yLabels.map(({ v, label }) => (
        <text key={v} x={PAD.l - 5} y={toY(v)} textAnchor="end" dominantBaseline="middle"
          fontSize="9" fill="var(--text-secondary)">{label}</text>
      ))}

      {/* X ticks */}
      {xTicks.map((g) => (
        <text key={g} x={toX(g)} y={H - 6} textAnchor="middle"
          fontSize="9" fill="var(--text-secondary)">{g}</text>
      ))}

      {/* Dots */}
      {relevant.map((s) => {
        const x = toX(s.grindSetting!);
        const y = toY(s.tasteBalance!);
        const color = s.shotRating ? RATING_COLORS[Math.round(s.shotRating)] : "#8E8E93";
        return <circle key={s.id} cx={x} cy={y} r="4" fill={color} fillOpacity="0.85" />;
      })}
    </svg>
  );
}

// Chart 2: Rating trend — true bag-scoped shot number (not a filtered index),
// so an unrated shot in between still leaves a gap instead of compressing
// the axis, colored by taste balance.
function RatingTrendChart({ shots }: { shots: BagChartShot[] }) {
  const nonFailed = shots.filter((s) => !s.isFailed);
  const numbered = nonFailed.map((s, i) => ({ ...s, shotNumber: i + 1 }));
  const rated = numbered.filter((s) => s.shotRating != null);
  if (rated.length < 2) return null;

  const totalShots = nonFailed.length;
  const W = 320, H = 180;
  const PAD = { l: 24, r: 16, t: 16, b: 30 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const toX = (shotNumber: number) =>
    totalShots <= 1 ? PAD.l + cw / 2 : PAD.l + ((shotNumber - 1) / (totalShots - 1)) * cw;
  const toY = (r: number) => PAD.t + ch - ((r - 1) / 4) * ch;

  const points = rated.map((s) => `${toX(s.shotNumber)},${toY(s.shotRating!)}`).join(" ");

  const xTickStep = totalShots > 20 ? 5 : totalShots > 10 ? 2 : 1;
  const xTicks: number[] = [];
  for (let n = 1; n <= totalShots; n += xTickStep) xTicks.push(n);
  if (xTicks[xTicks.length - 1] !== totalShots) xTicks.push(totalShots);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "hidden" }}>
      {/* Grid lines */}
      {[1, 2, 3, 4, 5].map((r) => (
        <line key={r} x1={PAD.l} y1={toY(r)} x2={PAD.l + cw} y2={toY(r)}
          stroke="currentColor" strokeOpacity={r === 3 ? 0.2 : 0.08} strokeWidth="1" />
      ))}

      {/* Y labels */}
      {[1, 3, 5].map((r) => (
        <text key={r} x={PAD.l - 4} y={toY(r)} textAnchor="end" dominantBaseline="middle"
          fontSize="9" fill="var(--text-secondary)">{r}★</text>
      ))}

      {/* X ticks — shot number */}
      {xTicks.map((n) => (
        <text key={n} x={toX(n)} y={H - 6} textAnchor="middle" fontSize="8"
          fill="var(--text-secondary)">{n}</text>
      ))}

      {/* Line */}
      <polyline points={points} fill="none" stroke="var(--text-secondary)" strokeOpacity="0.25" strokeWidth="1.5" />

      {/* Dots */}
      {rated.map((s) => {
        const x = toX(s.shotNumber);
        const y = toY(s.shotRating!);
        const color = s.tasteBalance ? TASTE_COLORS[Math.round(s.tasteBalance)] : "#8E8E93";
        return <circle key={s.id} cx={x} cy={y} r="4" fill={color} fillOpacity="0.85" />;
      })}
    </svg>
  );
}

// Chart 3: Extraction ratio horizontal bars
function ExtractionRatioChart({ shots }: { shots: BagChartShot[] }) {
  const eligible = shots
    .filter((s) => s.doseG > 0 && s.yieldG != null && s.yieldG > 0)
    .slice(-12)
    .reverse();

  if (eligible.length === 0) return null;

  const ROW_H = 20;
  const ROW_GAP = 4;
  const LABEL_W = 30;
  const W = 320;
  const PAD_T = 8;
  const PAD_B = 22;
  const PAD_R = 36;
  const barAreaW = W - LABEL_W - PAD_R - 8;
  const H = PAD_T + eligible.length * (ROW_H + ROW_GAP) - ROW_GAP + PAD_B;

  const ratios = eligible.map((s) => s.yieldG! / s.doseG);
  const maxRatio = Math.max(Math.max(...ratios), 3.0);
  const toBarW = (ratio: number) => (Math.min(ratio, maxRatio) / maxRatio) * barAreaW;

  const targetStartX = LABEL_W + 8 + toBarW(1.5);
  const targetEndX = LABEL_W + 8 + toBarW(Math.min(2.5, maxRatio));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "hidden" }}>
      {/* Target zone band */}
      <rect
        x={targetStartX}
        y={PAD_T}
        width={targetEndX - targetStartX}
        height={H - PAD_T - PAD_B}
        fill="#34C759"
        fillOpacity="0.1"
      />

      {/* Rows */}
      {eligible.map((s, i) => {
        const ratio = s.yieldG! / s.doseG;
        const y = PAD_T + i * (ROW_H + ROW_GAP);
        const bw = toBarW(ratio);
        const barColor = ratio < 1.5 ? "#FF9500" : ratio > 2.5 ? "#8B5CF6" : "#34C759";
        const grindLabel = s.grindSetting != null ? String(s.grindSetting) : "—";

        return (
          <g key={s.id}>
            <text x={LABEL_W - 2} y={y + ROW_H / 2} textAnchor="end" dominantBaseline="middle"
              fontSize="9" fill="var(--text-secondary)">{grindLabel}</text>

            <rect x={LABEL_W + 8} y={y + 3} width={barAreaW} height={ROW_H - 6}
              rx="3" fill="currentColor" fillOpacity="0.06" />

            <rect x={LABEL_W + 8} y={y + 3} width={Math.max(bw, 4)} height={ROW_H - 6}
              rx="3" fill={barColor} fillOpacity={s.isFailed ? 0.25 : 0.65} />

            <text x={LABEL_W + 8 + bw + 4} y={y + ROW_H / 2} dominantBaseline="middle"
              fontSize="9" fill="var(--text-secondary)">{ratio.toFixed(1)}</text>
          </g>
        );
      })}

      {/* X axis ticks */}
      {[1.0, 1.5, 2.0, 2.5, 3.0]
        .filter((v) => v <= maxRatio + 0.1)
        .map((v) => (
          <text key={v} x={LABEL_W + 8 + toBarW(v)} y={H - 5}
            textAnchor="middle" fontSize="8" fill="var(--text-secondary)" opacity="0.7">
            {v.toFixed(1)}
          </text>
        ))}
    </svg>
  );
}

// Chart 4: Yield vs. time scatter with target-ratio reference zones (at this
// bag's average dose) — dot colored by whether the shot hit its own target.
function YieldTimeTargetChart({ shots }: { shots: BagChartShot[] }) {
  const eligible = shots.filter((s) => s.yieldG != null && s.shotTimeSeconds != null);
  if (eligible.length === 0) return null;

  type Point = { id: number; x: number; y: number; color: string };
  const points: Point[] = [];
  let doseSum = 0, doseCount = 0;

  for (const s of eligible) {
    const yieldG = s.yieldG!;
    const shotTimeSeconds = s.shotTimeSeconds!;
    let color: string;
    if (s.isFailed) {
      color = HIT_COLORS.failed;
    } else if (s.targetRatioLabel) {
      const { hitTarget } = classifyShotAgainstTarget({
        doseG: s.doseG,
        grinderRetentionG: s.grinderRetentionG,
        yieldG,
        shotTimeSeconds,
        targetRatioLabel: s.targetRatioLabel,
      });
      color = hitTarget ? HIT_COLORS.on : HIT_COLORS.off;
    } else {
      color = HIT_COLORS.none;
    }
    points.push({ id: s.id, x: shotTimeSeconds, y: yieldG, color });

    if (!s.isFailed) {
      const effectiveDose = s.grinderRetentionG != null ? s.doseG - s.grinderRetentionG : s.doseG;
      if (effectiveDose > 0) {
        doseSum += effectiveDose;
        doseCount++;
      }
    }
  }

  const avgEffectiveDose = doseCount > 0 ? doseSum / doseCount : null;
  const zones = avgEffectiveDose
    ? TARGET_RATIOS.map((preset) => ({
        label: preset.label,
        yieldForDose: avgEffectiveDose * preset.ratio,
        timeMinSeconds: preset.timeMinSeconds,
        timeMaxSeconds: preset.timeMaxSeconds,
      }))
    : [];

  const W = 320, H = 210;
  const PAD = { l: 32, r: 16, t: 18, b: 24 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const allTimes = points.map((p) => p.x).concat(zones.flatMap((z) => [z.timeMinSeconds, z.timeMaxSeconds]));
  const allYields = points.map((p) => p.y).concat(zones.map((z) => z.yieldForDose));

  let minTime = Math.max(0, Math.floor(Math.min(...allTimes) / 5) * 5 - 5);
  let maxTime = Math.min(60, Math.ceil(Math.max(...allTimes) / 5) * 5 + 5);
  if (maxTime - minTime < 20) {
    const grow = (20 - (maxTime - minTime)) / 2;
    minTime = Math.max(0, minTime - grow);
    maxTime = Math.min(60, maxTime + grow);
  }

  let minYield = Math.max(0, Math.floor(Math.min(...allYields) / 10) * 10 - 10);
  let maxYield = Math.min(90, Math.ceil(Math.max(...allYields) / 10) * 10 + 10);
  if (maxYield - minYield < 30) {
    const grow = (30 - (maxYield - minYield)) / 2;
    minYield = Math.max(0, minYield - grow);
    maxYield = Math.min(90, maxYield + grow);
  }

  const toX = (t: number) => PAD.l + ((t - minTime) / (maxTime - minTime)) * cw;
  const toY = (y: number) => PAD.t + ch - ((y - minYield) / (maxYield - minYield)) * ch;

  const xTicks: number[] = [];
  for (let t = Math.ceil(minTime / 5) * 5; t <= maxTime; t += 5) xTicks.push(t);
  const yTicks: number[] = [];
  for (let y = Math.ceil(minYield / 10) * 10; y <= maxYield; y += 10) yTicks.push(y);

  const zoneBandHalfPx = 5;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "hidden" }}>
      {/* Y gridlines + numeric ticks */}
      {yTicks.map((y) => (
        <g key={y}>
          <line x1={PAD.l} y1={toY(y)} x2={PAD.l + cw} y2={toY(y)} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
          <text x={PAD.l - 6} y={toY(y)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="var(--text-secondary)">
            {y}g
          </text>
        </g>
      ))}

      {/* X gridlines */}
      {xTicks.map((t) => (
        <line key={t} x1={toX(t)} y1={PAD.t} x2={toX(t)} y2={PAD.t + ch} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
      ))}

      {/* Frame */}
      <rect x={PAD.l} y={PAD.t} width={cw} height={ch} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />

      {/* Target-ratio reference zones, at this bag's average dose */}
      {zones.map((z) => {
        const zy = toY(z.yieldForDose);
        const zx1 = toX(Math.max(z.timeMinSeconds, minTime));
        const zx2 = toX(Math.min(z.timeMaxSeconds, maxTime));
        if (zy < PAD.t || zy > PAD.t + ch || zx2 <= zx1) return null;
        return (
          <g key={z.label}>
            <rect x={zx1} y={zy - zoneBandHalfPx} width={zx2 - zx1} height={zoneBandHalfPx * 2}
              fill="var(--accent)" fillOpacity="0.14" />
            <text x={zx1} y={zy - zoneBandHalfPx - 2} textAnchor="start" fontSize="7" fill="var(--accent)">
              {z.label}
            </text>
          </g>
        );
      })}

      {/* X numeric ticks */}
      {xTicks.map((t) => (
        <text key={`lbl-${t}`} x={toX(t)} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">
          {t}s
        </text>
      ))}

      {/* Dots */}
      {points.map((p) => (
        <circle key={p.id} cx={toX(p.x)} cy={toY(p.y)} r="4" fill={p.color} fillOpacity="0.85" />
      ))}
    </svg>
  );
}

export default function BagShotCharts({ shots }: { shots: BagChartShot[] }) {
  const hasGrindTaste = shots.some(
    (s) => !s.isFailed && s.grindSetting != null && s.tasteBalance != null
  );
  const hasRating = shots.filter((s) => !s.isFailed && s.shotRating != null).length >= 2;
  const hasRatio = shots.some((s) => s.doseG > 0 && s.yieldG != null && s.yieldG > 0);
  const hasYieldTime = shots.some((s) => s.yieldG != null && s.shotTimeSeconds != null);

  if (!hasGrindTaste && !hasRating && !hasRatio && !hasYieldTime) return null;

  return (
    <div className="flex flex-col gap-4 mx-4">
      {hasGrindTaste && (
        <ChartCard
          title="Grind vs. Taste"
          legend={
            <>
              {[1, 2, 3, 4, 5].map((r) => (
                <LegendDot key={r} color={RATING_COLORS[r]} label={`${r}★`} />
              ))}
            </>
          }
        >
          <GrindVsTasteChart shots={shots} />
        </ChartCard>
      )}

      {hasRating && (
        <ChartCard
          title="Rating Trend"
          legend={
            <>
              <LegendDot color={TASTE_COLORS[1]} label="V.Sour" />
              <LegendDot color={TASTE_COLORS[2]} label="Sour" />
              <LegendDot color={TASTE_COLORS[3]} label="Sl.Sour" />
              <LegendDot color={TASTE_COLORS[4]} label="Balanced" />
              <LegendDot color={TASTE_COLORS[5]} label="Sl.Bitter" />
              <LegendDot color={TASTE_COLORS[6]} label="Bitter" />
              <LegendDot color={TASTE_COLORS[7]} label="V.Bitter" />
            </>
          }
        >
          <RatingTrendChart shots={shots} />
        </ChartCard>
      )}

      {hasRatio && (
        <ChartCard
          title="Extraction Ratio"
          legend={
            <>
              <LegendDot color="#FF9500" label="Under (<1.5)" />
              <LegendDot color="#34C759" label="Target (1.5–2.5)" />
              <LegendDot color="#8B5CF6" label="Over (>2.5)" />
            </>
          }
        >
          <ExtractionRatioChart shots={shots} />
        </ChartCard>
      )}

      {hasYieldTime && (
        <ChartCard
          title="Yield vs. Time"
          legend={
            <>
              <LegendDot color={HIT_COLORS.on} label="On target" />
              <LegendDot color={HIT_COLORS.off} label="Off target" />
              <LegendDot color={HIT_COLORS.none} label="No target" />
              <LegendDot color={HIT_COLORS.failed} label="Failed" />
            </>
          }
        >
          <YieldTimeTargetChart shots={shots} />
        </ChartCard>
      )}
    </div>
  );
}
