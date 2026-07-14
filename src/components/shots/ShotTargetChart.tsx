import { classifyShotAgainstTarget, YIELD_TOLERANCE_G } from "@/lib/shots/targetHit";

const MAX_TIME_SECONDS = 60; // most machines (e.g. Bambino) auto-stop the shot at 60s
const MAX_YIELD_G = 80;
const TIME_TICK_STEP = 5;
const YIELD_TICK_STEP = 10;
const MIN_TIME_SPAN = 20; // don't zoom in so far the chart reads as noise
const MIN_YIELD_SPAN = 30;

function floorToStep(v: number, step: number) {
  return Math.floor(v / step) * step;
}
function ceilToStep(v: number, step: number) {
  return Math.ceil(v / step) * step;
}
function ticksInRange(min: number, max: number, step: number): number[] {
  const ticks: number[] = [];
  for (let v = ceilToStep(min, step); v <= max; v += step) ticks.push(v);
  return ticks;
}

export default function ShotTargetChart({
  doseG,
  grinderRetentionG,
  yieldG,
  shotTimeSeconds,
  targetRatioLabel,
}: {
  doseG: number;
  grinderRetentionG: number | null;
  yieldG: number;
  shotTimeSeconds: number;
  targetRatioLabel: string | null;
}) {
  const effectiveDose = grinderRetentionG != null ? doseG - grinderRetentionG : doseG;
  if (effectiveDose <= 0) return null;

  const { zones, targetZone, yieldDelta, timeInRange, yieldInRange, hitTarget, nearMissZone } =
    classifyShotAgainstTarget({ doseG, grinderRetentionG, yieldG, shotTimeSeconds, targetRatioLabel });
  const dotColor = targetZone ? (hitTarget ? "#34C759" : "#FF9500") : "#8E8E93";

  const W = 320, H = 230;
  const PAD = { l: 34, r: 16, t: 20, b: 24 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  // Zoom the axes to fit the target zone, any near-miss/reference zone, and
  // the actual shot — padded and rounded to tick steps — instead of a fixed
  // wide frame that's mostly empty for any single shot.
  const focusPoints: { time: number; yield: number }[] = [
    { time: shotTimeSeconds, yield: yieldG },
    ...(targetZone
      ? [
          { time: targetZone.timeMinSeconds, yield: targetZone.yieldForDose },
          { time: targetZone.timeMaxSeconds, yield: targetZone.yieldForDose },
        ]
      : []),
    ...(nearMissZone
      ? [
          { time: nearMissZone.timeMinSeconds, yield: nearMissZone.yieldForDose },
          { time: nearMissZone.timeMaxSeconds, yield: nearMissZone.yieldForDose },
        ]
      : []),
  ];

  const rawMinTime = Math.min(...focusPoints.map((p) => p.time));
  const rawMaxTime = Math.max(...focusPoints.map((p) => p.time));
  const rawMinYield = Math.min(...focusPoints.map((p) => p.yield));
  const rawMaxYield = Math.max(...focusPoints.map((p) => p.yield));

  let minTime = Math.max(0, floorToStep(rawMinTime - TIME_TICK_STEP, TIME_TICK_STEP));
  let maxTime = Math.min(MAX_TIME_SECONDS, ceilToStep(rawMaxTime + TIME_TICK_STEP, TIME_TICK_STEP));
  if (maxTime - minTime < MIN_TIME_SPAN) {
    const grow = (MIN_TIME_SPAN - (maxTime - minTime)) / 2;
    minTime = Math.max(0, floorToStep(minTime - grow, TIME_TICK_STEP));
    maxTime = Math.min(MAX_TIME_SECONDS, ceilToStep(maxTime + grow, TIME_TICK_STEP));
  }

  let minYield = Math.max(0, floorToStep(rawMinYield - YIELD_TICK_STEP, YIELD_TICK_STEP));
  let maxYield = Math.min(MAX_YIELD_G, ceilToStep(rawMaxYield + YIELD_TICK_STEP, YIELD_TICK_STEP));
  if (maxYield - minYield < MIN_YIELD_SPAN) {
    const grow = (MIN_YIELD_SPAN - (maxYield - minYield)) / 2;
    minYield = Math.max(0, floorToStep(minYield - grow, YIELD_TICK_STEP));
    maxYield = Math.min(MAX_YIELD_G, ceilToStep(maxYield + grow, YIELD_TICK_STEP));
  }

  const toX = (t: number) => PAD.l + ((t - minTime) / (maxTime - minTime)) * cw;
  const toY = (y: number) => PAD.t + ch - ((y - minYield) / (maxYield - minYield)) * ch;

  const xTicks = ticksInRange(minTime, maxTime, TIME_TICK_STEP);
  const yTicks = ticksInRange(minYield, maxYield, YIELD_TICK_STEP);

  // Band height reflects the real yield tolerance (in grams), scaled to the
  // current axis — so widening YIELD_TOLERANCE_G visibly grows the shaded area.
  const bandHalfPx = Math.max((YIELD_TOLERANCE_G / (maxYield - minYield)) * ch, 4);

  // Clamp the plotted position to the axis bounds — the caption still
  // reports the true measured values regardless of where the dot is drawn.
  const shotX = toX(Math.min(Math.max(shotTimeSeconds, minTime), maxTime));
  const shotY = toY(Math.min(Math.max(yieldG, minYield), maxYield));

  const renderZone = (zone: (typeof zones)[number], color: string, opacity: number) => {
    const y = toY(zone.yieldForDose);
    const x1 = toX(zone.timeMinSeconds);
    const x2 = toX(zone.timeMaxSeconds);
    return (
      <rect
        key={zone.label}
        x={x1} y={y - bandHalfPx} width={Math.max(x2 - x1, 2)} height={bandHalfPx * 2}
        fill={color}
        fillOpacity={opacity}
        stroke={color}
        strokeOpacity="0.5"
        strokeWidth="1"
      />
    );
  };

  return (
    <div className="px-4 py-3">
      {(targetZone || nearMissZone) && (
        <p className="text-[13px] font-semibold mb-1">
          {targetZone && <span style={{ color: "var(--accent)" }}>{targetZone.label}</span>}
          {targetZone && nearMissZone && " · "}
          {nearMissZone && <span style={{ color: "#FF9500" }}>{nearMissZone.label}</span>}
        </p>
      )}
      <p className="text-[12px] mb-2" style={{ color: "var(--text-secondary)" }}>
        {targetZone
          ? hitTarget
            ? `Landed in the ${targetZone.label} target.`
            : `Aiming for ${targetZone.label} (${targetZone.yieldForDose.toFixed(1)}g, ${targetZone.timeMinSeconds}–${targetZone.timeMaxSeconds}s) — ${
                yieldInRange ? "yield on target" : `${yieldDelta! >= 0 ? "+" : ""}${yieldDelta!.toFixed(1)}g off`
              }, ${timeInRange ? "time on target" : shotTimeSeconds < targetZone.timeMinSeconds ? "ran fast" : "ran slow"}${
                nearMissZone ? ` — closer to ${nearMissZone.label}` : ""
              }.`
          : `No target recorded — closest to ${nearMissZone!.label} (${nearMissZone!.yieldForDose.toFixed(1)}g, ${nearMissZone!.timeMinSeconds}–${nearMissZone!.timeMaxSeconds}s).`}
      </p>
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

        {/* Frame — closed rectangle instead of open axis lines */}
        <rect x={PAD.l} y={PAD.t} width={cw} height={ch} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />

        {/* Target zone — unlabeled, light accent fill */}
        {targetZone && renderZone(targetZone, "var(--accent)", 0.18)}

        {/* Near-miss zone — the shot landed closer to a different style */}
        {nearMissZone && renderZone(nearMissZone, "#FF9500", 0.14)}

        {/* X numeric ticks */}
        {xTicks.map((t) => (
          <text key={t} x={toX(t)} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">
            {t}s
          </text>
        ))}

        {/* Crosshair to the actual shot */}
        <line x1={shotX} y1={shotY} x2={shotX} y2={PAD.t + ch} stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2,2" />
        <line x1={PAD.l} y1={shotY} x2={shotX} y2={shotY} stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2,2" />

        <circle cx={shotX} cy={shotY} r="5.5" fill={dotColor} stroke="var(--card)" strokeWidth="2" />
        <text
          x={shotX + (shotX > PAD.l + cw - 60 ? -9 : 9)}
          y={shotY}
          textAnchor={shotX > PAD.l + cw - 60 ? "end" : "start"}
          dominantBaseline="middle"
          fontSize="9"
          fill={dotColor}
        >
          ({shotTimeSeconds}s, {yieldG}g)
        </text>
      </svg>
    </div>
  );
}
