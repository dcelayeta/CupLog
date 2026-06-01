export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

// ─── Queries ──────────────────────────────────────────────────────────────────

async function getRatingDistribution(): Promise<Record<number, number>> {
  const rows = await db.all(sql`
    SELECT shot_rating, COUNT(*) as count
    FROM shots
    WHERE shot_rating IS NOT NULL AND is_failed = 0
    GROUP BY shot_rating
  `) as { shot_rating: number; count: number }[];
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) dist[Number(row.shot_rating)] = Number(row.count);
  return dist;
}

async function getTasteDistribution(): Promise<Record<number, number>> {
  const rows = await db.all(sql`
    SELECT
      CASE
        WHEN taste_balance <= 1.4 THEN 1
        WHEN taste_balance <= 2.4 THEN 2
        WHEN taste_balance <= 3.4 THEN 3
        WHEN taste_balance <= 4.4 THEN 4
        WHEN taste_balance <= 5.4 THEN 5
        WHEN taste_balance <= 6.4 THEN 6
        ELSE 7
      END as bucket,
      COUNT(*) as count
    FROM shots
    WHERE taste_balance IS NOT NULL AND is_failed = 0
    GROUP BY bucket
  `) as { bucket: number; count: number }[];
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const row of rows) dist[Number(row.bucket)] = Number(row.count);
  return dist;
}

interface ScatterPoint { x: number; y: number; rating: number | null; }

async function getScatterData(): Promise<ScatterPoint[][]> {
  const rows = await db.all(sql`
    SELECT dose_g, yield_g, shot_time_seconds, taste_balance, shot_rating
    FROM shots
    WHERE taste_balance IS NOT NULL AND is_failed = 0
  `) as {
    dose_g: number | null; yield_g: number | null;
    shot_time_seconds: number | null; taste_balance: number; shot_rating: number | null;
  }[];
  const ratioPoints: ScatterPoint[] = [];
  const timePoints: ScatterPoint[] = [];
  for (const r of rows) {
    const tb = Number(r.taste_balance);
    const rating = r.shot_rating !== null ? Number(r.shot_rating) : null;
    if (r.dose_g && r.yield_g && Number(r.dose_g) > 0)
      ratioPoints.push({ x: Number(r.yield_g) / Number(r.dose_g), y: tb, rating });
    if (r.shot_time_seconds !== null)
      timePoints.push({ x: Number(r.shot_time_seconds), y: tb, rating });
  }
  return [ratioPoints, timePoints];
}

interface RatingTrendPoint { rating: number; tasteBalance: number | null; }

async function getRatingTrend(): Promise<RatingTrendPoint[]> {
  const rows = await db.all(sql`
    SELECT shot_rating, taste_balance
    FROM shots
    WHERE shot_rating IS NOT NULL AND is_failed = 0
    ORDER BY pulled_at ASC
  `) as { shot_rating: number; taste_balance: number | null }[];
  return rows.map(r => ({
    rating: Number(r.shot_rating),
    tasteBalance: r.taste_balance !== null ? Number(r.taste_balance) : null,
  }));
}

async function getFreshnessVsTaste(): Promise<ScatterPoint[]> {
  const rows = await db.all(sql`
    SELECT s.taste_balance, s.shot_rating, s.pulled_at, b.roast_date
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    WHERE s.taste_balance IS NOT NULL AND b.roast_date IS NOT NULL AND s.is_failed = 0
  `) as { taste_balance: number; shot_rating: number | null; pulled_at: string; roast_date: string }[];
  return rows.flatMap(r => {
    const days = Math.floor(
      (new Date(r.pulled_at).getTime() - new Date(r.roast_date + "T00:00:00").getTime()) / 86400000
    );
    if (days < 0 || days > 90) return [];
    return [{ x: days, y: Number(r.taste_balance), rating: r.shot_rating !== null ? Number(r.shot_rating) : null }];
  });
}

async function getFlowRateDistribution(): Promise<Record<string, number>> {
  const rows = await db.all(sql`
    SELECT
      ROUND(CAST(yield_g AS REAL) / shot_time_seconds / 0.2) * 0.2 AS bucket,
      COUNT(*) as count
    FROM shots
    WHERE yield_g IS NOT NULL
      AND shot_time_seconds IS NOT NULL
      AND shot_time_seconds > 0
      AND is_failed = 0
    GROUP BY bucket
    ORDER BY bucket
  `) as { bucket: number; count: number }[];

  const BUCKETS = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2];
  const dist: Record<string, number> = Object.fromEntries(BUCKETS.map(b => [b.toFixed(1), 0]));

  for (const row of rows) {
    const b = Math.round(Number(row.bucket) * 10) / 10;
    const key = b < 0.4 ? "0.4" : b > 2.2 ? "2.2" : b.toFixed(1);
    dist[key] = (dist[key] ?? 0) + Number(row.count);
  }
  return dist;
}

async function getRoastTypeDistribution(): Promise<{ roastLevel: string; count: number }[]> {
  const rows = await db.all(sql`
    SELECT b.roast_level as roastLevel, COUNT(s.id) as count
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    GROUP BY b.roast_level
    ORDER BY count DESC
  `) as { roastLevel: string; count: number }[];
  return rows.map(r => ({ roastLevel: String(r.roastLevel), count: Number(r.count) }));
}

