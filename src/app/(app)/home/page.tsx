import Link from "next/link";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function getStats() {
  const [row] = await db.all(sql`
    SELECT
      COUNT(*) as total_shots,
      ROUND(AVG(shot_rating), 1) as avg_rating,
      ROUND(AVG(taste_balance), 1) as avg_balance,
      ROUND(AVG(dose_g), 1) as avg_dose,
      ROUND(AVG(yield_g), 1) as avg_yield,
      ROUND(AVG(shot_time_seconds), 0) as avg_time
    FROM shots
  `) as Record<string, number | null>[];
  return row ?? null;
}

async function getLastShot() {
  const [row] = await db.all(sql`
    SELECT
      s.id,
      s.pulled_at,
      s.dose_g,
      s.yield_g,
      s.shot_time_seconds,
      s.shot_rating,
      s.taste_balance,
      s.notes,
      b.roaster,
      b.name as bag_name,
      d.detected_drink_name
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    LEFT JOIN drinks d ON d.shot_id = s.id
    ORDER BY s.pulled_at DESC
    LIMIT 1
  `) as Record<string, string | number | null>[];
  return row ?? null;
}

function tasteLabel(balance: number | null): string {
  if (balance === null) return "—";
  if (balance <= 1.4) return "Very Sour";
  if (balance <= 2.4) return "Sour";
  if (balance <= 3.4) return "Balanced";
  if (balance <= 4.4) return "Bitter";
  return "Very Bitter";
}

function tasteColor(balance: number | null): string {
  if (balance === null) return "var(--text-secondary)";
  if (balance <= 1.8) return "#FF3B30";
  if (balance <= 2.4) return "#FF9500";
  if (balance <= 3.6) return "#34C759";
  if (balance <= 4.2) return "#FF9500";
  return "#FF3B30";
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ color: "var(--text-secondary)" }}>—</span>;
  return (
    <span style={{ color: "var(--accent)" }}>
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

function formatTime(secs: number | null): string {
  if (secs === null) return "—";
  return `${secs}s`;
}

function formatDate(pulledAt: string | null): string {
  if (!pulledAt) return "";
  const d = new Date(pulledAt);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default async function HomePage() {
  const [stats, lastShot] = await Promise.all([getStats(), getLastShot()]);

  const totalShots = Number(stats?.total_shots ?? 0);

  return (
    <div className="pt-6 pb-24 px-4">
      <h1 className="text-[34px] font-display mb-1" style={{ color: "var(--text-primary)" }}>
        CupLog
      </h1>
      <p className="text-[15px] mb-6" style={{ color: "var(--text-secondary)" }}>
        {totalShots === 0
          ? "No shots logged yet."
          : `${totalShots} shot${totalShots !== 1 ? "s" : ""} pulled`}
      </p>

      {totalShots > 0 && (
        <>
          {/* Stats grid */}
          <div
            className="rounded-2xl overflow-hidden mb-4"
            style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
          >
            <div className="px-4 pt-3 pb-1">
              <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                All-time averages
              </p>
            </div>
            <div
              className="row-divider-t grid grid-cols-3"
            >
              {[
                { label: "Rating", value: stats?.avg_rating ? `${stats.avg_rating}★` : "—" },
                {
                  label: "Balance",
                  value: stats?.avg_balance ? tasteLabel(Number(stats.avg_balance)) : "—",
                  color: tasteColor(stats?.avg_balance ? Number(stats.avg_balance) : null),
                },
                { label: "Dose", value: stats?.avg_dose ? `${stats.avg_dose}g` : "—" },
                { label: "Yield", value: stats?.avg_yield ? `${stats.avg_yield}g` : "—" },
                { label: "Time", value: formatTime(stats?.avg_time ? Number(stats.avg_time) : null) },
                {
                  label: "Ratio",
                  value:
                    stats?.avg_dose && stats?.avg_yield
                      ? `1:${(Number(stats.avg_yield) / Number(stats.avg_dose)).toFixed(1)}`
                      : "—",
                },
              ].map(({ label, value, color }, i) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center py-3 px-2"
                  style={{
                    borderRight: (i + 1) % 3 !== 0 ? "1px solid var(--divider)" : undefined,
                    borderBottom: i < 3 ? "1px solid var(--divider)" : undefined,
                  }}
                >
                  <span
                    className="text-[18px] font-semibold"
                    style={{ color: color ?? "var(--text-primary)" }}
                  >
                    {value}
                  </span>
                  <span className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Last shot card */}
          {lastShot && (
            <Link
              href={`/history/${lastShot.id}`}
              className="block rounded-2xl overflow-hidden active:opacity-70 transition-opacity mb-4"
              style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
            >
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <p
                  className="text-[13px] font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Last shot
                </p>
                <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  {formatDate(String(lastShot.pulled_at))}
                </p>
              </div>
              <div className="px-4 pb-3">
                <p className="text-[17px] font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
                  {lastShot.roaster} — {lastShot.bag_name}
                </p>
                {lastShot.detected_drink_name && (
                  <p className="text-[13px] mb-1" style={{ color: "var(--accent)" }}>
                    {String(lastShot.detected_drink_name)}
                  </p>
                )}
                <div className="flex items-center gap-3 flex-wrap mt-1">
                  <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    {lastShot.dose_g}g{lastShot.yield_g != null ? ` → ${lastShot.yield_g}g` : ""}
                  </span>
                  <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    {formatTime(Number(lastShot.shot_time_seconds))}
                  </span>
                  {lastShot.shot_rating && <StarRating rating={Number(lastShot.shot_rating)} />}
                  {lastShot.taste_balance && (
                    <span
                      className="text-[13px]"
                      style={{ color: tasteColor(Number(lastShot.taste_balance)) }}
                    >
                      {tasteLabel(Number(lastShot.taste_balance))}
                    </span>
                  )}
                </div>
                {lastShot.notes && (
                  <p
                    className="text-[13px] mt-1 line-clamp-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {String(lastShot.notes)}
                  </p>
                )}
              </div>
              <div
                className="row-divider-t px-4 py-2 flex items-center justify-end"
              >
                <span className="text-[13px]" style={{ color: "var(--accent)" }}>
                  View details →
                </span>
              </div>
            </Link>
          )}
        </>
      )}

      {/* CTA */}
      <Link
        href="/log"
        className="block w-full py-3.5 rounded-full text-center text-[17px] font-semibold"
        style={{ backgroundColor: "var(--card)", color: "var(--accent)", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
      >
        Log a shot
      </Link>
    </div>
  );
}
