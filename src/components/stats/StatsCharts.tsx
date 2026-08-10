// Shared chart primitives used by both the global Stats tab
// (src/app/(app)/more/stats/page.tsx) and the per-roaster stats on the
// roaster detail page — extracted here once a second page needed them.

export interface BarSpec { label: string; count: number; color: string; }

export type RatingBreakdownRow = { label: string; total: number; r1: number; r2: number; r3: number; r4: number; r5: number; unrated: number };

export const RATING_COLORS: Record<number, string> = {
  1: "#FF3B30", 2: "#FF9500", 3: "#FFD60A", 4: "#34C759", 5: "#30D158",
};

export const RATING_SEG_COLORS = ["#FF3B30", "#FF9500", "#FFD60A", "#34C759", "#30D158"];

export function BarChart({ bars, title, subtitle, labelFontSize = 9, stat, statColor, footnote }: {
  bars: BarSpec[]; title: string; subtitle: string; labelFontSize?: number;
  stat?: string; statColor?: string; footnote?: string;
}) {
  const n = bars.length;
  const W = 280, H = 110, padL = 8, padR = 8, padTop = 22, padBottom = 22;
  const chartW = W - padL - padR, chartH = H - padTop - padBottom;
  const baseY = padTop + chartH;
  const slotW = chartW / n;
  const barW = Math.min(22, slotW * 0.55);
  const maxCount = Math.max(...bars.map(b => b.count), 1);
  const computed = bars.map((b, i) => {
    const cx = padL + slotW * i + slotW / 2;
    const barH = (b.count / maxCount) * chartH;
    return { ...b, cx, barH, y: baseY - barH };
  });
  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{title}</p>
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
      </div>
      {stat && (
        <p className="px-4 pb-2 text-[13px]" style={{ color: statColor ?? "var(--text-primary)" }}>{stat}</p>
      )}
      {footnote && (
        <p className="px-4 pb-1 text-[11px]" style={{ color: "var(--text-secondary)", opacity: 0.65 }}>{footnote}</p>
      )}
      <div className="px-2 pb-3">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          {computed.map(b => b.barH > 0 && (
            <rect key={b.label} x={b.cx - barW / 2} y={b.y} width={barW} height={b.barH}
              rx={4} fill={b.color} opacity={0.85} />
          ))}
          {computed.map(b => b.count > 0 && (
            <text key={`cnt-${b.label}`} x={b.cx} y={b.y - 5} textAnchor="middle" fontSize={9}
              fill="var(--text-secondary)" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">
              {b.count}
            </text>
          ))}
          {computed.map(b => (
            <text key={`lbl-${b.label}`} x={b.cx} y={H - 5} textAnchor="middle" fontSize={labelFontSize}
              fill="var(--text-secondary)" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">
              {b.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function RatingStackedHorizontalBarChart({ rows, title, subtitle }: {
  rows: RatingBreakdownRow[];
  title: string;
  subtitle: string;
}) {
  const maxTotal = Math.max(...rows.map(r => r.total), 1);

  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{title}</p>
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
      </div>
      <div className="px-4 pb-2 flex items-center gap-3 flex-wrap">
        {RATING_SEG_COLORS.map((color, i) => (
          <span key={i} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            {i + 1}★
          </span>
        ))}
        <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: "#8E8E93" }} />
          Unrated
        </span>
      </div>
      <div className="px-4 pb-3 flex flex-col gap-2.5">
        {rows.map((row, i) => {
          const counts = [row.r1, row.r2, row.r3, row.r4, row.r5, row.unrated];
          const segColors = [...RATING_SEG_COLORS, "#8E8E93"];
          const segments: { left: number; width: number; color: string }[] = [];
          let offset = 0;
          counts.forEach((count, j) => {
            if (count > 0) {
              segments.push({ left: (offset / maxTotal) * 100, width: (count / maxTotal) * 100, color: segColors[j] });
              offset += count;
            }
          });
          const pctLabels = counts
            .map((count, j) => ({ count, color: segColors[j], label: j < 5 ? `${j + 1}★` : "unr" }))
            .filter(s => s.count > 0)
            .map(s => ({ ...s, pct: Math.round((s.count / row.total) * 100) }));
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] truncate mr-3" style={{ color: "var(--text-primary)", maxWidth: "75%" }}>
                  {row.label}
                </span>
                <span className="text-[12px] flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                  {row.total}
                </span>
              </div>
              <div className="relative rounded-full overflow-hidden" style={{ height: 8, backgroundColor: "var(--card-secondary)" }}>
                {segments.map((seg, j) => (
                  <div key={j} className="absolute inset-y-0" style={{
                    left: `${seg.left.toFixed(2)}%`,
                    width: `${seg.width.toFixed(2)}%`,
                    backgroundColor: seg.color,
                  }} />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {pctLabels.map((s, j) => (
                  <span key={j} className="text-[10px]" style={{ color: "var(--text-secondary)", opacity: 0.65 }}>
                    {s.label} {s.pct}%
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