async function getProcessMethodDistribution(): Promise<{ method: string; count: number }[]> {
  const rows = await db.all(sql`
    SELECT b.processing_method as method, COUNT(s.id) as count
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    GROUP BY b.processing_method
    ORDER BY count DESC
  `) as { method: string; count: number }[];
  return rows.map(r => ({ method: String(r.method), count: Number(r.count) }));
}

type OriginBreakdownRow = {
  label: string; country: string; total: number;
  r1: number; r2: number; r3: number; r4: number; r5: number; unrated: number;
};

async function getOriginRatingDistribution(): Promise<OriginBreakdownRow[]> {
  const rows = await db.all(sql`
    SELECT bo.country, bo.region,
      COUNT(s.id) as total,
      SUM(CASE WHEN s.shot_rating = 1 THEN 1 ELSE 0 END) as r1,
      SUM(CASE WHEN s.shot_rating = 2 THEN 1 ELSE 0 END) as r2,
      SUM(CASE WHEN s.shot_rating = 3 THEN 1 ELSE 0 END) as r3,
      SUM(CASE WHEN s.shot_rating = 4 THEN 1 ELSE 0 END) as r4,
      SUM(CASE WHEN s.shot_rating = 5 THEN 1 ELSE 0 END) as r5,
      SUM(CASE WHEN s.shot_rating IS NULL THEN 1 ELSE 0 END) as unrated
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    JOIN bag_origins bo ON bo.bag_id = b.id
    WHERE s.is_failed = 0
    GROUP BY bo.country, bo.region
    ORDER BY total DESC
  `) as { country: string; region: string | null; total: number; r1: number; r2: number; r3: number; r4: number; r5: number; unrated: number }[];
  return rows.map(r => ({
    label: r.region ? `${r.region} · ${r.country}` : String(r.country),
    country: String(r.country),
    total: Number(r.total),
    r1: Number(r.r1), r2: Number(r.r2), r3: Number(r.r3), r4: Number(r.r4), r5: Number(r.r5),
    unrated: Number(r.unrated),
  }));
}

async function getBlendDistribution(): Promise<RatingBreakdownRow[]> {
  const rows = await db.all(sql`
    SELECT
      CASE WHEN b.is_blend = 1 THEN 'Blend' ELSE 'Single Origin' END as label,
      COUNT(s.id) as total,
      SUM(CASE WHEN s.shot_rating = 1 THEN 1 ELSE 0 END) as r1,
      SUM(CASE WHEN s.shot_rating = 2 THEN 1 ELSE 0 END) as r2,
      SUM(CASE WHEN s.shot_rating = 3 THEN 1 ELSE 0 END) as r3,
      SUM(CASE WHEN s.shot_rating = 4 THEN 1 ELSE 0 END) as r4,
      SUM(CASE WHEN s.shot_rating = 5 THEN 1 ELSE 0 END) as r5,
      SUM(CASE WHEN s.shot_rating IS NULL THEN 1 ELSE 0 END) as unrated
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    GROUP BY label
    ORDER BY total DESC
  `) as { label: string; total: number; r1: number; r2: number; r3: number; r4: number; r5: number; unrated: number }[];
  return rows.map(r => ({
    label: String(r.label),
    total: Number(r.total),
    r1: Number(r.r1), r2: Number(r.r2), r3: Number(r.r3), r4: Number(r.r4), r5: Number(r.r5),
    unrated: Number(r.unrated),
  }));
}

async function getShotsPerCoffee(): Promise<RatingBreakdownRow[]> {
  const rows = await db.all(sql`
    SELECT
      b.name as label,
      COUNT(s.id) as total,
      SUM(CASE WHEN s.shot_rating = 1 THEN 1 ELSE 0 END) as r1,
      SUM(CASE WHEN s.shot_rating = 2 THEN 1 ELSE 0 END) as r2,
      SUM(CASE WHEN s.shot_rating = 3 THEN 1 ELSE 0 END) as r3,
      SUM(CASE WHEN s.shot_rating = 4 THEN 1 ELSE 0 END) as r4,
      SUM(CASE WHEN s.shot_rating = 5 THEN 1 ELSE 0 END) as r5,
      SUM(CASE WHEN s.shot_rating IS NULL THEN 1 ELSE 0 END) as unrated
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    GROUP BY lower(b.roaster), lower(b.name)
    ORDER BY total DESC
  `) as { label: string; total: number; r1: number; r2: number; r3: number; r4: number; r5: number; unrated: number }[];
  return rows.map(r => ({
    label: String(r.label),
    total: Number(r.total),
    r1: Number(r.r1), r2: Number(r.r2), r3: Number(r.r3), r4: Number(r.r4), r5: Number(r.r5),
    unrated: Number(r.unrated),
  }));
}

async function getFailedShotStats(): Promise<{ total: number; totalShots: number; byReason: { reason: string; count: number }[] }> {
  const [row] = await db.all(sql`
    SELECT
      COUNT(*) as total_shots,
      SUM(CASE WHEN is_failed = 1 THEN 1 ELSE 0 END) as failed_shots
    FROM shots
  `) as { total_shots: number; failed_shots: number }[];

  const byReason = await db.all(sql`
    SELECT COALESCE(fail_reason, 'other') as reason, COUNT(*) as count
    FROM shots
    WHERE is_failed = 1
    GROUP BY reason
    ORDER BY count DESC
  `) as { reason: string; count: number }[];

  return {
    total: Number(row?.failed_shots ?? 0),
    totalShots: Number(row?.total_shots ?? 0),
    byReason: byReason.map(r => ({ reason: String(r.reason), count: Number(r.count) })),
  };
}

type RatingBreakdownRow = { label: string; total: number; r1: number; r2: number; r3: number; r4: number; r5: number; unrated: number };

async function getDrinkTypeDistribution(): Promise<RatingBreakdownRow[]> {
  const rows = await db.all(sql`
    SELECT
      detected_drink_name as label,
      COUNT(*) as total,
      SUM(CASE WHEN overall_rating = 1 THEN 1 ELSE 0 END) as r1,
      SUM(CASE WHEN overall_rating = 2 THEN 1 ELSE 0 END) as r2,
      SUM(CASE WHEN overall_rating = 3 THEN 1 ELSE 0 END) as r3,
      SUM(CASE WHEN overall_rating = 4 THEN 1 ELSE 0 END) as r4,
      SUM(CASE WHEN overall_rating = 5 THEN 1 ELSE 0 END) as r5,
      SUM(CASE WHEN overall_rating IS NULL THEN 1 ELSE 0 END) as unrated
    FROM drinks
    WHERE detected_drink_name IS NOT NULL
    GROUP BY detected_drink_name
    ORDER BY total DESC
  `) as { label: string; total: number; r1: number; r2: number; r3: number; r4: number; r5: number; unrated: number }[];
  return rows.map(r => ({
    label: String(r.label),
    total: Number(r.total),
    r1: Number(r.r1), r2: Number(r.r2), r3: Number(r.r3), r4: Number(r.r4), r5: Number(r.r5),
    unrated: Number(r.unrated),
  }));
}

async function getDrinkRatingTrend(): Promise<{ rating: number; drinkName: string | null }[]> {
  const rows = await db.all(sql`
    SELECT d.overall_rating as rating, d.detected_drink_name as drinkName
    FROM drinks d
    JOIN shots s ON d.shot_id = s.id
    WHERE d.overall_rating IS NOT NULL
    ORDER BY s.pulled_at ASC
  `) as { rating: number; drinkName: string | null }[];
  return rows.map(r => ({ rating: Number(r.rating), drinkName: r.drinkName ? String(r.drinkName) : null }));
}

async function getShotVsDrinkRatings(): Promise<{ shotRating: number; drinkRating: number; count: number }[]> {
  const rows = await db.all(sql`
    SELECT s.shot_rating as shotRating, d.overall_rating as drinkRating, COUNT(*) as count
    FROM shots s
    JOIN drinks d ON d.shot_id = s.id
    WHERE s.shot_rating IS NOT NULL AND d.overall_rating IS NOT NULL
    GROUP BY s.shot_rating, d.overall_rating
  `) as { shotRating: number; drinkRating: number; count: number }[];
  return rows.map(r => ({ shotRating: Number(r.shotRating), drinkRating: Number(r.drinkRating), count: Number(r.count) }));
}

async function getRetentionTrend(): Promise<number[]> {
  const rows = await db.all(sql`
    SELECT grinder_retention_g
    FROM shots
    WHERE grinder_retention_g IS NOT NULL
    ORDER BY pulled_at ASC
  `) as { grinder_retention_g: number }[];
  return rows.map(r => Number(r.grinder_retention_g));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RATING_COLORS: Record<number, string> = {
  1: "#FF3B30", 2: "#FF9500", 3: "#FFD60A", 4: "#34C759", 5: "#30D158",
};

const TASTE_ZONE_COLORS = [
  "#FF3B30", "#FF6B35", "#FFB347", "#34C759", "#FF9500", "#8B5CF6", "#6D28D9",
];

function tasteLabel(tb: number | null): string {
  if (tb === null) return "—";
  if (tb <= 1.4) return "Very Sour";
  if (tb <= 2.4) return "Sour";
  if (tb <= 3.4) return "Slightly Sour";
  if (tb <= 4.4) return "Balanced";
  if (tb <= 5.4) return "Slightly Bitter";
  if (tb <= 6.4) return "Bitter";
  return "Very Bitter";
}

function tasteBalanceColor(tb: number | null): string {
  if (tb === null) return "#8E8E93";
  if (tb <= 1.4) return TASTE_ZONE_COLORS[0];
  if (tb <= 2.4) return TASTE_ZONE_COLORS[1];
  if (tb <= 3.4) return TASTE_ZONE_COLORS[2];
  if (tb <= 4.4) return TASTE_ZONE_COLORS[3];
  if (tb <= 5.4) return TASTE_ZONE_COLORS[4];
  if (tb <= 6.4) return TASTE_ZONE_COLORS[5];
  return TASTE_ZONE_COLORS[6];
}

function catmullRomPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M ${p[1][0]} ${p[1][1]}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1], [x1, y1] = p[i], [x2, y2] = p[i + 1], [x3, y3] = p[i + 2];
    const cp1x = x1 + (x2 - x0) / 6, cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6, cp2y = y2 - (y3 - y1) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)},${cp2x.toFixed(1)} ${cp2y.toFixed(1)},${x2} ${y2}`;
  }
  return d;
}

// ─── Chart components ─────────────────────────────────────────────────────────

interface BarSpec { label: string; count: number; color: string; }

function BarChart({ bars, title, subtitle, labelFontSize = 9, stat, statColor, footnote }: {
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

function ScatterPlot({ points, title, subtitle, xMin, xMax, xTicks, xFormat }: {
  points: ScatterPoint[]; title: string; subtitle: string;
  xMin: number; xMax: number; xTicks: number[]; xFormat: (v: number) => string;
}) {
  const W = 300, H = 190, padL = 34, padR = 10, padT = 12, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xPos = (v: number) => padL + (v - xMin) / (xMax - xMin) * plotW;
  const yPos = (tb: number) => padT + (7 - tb) / 6 * plotH;
  const bandY1 = yPos(4.4), bandY2 = yPos(3.5);

  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{title}</p>
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
      </div>
      {points.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>No data yet</p>
        </div>
      ) : (
        <>
          <div className="px-2">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
              <rect x={padL} y={bandY1} width={plotW} height={bandY2 - bandY1} fill="#30D158" opacity={0.08} />
              {[1, 2, 3, 4, 5, 6, 7].map(tb => (
                <line key={tb} x1={padL} y1={yPos(tb)} x2={padL + plotW} y2={yPos(tb)}
                  style={{ stroke: "var(--divider)" }} strokeWidth={tb === 4 ? 1 : 0.5} />
              ))}
              {[{ tb: 1, label: "Sour" }, { tb: 4, label: "Bal." }, { tb: 7, label: "Bitter" }].map(({ tb, label }) => (
                <text key={tb} x={padL - 4} y={yPos(tb) + 3.5} textAnchor="end" fontSize={8}
                  fill="var(--text-secondary)" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">
                  {label}
                </text>
              ))}
              {xTicks.map(v => (
                <g key={v}>
                  <line x1={xPos(v)} y1={padT + plotH} x2={xPos(v)} y2={padT + plotH + 4}
                    style={{ stroke: "var(--divider)" }} strokeWidth={1} />
                  <text x={xPos(v)} y={H - 5} textAnchor="middle" fontSize={8}
                    fill="var(--text-secondary)" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">
                    {xFormat(v)}
                  </text>
                </g>
              ))}
              {points.map((pt, i) => {
                const cx = xPos(pt.x), cy = yPos(pt.y);
                if (cx < padL || cx > padL + plotW || cy < padT || cy > padT + plotH) return null;
                return <circle key={i} cx={cx} cy={cy} r={3.5}
                  fill={pt.rating !== null ? RATING_COLORS[pt.rating] : "#8E8E93"} opacity={0.72} />;
              })}
            </svg>
          </div>
          <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
            {[5, 4, 3, 2, 1].map(r => (
              <span key={r} className="flex items-center gap-1">
                <svg width="8" height="8" style={{ flexShrink: 0 }}><circle cx="4" cy="4" r="3.5" fill={RATING_COLORS[r]} /></svg>
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{r}★</span>
              </span>
            ))}
            <span className="flex items-center gap-1">
              <svg width="8" height="8" style={{ flexShrink: 0 }}><circle cx="4" cy="4" r="3.5" fill="#8E8E93" /></svg>
              <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>unrated</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function TrendChart({ points, title, subtitle, yMin, yMax, yTicks, yFormat, connectLine = false, rollingWindow = 0, legend, stat, statColor }: {
  points: Array<{ y: number; color: string }>;
  title: string; subtitle: string;
  yMin: number; yMax: number;
  yTicks: number[]; yFormat: (v: number) => string;
  connectLine?: boolean;
  rollingWindow?: number;
  legend?: React.ReactNode;
  stat?: string; statColor?: string;
}) {
  const W = 300, H = 170, padL = 34, padR = 10, padT = 12, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = points.length;

  const xPos = (i: number) => padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const yPos = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  // Rolling average
  const rollingPts: [number, number][] = rollingWindow > 1
    ? points.map((_, i) => {
        const half = Math.floor(rollingWindow / 2);
        const s = Math.max(0, i - half), e = Math.min(n, i + half + 1);
        const avg = points.slice(s, e).reduce((a, p) => a + p.y, 0) / (e - s);
        return [xPos(i), yPos(avg)];
      })
    : [];

  const linePath = connectLine && n > 1
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${xPos(i).toFixed(1)} ${yPos(p.y).toFixed(1)}`).join(" ")
    : "";

  // X axis: show first, mid, last
  const xLabels = n < 2 ? [0] : [...new Set([0, Math.round((n - 1) / 2), n - 1])];

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
      {n < 3 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>Not enough data yet</p>
        </div>
      ) : (
        <>
          <div className="px-2">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
              {yTicks.map(v => (
                <line key={v} x1={padL} y1={yPos(v)} x2={padL + plotW} y2={yPos(v)}
                  style={{ stroke: "var(--divider)" }} strokeWidth={0.5} />
              ))}
              {yTicks.map(v => (
                <text key={`lbl-${v}`} x={padL - 4} y={yPos(v) + 3.5} textAnchor="end" fontSize={8}
                  fill="var(--text-secondary)" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">
                  {yFormat(v)}
                </text>
              ))}
              {xLabels.map(i => (
                <text key={i} x={xPos(i)} y={H - 5} textAnchor="middle" fontSize={8}
                  fill="var(--text-secondary)" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">
                  #{i + 1}
                </text>
              ))}
              {linePath && (
                <path d={linePath} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth={1} opacity={0.2} />
              )}
              {rollingPts.length > 1 && (
                <path d={catmullRomPath(rollingPts)} fill="none" style={{ stroke: "var(--accent)" }}
                  strokeWidth={1.5} opacity={0.55} strokeLinecap="round" strokeLinejoin="round" />
              )}
              {points.map((pt, i) => (
                <circle key={i} cx={xPos(i)} cy={yPos(pt.y)} r={3} fill={pt.color} opacity={0.78} />
              ))}
            </svg>
          </div>
          {legend && <div className="px-4 pb-3">{legend}</div>}
        </>
      )}
    </div>
  );
}

function RatingBubbleChart({ data, title, subtitle }: {
  data: { shotRating: number; drinkRating: number; count: number }[];
  title: string;
  subtitle: string;
}) {
  const W = 280, H = 200;
  const padL = 38, padR = 12, padT = 12, padB = 32;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const ratings = [1, 2, 3, 4, 5];
  const xPos = (r: number) => padL + ((r - 1) / 4) * plotW;
  const yPos = (r: number) => padT + ((5 - r) / 4) * plotH;
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{title}</p>
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
      </div>
      {data.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>No data yet</p>
        </div>
      ) : (
        <div className="px-2 pb-3">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
            {/* Diagonal reference line */}
            <line x1={xPos(1)} y1={yPos(1)} x2={xPos(5)} y2={yPos(5)}
              style={{ stroke: "var(--divider)" }} strokeWidth={1} strokeDasharray="3 3" />
            {/* Grid */}
            {ratings.map(r => (
              <g key={r}>
                <line x1={xPos(r)} y1={padT} x2={xPos(r)} y2={padT + plotH}
                  style={{ stroke: "var(--divider)" }} strokeWidth={0.5} />
                <line x1={padL} y1={yPos(r)} x2={padL + plotW} y2={yPos(r)}
                  style={{ stroke: "var(--divider)" }} strokeWidth={0.5} />
                <text x={xPos(r)} y={H - 8} textAnchor="middle" fontSize={9}
                  fill="var(--text-secondary)" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">
                  {r}★
                </text>
                <text x={padL - 5} y={yPos(r) + 3.5} textAnchor="end" fontSize={9}
                  fill="var(--text-secondary)" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">
                  {r}★
                </text>
              </g>
            ))}
            {/* Axis labels */}
            <text x={padL + plotW / 2} y={H - 1} textAnchor="middle" fontSize={8}
              fill="var(--text-secondary)" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">
              Shot
            </text>
            <text x={8} y={padT + plotH / 2} textAnchor="middle" fontSize={8}
              fill="var(--text-secondary)" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif"
              transform={`rotate(-90, 8, ${padT + plotH / 2})`}>
              Drink
            </text>
            {/* Bubbles */}
            {data.map(({ shotRating, drinkRating, count }) => (
              <g key={`${shotRating}-${drinkRating}`}>
                <circle
                  cx={xPos(shotRating)} cy={yPos(drinkRating)}
                  r={3 + (count / maxCount) * 10}
                  fill={RATING_COLORS[shotRating] ?? "#8E8E93"} opacity={0.72}
                />
                {count > 1 && (
                  <text x={xPos(shotRating)} y={yPos(drinkRating) + 3.5} textAnchor="middle" fontSize={8}
                    fill="white" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif" fontWeight="600">
                    {count}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <p className="text-[20px] font-semibold mb-3 mt-2" style={{ color: "var(--text-primary)" }}>
      {title}
    </p>
  );
}

function HorizontalBarChart({ rows, title, subtitle }: {
  rows: { label: string; count: number }[];
  title: string;
  subtitle: string;
}) {
  const max = Math.max(...rows.map(r => r.count), 1);
  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{title}</p>
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
      </div>
      <div className="px-4 pb-3 flex flex-col gap-2.5">
        {rows.map((row, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>{row.label}</span>
              <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{row.count} shot{row.count !== 1 ? "s" : ""}</span>
            </div>
            <div className="relative rounded-full overflow-hidden" style={{ height: 6, backgroundColor: "var(--card-secondary)" }}>
              <div className="absolute inset-y-0 left-0 rounded-full" style={{
                width: `${(row.count / max * 100).toFixed(1)}%`,
                backgroundColor: "var(--accent)",
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


const RATING_SEG_COLORS = ["#FF3B30", "#FF9500", "#FFD60A", "#34C759", "#30D158"];

function RatingStackedHorizontalBarChart({ rows, title, subtitle }: {
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
          const colors = [...RATING_SEG_COLORS, "#8E8E93"];
          const segments: { left: number; width: number; color: string }[] = [];
          let offset = 0;
          counts.forEach((count, j) => {
            if (count > 0) {
              segments.push({ left: (offset / maxTotal) * 100, width: (count / maxTotal) * 100, color: colors[j] });
              offset += count;
            }
          });
          const pctLabels = counts
            .map((count, j) => ({ count, color: colors[j], label: j < 5 ? `${j + 1}★` : "unr" }))
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
                  <span key={j} className="text-[10px]" style={{ color: s.color, opacity: 0.65 }}>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StatsPage() {
  const [
    ratingDist, tasteDist,
    [ratioPoints, timePoints],
    ratingTrend, freshnessPoints, retentionValues, flowRateDist,
    roastTypeDist, shotsPerCoffee, processMethodDist, originRatingDist, blendDist,
    drinkTypeDist, drinkRatingTrend, shotVsDrinkRatings,
    failedStats,
  ] = await Promise.all([
    getRatingDistribution(),
    getTasteDistribution(),
    getScatterData(),
    getRatingTrend(),
    getFreshnessVsTaste(),
    getRetentionTrend(),
    getFlowRateDistribution(),
    getRoastTypeDistribution(),
    getShotsPerCoffee(),
    getProcessMethodDistribution(),
    getOriginRatingDistribution(),
    getBlendDistribution(),
    getDrinkTypeDistribution(),
    getDrinkRatingTrend(),
    getShotVsDrinkRatings(),
    getFailedShotStats(),
  ]);

  const ratingBars: BarSpec[] = [
    { label: "1★", count: ratingDist[1], color: "#FF3B30" },
    { label: "2★", count: ratingDist[2], color: "#FF9500" },
    { label: "3★", count: ratingDist[3], color: "#FFD60A" },
    { label: "4★", count: ratingDist[4], color: "#34C759" },
    { label: "5★", count: ratingDist[5], color: "#30D158" },
  ];

  const tasteBars: BarSpec[] = [
    { label: "V.Sour",    count: tasteDist[1], color: "var(--accent)" },
    { label: "Sour",      count: tasteDist[2], color: "var(--accent)" },
    { label: "Sl.Sour",   count: tasteDist[3], color: "var(--accent)" },
    { label: "Balanced",  count: tasteDist[4], color: "var(--accent)" },
    { label: "Sl.Bitter", count: tasteDist[5], color: "var(--accent)" },
    { label: "Bitter",    count: tasteDist[6], color: "var(--accent)" },
    { label: "V.Bitter",  count: tasteDist[7], color: "var(--accent)" },
  ];

  const totalRated = ratingBars.reduce((a, b) => a + b.count, 0);
  const totalTaste = tasteBars.reduce((a, b) => a + b.count, 0);

  const flowZoneColor = (bucket: number) => {
    if (bucket < 0.8) return "#FF3B30";
    if (bucket < 1.0) return "#FF9500";
    if (bucket < 1.6) return "#34C759";
    if (bucket < 2.0) return "#FF9500";
    return "#FF3B30";
  };
  const FLOW_BUCKETS = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2];
  const flowBars: BarSpec[] = FLOW_BUCKETS.map((b) => ({
    label: b === 2.2 ? "2.2+" : b.toFixed(1),
    count: flowRateDist[b.toFixed(1)] ?? 0,
    color: flowZoneColor(b),
  }));
  const totalFlowRated = flowBars.reduce((a, b) => a + b.count, 0);

  // Averages for stat lines
  const avgRating = totalRated > 0
    ? ratingBars.reduce((a, b, i) => a + (i + 1) * b.count, 0) / totalRated
    : null;

  const TASTE_MIDPOINTS: Record<number, number> = { 1: 0.7, 2: 1.9, 3: 2.9, 4: 3.9, 5: 4.9, 6: 5.9, 7: 6.7 };
  const avgTasteRaw = totalTaste > 0
    ? Object.entries(tasteDist).reduce((a, [k, v]) => a + (TASTE_MIDPOINTS[Number(k)] ?? Number(k)) * v, 0) / totalTaste
    : null;

  const avgFlowRate = totalFlowRated > 0
    ? FLOW_BUCKETS.reduce((a, b) => a + b * (flowRateDist[b.toFixed(1)] ?? 0), 0) / totalFlowRated
    : null;

  const avgRetention = retentionValues.length > 0
    ? retentionValues.reduce((a, b) => a + b, 0) / retentionValues.length
    : null;

  // Rating trend — dots colored by taste balance, rolling avg overlay
  const ratingWindow = Math.max(5, Math.round(ratingTrend.length / 8));
  const ratingTrendPoints = ratingTrend.map(p => ({
    y: p.rating, color: tasteBalanceColor(p.tasteBalance),
  }));

  // Freshness scatter — auto-scale X to data
  const maxFreshnessDay = freshnessPoints.length > 0
    ? Math.min(90, Math.ceil(Math.max(...freshnessPoints.map(p => p.x)) / 10) * 10)
    : 60;
  const freshnessTicks = [10, 20, 30, 40, 50, 60, 70, 80, 90].filter(t => t <= maxFreshnessDay);

  // Retention trend — auto-scale Y
  const retentionPoints = retentionValues.map((y, i) => ({ y, color: "var(--accent)" }));
  let retYMin = 0, retYMax = 1, retTicks: number[] = [0, 0.5, 1];
  if (retentionValues.length >= 3) {
    const lo = Math.min(...retentionValues), hi = Math.max(...retentionValues);
    const pad = Math.max(0.05, (hi - lo) * 0.2);
    retYMin = Math.max(0, lo - pad);
    retYMax = hi + pad;
    const range = retYMax - retYMin;
    const step = range < 0.5 ? 0.1 : range < 1.5 ? 0.2 : range < 3 ? 0.5 : 1;
    retTicks = [];
    const start = Math.ceil(retYMin / step) * step;
    for (let t = start; t <= retYMax + step * 0.01; t += step)
      retTicks.push(Math.round(t * 100) / 100);
  }

  // Bean section data
  const ROAST_LEVEL_LABELS: Record<string, string> = {
    light: "Light", medium_light: "Med-Light", medium: "Medium",
    medium_dark: "Med-Dark", dark: "Dark",
  };
  const ROAST_LEVEL_COLORS: Record<string, string> = {
    light: "#FFD60A", medium_light: "#FF9500", medium: "#C84B31",
    medium_dark: "#8B3A2A", dark: "#4A2315",
  };
  const roastCountMap = Object.fromEntries(roastTypeDist.map(r => [r.roastLevel, r.count]));
  const roastUnspecified = roastCountMap["unspecified"] ?? 0;
  const roastTotal = roastTypeDist.reduce((a, r) => a + r.count, 0);
  const roastTagged = roastTotal - roastUnspecified;
  const roastBars: BarSpec[] = (["light", "medium_light", "medium", "medium_dark", "dark"] as const).map(level => ({
    label: ROAST_LEVEL_LABELS[level],
    count: roastCountMap[level] ?? 0,
    color: ROAST_LEVEL_COLORS[level],
  }));

  const PROCESS_LABELS: Record<string, string> = {
    washed: "Washed", natural: "Natural", honey: "Honey",
    anaerobic: "Anaerob.", ea_washed: "EA W.",
    swiss_water: "Swiss W.", other: "Other",
  };
  const PROCESS_COLORS: Record<string, string> = {
    washed: "#34AADC", natural: "#E8735A", honey: "#F5A623",
    anaerobic: "#8B5CF6", ea_washed: "#34C759",
    swiss_water: "#30D158", other: "#8E8E93",
  };
  const processCountMap = Object.fromEntries(processMethodDist.map(r => [r.method, r.count]));
  const processUnspecified = processCountMap["unspecified"] ?? 0;
  const processTotal = processMethodDist.reduce((a, r) => a + r.count, 0);
  const processTagged = processTotal - processUnspecified;
  const processBars: BarSpec[] = (["washed", "natural", "honey", "anaerobic", "ea_washed", "swiss_water", "other"] as const).map(m => ({
    label: PROCESS_LABELS[m],
    count: processCountMap[m] ?? 0,
    color: PROCESS_COLORS[m],
  }));

  const originRows = originRatingDist;

  const COUNTRY_TO_MACRO: Record<string, string> = {
    Colombia: "Latin America", Brazil: "Latin America", Guatemala: "Latin America",
    Honduras: "Latin America", Peru: "Latin America", Bolivia: "Latin America",
    Ecuador: "Latin America", "Costa Rica": "Latin America", Mexico: "Latin America",
    Nicaragua: "Latin America", "El Salvador": "Latin America", Panama: "Latin America",
    Venezuela: "Latin America",
    Ethiopia: "East Africa", Kenya: "East Africa", Rwanda: "East Africa",
    Burundi: "East Africa", Tanzania: "East Africa", Uganda: "East Africa",
    "DR Congo": "East Africa", Malawi: "East Africa", Zambia: "East Africa",
    Indonesia: "Asia / Pacific", Vietnam: "Asia / Pacific", India: "Asia / Pacific",
    Philippines: "Asia / Pacific", "Papua New Guinea": "Asia / Pacific", Laos: "Asia / Pacific",
    Yemen: "Middle East",
  };
  const macroMap = new Map<string, RatingBreakdownRow>();
  for (const row of originRatingDist) {
    const macro = COUNTRY_TO_MACRO[row.country] ?? "Other";
    const ex = macroMap.get(macro) ?? { label: macro, total: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, unrated: 0 };
    macroMap.set(macro, {
      label: macro,
      total: ex.total + row.total,
      r1: ex.r1 + row.r1, r2: ex.r2 + row.r2, r3: ex.r3 + row.r3,
      r4: ex.r4 + row.r4, r5: ex.r5 + row.r5, unrated: ex.unrated + row.unrated,
    });
  }
  const macroRows = [...macroMap.values()].sort((a, b) => b.total - a.total);

  const coffeeRows: RatingBreakdownRow[] = shotsPerCoffee;

  // Drinks section data
  const drinkTypeRows = drinkTypeDist;
  const totalDrinks = drinkTypeDist.reduce((a, r) => a + r.total, 0);

  const drinkRatingWindow = Math.max(3, Math.round(drinkRatingTrend.length / 8));
  const avgDrinkRating = drinkRatingTrend.length > 0
    ? drinkRatingTrend.reduce((a, r) => a + r.rating, 0) / drinkRatingTrend.length
    : null;
  const drinkTrendPoints = drinkRatingTrend.map(r => ({
    y: r.rating,
    color: RATING_COLORS[r.rating] ?? "#8E8E93",
  }));

  const tasteLegend = (
    <div className="flex items-center gap-2 flex-wrap">
      {["V.Sour", "Sour", "Sl.Sour", "Balanced", "Sl.Bitter", "Bitter", "V.Bitter"].map((label, i) => (
        <span key={label} className="flex items-center gap-1">
          <svg width="8" height="8" style={{ flexShrink: 0 }}><circle cx="4" cy="4" r="3.5" fill={TASTE_ZONE_COLORS[i]} /></svg>
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="pt-4 pb-24">
      <h1 className="text-[34px] font-display px-4 pt-2 mb-4" style={{ color: "var(--text-primary)" }}>
        Stats
      </h1>
      <div className="px-4">
        <SectionLabel title="Shots" />
        <BarChart bars={ratingBars} title="Shot ratings" subtitle={`${totalRated} rated`}
          stat={avgRating != null ? `★ ${avgRating.toFixed(1)}` : undefined}
          statColor="#FF9500"
        />
        <BarChart bars={tasteBars} title="Taste balance" subtitle={`${totalTaste} logged`} labelFontSize={8}
          stat={avgTasteRaw != null ? tasteLabel(avgTasteRaw) : undefined}
          statColor={avgTasteRaw != null ? tasteBalanceColor(avgTasteRaw) : undefined}
        />
        <BarChart bars={flowBars} title="Flow rate distribution" subtitle={`${totalFlowRated} shots · g/s`} labelFontSize={7}
          stat={avgFlowRate != null ? `${avgFlowRate.toFixed(2)} g/s` : undefined}
        />
        <TrendChart
          points={ratingTrendPoints}
          title="Rating over time"
          subtitle={`${ratingTrend.length} rated`}
          yMin={0.5} yMax={5.5}
          yTicks={[1, 2, 3, 4, 5]}
          yFormat={v => `${v}★`}
          rollingWindow={ratingWindow}
          legend={tasteLegend}
          stat={avgRating != null ? `★ ${avgRating.toFixed(1)}` : undefined}
          statColor="#FF9500"
        />
        {failedStats.total > 0 && (
          <>
            <SectionLabel title="Failed Shots" />
            <HorizontalBarChart
              rows={failedStats.byReason.map(r => ({
                label: ({
                  channeling: "Channeling",
                  choking: "Choking",
                  puck_collapse: "Puck Collapse",
                  grind_error: "Grind Error",
                  equipment_issue: "Equipment Issue",
                  other: "Other",
                } as Record<string, string>)[r.reason] ?? r.reason,
                count: r.count,
              }))}
              title="Failure reasons"
              subtitle={`${failedStats.total} failed · ${((failedStats.total / failedStats.totalShots) * 100).toFixed(0)}% of shots`}
            />
          </>
        )}
        <SectionLabel title="Technique" />
        <ScatterPlot
          points={ratioPoints}
          title="Ratio vs taste"
          subtitle={`${ratioPoints.length} shots`}
          xMin={1.0} xMax={3.0}
          xTicks={[1.5, 2.0, 2.5, 3.0]}
          xFormat={v => `1:${v % 1 === 0 ? v : v.toFixed(1)}`}
        />
        <ScatterPlot
          points={timePoints}
          title="Time vs taste"
          subtitle={`${timePoints.length} shots`}
          xMin={15} xMax={55}
          xTicks={[20, 30, 40, 50]}
          xFormat={v => `${v}s`}
        />
        <TrendChart
          points={retentionPoints}
          title="Grinder retention"
          subtitle={`${retentionValues.length} logged`}
          yMin={retYMin} yMax={retYMax}
          yTicks={retTicks}
          yFormat={v => `${v}g`}
          connectLine
          stat={avgRetention != null ? `${avgRetention.toFixed(2)}g avg` : undefined}
        />
        <SectionLabel title="Beans" />
        {roastTotal > 0 && (
          <BarChart
            bars={roastBars}
            title="Roast level"
            subtitle={`${roastTagged} tagged`}
            footnote={roastUnspecified > 0 ? `${roastUnspecified} shot${roastUnspecified !== 1 ? "s" : ""} (${Math.round(roastUnspecified / roastTotal * 100)}%) have no roast level tagged` : undefined}
          />
        )}
        {processTotal > 0 && (
          <BarChart
            bars={processBars}
            title="Process method"
            subtitle={`${processTagged} tagged`}
            labelFontSize={8}
            footnote={processUnspecified > 0 ? `${processUnspecified} shot${processUnspecified !== 1 ? "s" : ""} (${Math.round(processUnspecified / processTotal * 100)}%) have no process tagged` : undefined}
          />
        )}
        {macroRows.length > 0 && (
          <RatingStackedHorizontalBarChart rows={macroRows} title="Origin by region" subtitle={`${macroRows.length} region${macroRows.length !== 1 ? "s" : ""}`} />
        )}
        {originRows.length > 0 && (
          <RatingStackedHorizontalBarChart rows={originRows} title="Origin" subtitle={`${originRows.length} origin${originRows.length !== 1 ? "s" : ""}`} />
        )}
        {blendDist.length > 0 && (
          <RatingStackedHorizontalBarChart rows={blendDist} title="Single origin vs blend" subtitle={`${blendDist.reduce((a, r) => a + r.total, 0)} shots`} />
        )}
        {coffeeRows.length > 0 && (
          <RatingStackedHorizontalBarChart rows={coffeeRows} title="Shots per coffee" subtitle={`${coffeeRows.length} coffees`} />
        )}
        <ScatterPlot
          points={freshnessPoints}
          title="Roast age vs taste"
          subtitle={`${freshnessPoints.length} shots`}
          xMin={0} xMax={maxFreshnessDay}
          xTicks={freshnessTicks}
          xFormat={v => `${v}d`}
        />
        {(drinkTypeRows.length > 0 || drinkRatingTrend.length > 0 || shotVsDrinkRatings.length > 0) && (
          <SectionLabel title="Drinks" />
        )}
        {drinkTypeRows.length > 0 && (
          <RatingStackedHorizontalBarChart
            rows={drinkTypeRows}
            title="Drink types"
            subtitle={`${totalDrinks} logged`}
          />
        )}
        {drinkRatingTrend.length > 0 && (
          <TrendChart
            points={drinkTrendPoints}
            title="Drink rating over time"
            subtitle={`${drinkRatingTrend.length} rated`}
            yMin={0.5} yMax={5.5}
            yTicks={[1, 2, 3, 4, 5]}
            yFormat={v => `${v}★`}
            rollingWindow={drinkRatingWindow}
            stat={avgDrinkRating != null ? `★ ${avgDrinkRating.toFixed(1)}` : undefined}
            statColor="#FF9500"
          />
        )}
        {shotVsDrinkRatings.length > 0 && (
          <RatingBubbleChart
            data={shotVsDrinkRatings}
            title="Shot vs drink rating"
            subtitle={`${shotVsDrinkRatings.reduce((a, r) => a + r.count, 0)} logged`}
          />
        )}
      </div>
    </div>
  );
}
