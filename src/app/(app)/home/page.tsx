export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { getBags } from "@/lib/bags/queries";
import ClientDateTime from "@/components/ClientDateTime";
import { getDaysSinceRoast, getFreshnessLabel, getFreshnessColor, FRESHNESS_CSS } from "@/lib/bags/freshness";
import { getActiveEquipmentProfile } from "@/lib/equipment/queries";
import { getRecentAvgDosePerBag } from "@/lib/shots/queries";
import { getAppConfig } from "@/lib/config/queries";
import { DRINK_DEFAULTS } from "@/lib/shots/drinkDetection";
import NextShotCard from "@/components/home/NextShotCard";
import DrinkSuggestionCard from "@/components/home/DrinkSuggestionCard";

async function getStats() {
  const [row] = await db.all(sql`
    SELECT
      COUNT(*) as total_shots,
      SUM(CASE WHEN is_failed = 1 THEN 1 ELSE 0 END) as failed_shots,
      ROUND(AVG(CASE WHEN is_failed = 0 THEN shot_rating END), 1) as avg_rating,
      ROUND(AVG(CASE WHEN is_failed = 0 THEN taste_balance END), 1) as avg_balance,
      ROUND(AVG(CASE WHEN is_failed = 0 THEN dose_g END), 1) as avg_dose,
      ROUND(AVG(CASE WHEN is_failed = 0 THEN yield_g END), 1) as avg_yield,
      ROUND(AVG(CASE WHEN is_failed = 0 THEN shot_time_seconds END), 0) as avg_time
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
      d.detected_drink_name,
      d.milk_quantity_ml,
      d.foam_ml,
      d.hot_water_ml,
      d.milk_type,
      d.is_iced
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    LEFT JOIN drinks d ON d.shot_id = s.id
    WHERE s.is_failed = 0
    ORDER BY s.pulled_at DESC
    LIMIT 1
  `) as Record<string, string | number | null>[];
  return row ?? null;
}

function MiniFreshnessBar({ days, peakStart, peakEnd }: {
  days: number; peakStart: number; peakEnd: number;
}) {
  const mid = (peakStart + peakEnd) / 2;
  const total = peakEnd + 15;
  const clamp = (d: number) => Math.min(Math.max(d, 0), total);
  const seg = (from: number, to: number) =>
    ((clamp(to) - clamp(from)) / total * 100).toFixed(2) + "%";
  const todayPct = (clamp(days) / total * 100).toFixed(2) + "%";

  return (
    <div style={{ position: "relative", height: 6, borderRadius: 3, overflow: "hidden", display: "flex" }}>
      <div style={{ flexShrink: 0, width: seg(0, peakStart), backgroundColor: "#8E8E93", opacity: 0.35 }} />
      <div style={{ flexShrink: 0, width: seg(peakStart, mid), backgroundColor: "#30D158", opacity: 0.75 }} />
      <div style={{ flexShrink: 0, width: seg(mid, peakEnd), backgroundColor: "#248A3D", opacity: 0.75 }} />
      <div style={{ flexShrink: 0, width: seg(peakEnd, peakEnd + 10), backgroundColor: "#FF9500", opacity: 0.75 }} />
      <div style={{ flexShrink: 0, width: seg(peakEnd + 10, total), backgroundColor: "#FF3B30", opacity: 0.75 }} />
      <div style={{
        position: "absolute", left: todayPct, top: 0, bottom: 0, width: 2,
        backgroundColor: "white", transform: "translateX(-50%)", borderRadius: 1,
        boxShadow: "0 0 3px rgba(0,0,0,0.5)",
      }} />
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
    { ml: espressoMl,   color: "var(--drink-espresso)" },
    { ml: chaiMl,       color: "var(--drink-chai)" },
    { ml: chocolateMl,  color: "#79564d" },
    { ml: hotWaterMl,   color: "#a0cee7" },
    { ml: milkMl,       color: "#f3f2f6" },
    { ml: iceCreamMl,   color: "#d2d3c4" },
    { ml: foamMl,       color: "#fefce6" },
    { ml: empty,        color: "#c9c9ce" },
  ].filter(s => s.ml > 0);
  return (
    <div className="flex overflow-hidden rounded-full" style={{ height: 10 }}>
      {segments.map((seg, i) => (
        <div key={i} style={{ width: `${(seg.ml / MAX_DRINK_ML) * 100}%`, backgroundColor: seg.color, flexShrink: 0 }} />
      ))}
    </div>
  );
}

function tasteLabel(balance: number | null): string {
  if (balance === null) return "—";
  if (balance <= 1.4) return "Very Sour";
  if (balance <= 2.4) return "Sour";
  if (balance <= 3.4) return "Slightly Sour";
  if (balance <= 4.4) return "Balanced";
  if (balance <= 5.4) return "Slightly Bitter";
  if (balance <= 6.4) return "Bitter";
  return "Very Bitter";
}

function tasteColor(balance: number | null): string {
  if (balance === null) return "var(--text-secondary)";
  if (balance <= 1.4) return "#FF3B30";
  if (balance <= 2.4) return "#FF6B35";
  if (balance <= 3.4) return "#FFB347";
  if (balance <= 4.4) return "#34C759";
  if (balance <= 5.4) return "#FF9500";
  if (balance <= 6.4) return "#8B5CF6";
  return "#6D28D9";
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


export default async function HomePage() {
  const [activeBags, equipment, config, stats, lastShot] = await Promise.all([
    getBags("active"), getActiveEquipmentProfile(), getAppConfig(), getStats(), getLastShot(),
  ]);
  const recentAvgDose = await getRecentAvgDosePerBag(activeBags.map((b) => b.id), config.recentShotWindow ?? 10);

  const totalShots = Number(stats?.total_shots ?? 0);
  const failedShots = Number(stats?.failed_shots ?? 0);

  return (
    <div className="pt-6 pb-24 px-4">
      <h1 className="text-[34px] font-display mb-1" style={{ color: "var(--text-primary)" }}>
        Yield
      </h1>
      <p className="text-[15px] mb-6" style={{ color: "var(--text-secondary)" }}>
        {totalShots === 0
          ? "No shots logged yet."
          : failedShots > 0
          ? `${totalShots} shots · ${failedShots} failed`
          : `${totalShots} shot${totalShots !== 1 ? "s" : ""} pulled`}
      </p>

      {(() => {
        if (!equipment) return null;
        const daysSince = (d: string | null) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;
        const machineDays = daysSince(equipment.machineLastCleanedAt);
        const grinderDays = daysSince(equipment.grinderLastCleanedAt);
        const machineInterval = equipment.machineCleaningIntervalDays ?? 30;
        const grinderInterval = equipment.grinderCleaningIntervalDays ?? 14;
        const machineOverdue = machineDays === null || machineDays >= machineInterval;
        const grinderOverdue = grinderDays === null || grinderDays >= grinderInterval;
        if (!machineOverdue && !grinderOverdue) return null;

        const items = [
          machineOverdue && `Machine${machineDays !== null ? ` (${machineDays}d ago)` : ""}`,
          grinderOverdue && `Grinder${grinderDays !== null ? ` (${grinderDays}d ago)` : ""}`,
        ].filter(Boolean).join(" · ");

        return (
          <Link
            href="/more/equipment"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4 active:opacity-70 transition-opacity"
            style={{ backgroundColor: "var(--destructive)", opacity: 1 }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2L2 17h16L10 2z" />
              <path d="M10 8v4" />
              <circle cx="10" cy="14.5" r="0.5" fill="white" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white">Cleaning overdue</p>
              <p className="text-[12px] text-white opacity-80">{items}</p>
            </div>
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <path d="M1 1l6 5.5L1 12" />
            </svg>
          </Link>
        );
      })()}

      {/* ── Almost empty warnings ─────────────────────────────────────────── */}
      {(() => {
        const warningCups = config.lowInventoryWarningCups ?? 14;
        const cupsForBag = (bag: typeof activeBags[number]) => {
          if (bag.weightG == null) return null;
          const remaining = bag.weightG - (bag.totalDoseG ?? 0) + (bag.weightCorrectionG ?? 0);
          if (remaining <= 0) return 0;
          const avgDose =
            recentAvgDose[bag.id] ??
            (bag.shotCount != null && bag.shotCount > 0 && bag.totalDoseG != null
              ? bag.totalDoseG / bag.shotCount
              : 18);
          return Math.floor(remaining / avgDose);
        };
        const lowBags = activeBags.filter((bag) => {
          const cups = cupsForBag(bag);
          return cups !== null && cups < warningCups;
        });
        if (lowBags.length === 0) return null;
        const href = lowBags.length === 1 ? `/bags/${lowBags[0].id}` : "/bags";
        const names = lowBags.map((b) => {
          const cups = cupsForBag(b);
          const suffix = cups != null ? ` · ~${cups} cup${cups !== 1 ? "s" : ""} left` : "";
          return `${b.roaster} — ${b.name}${suffix}`;
        }).join(" · ");
        return (
          <Link
            href={href}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4 active:opacity-70 transition-opacity"
            style={{ backgroundColor: "#FF9500" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="12" height="15" rx="2" />
              <path d="M7 7h6M7 11h4" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white">
                {lowBags.length === 1 ? "Almost empty" : `${lowBags.length} bags almost empty`}
              </p>
              <p className="text-[12px] text-white opacity-80 truncate">{names}</p>
            </div>
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <path d="M1 1l6 5.5L1 12" />
            </svg>
          </Link>
        );
      })()}

      {/* ── Entering peak notifications ───────────────────────────────────── */}
      {(() => {
        const peakBags = activeBags.filter((bag) => {
          const days = getDaysSinceRoast(bag.roastDate);
          const peakStart = bag.peakStartDay ?? 7;
          return days === peakStart;
        });
        if (peakBags.length === 0) return null;
        const href = peakBags.length === 1 ? `/bags/${peakBags[0].id}` : "/bags";
        const names = peakBags.map((b) => `${b.roaster} — ${b.name}`).join(" · ");
        return (
          <Link
            href={href}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4 active:opacity-70 transition-opacity"
            style={{ backgroundColor: "#34C759" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.5L10 14.5l-4.9 2.7.9-5.5L2 7.8l5.6-.8L10 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white">
                {peakBags.length === 1 ? "Entering peak today" : `${peakBags.length} bags entering peak today`}
              </p>
              <p className="text-[12px] text-white opacity-80 truncate">{names}</p>
            </div>
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
              <path d="M1 1l6 5.5L1 12" />
            </svg>
          </Link>
        );
      })()}

      {/* ── Next shot & drink recommendations ────────────────────────────── */}
      {activeBags.length > 0 && (
        <>
          <NextShotCard bags={activeBags.map((b) => ({
            id: b.id,
            roaster: b.roaster,
            name: b.name,
            roastDate: b.roastDate,
            peakStartDay: b.peakStartDay ?? null,
            peakEndDay: b.peakEndDay ?? null,
            isDecaf: b.isDecaf,
          }))} />
          <DrinkSuggestionCard />
        </>
      )}

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
                    className="text-[18px] font-semibold text-center"
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
                  <ClientDateTime iso={String(lastShot.pulled_at)} dateOnly />
                </p>
              </div>
              <div className="px-4 pb-3">
                <p className="text-[17px] font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
                  {lastShot.roaster} — {lastShot.bag_name}
                </p>
                {lastShot.detected_drink_name && (() => {
                  const drinkName = String(lastShot.detected_drink_name);
                  const defaults = DRINK_DEFAULTS[drinkName as keyof typeof DRINK_DEFAULTS];
                  return (
                    <div className="mb-2">
                      <p className="text-[13px] mb-1.5" style={{ color: "var(--accent)" }}>{drinkName}</p>
                      <DrinkCompositionBar
                        espressoMl={Number(lastShot.yield_g) || 0}
                        milkMl={Number(lastShot.milk_quantity_ml) || 0}
                        foamMl={Number(lastShot.foam_ml) || 0}
                        hotWaterMl={Number(lastShot.hot_water_ml) || 0}
                        hasChocolate={defaults?.hasChocolate ?? false}
                        hasIceCream={defaults?.hasIceCream ?? false}
                        hasChai={defaults?.hasChai ?? false}
                      />
                    </div>
                  );
                })()}
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

      {/* Active beans freshness */}
      {activeBags.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden mb-4"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
        >
          <div className="px-4 pt-3 pb-1">
            <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Active beans
            </p>
          </div>
          {activeBags.map((bag, i) => {
            const days = getDaysSinceRoast(bag.roastDate);
            const peakStart = bag.peakStartDay ?? 7;
            const peakEnd = bag.peakEndDay ?? 35;
            const label = getFreshnessLabel(days, peakStart, peakEnd);
            const color = getFreshnessColor(days, peakStart, peakEnd);
            return (
              <Link
                key={bag.id}
                href={`/bags/${bag.id}`}
                className="block px-4 pt-3 pb-3 active:opacity-70 transition-opacity"
                style={{ borderTop: i > 0 ? "1px solid var(--divider)" : undefined }}
              >
                <p className="text-[15px] font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                  {bag.roaster} — {bag.name}
                </p>
                <MiniFreshnessBar days={days} peakStart={peakStart} peakEnd={peakEnd} />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[12px]" style={{ color: FRESHNESS_CSS[color] }}>{label}</span>
                  {days >= 0 && (
                    <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{days}d</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {bag.avgShotRating != null && (
                    <span className="text-[12px] font-medium" style={{ color: "#FF9500" }}>
                      ★ {bag.avgShotRating.toFixed(1)}
                    </span>
                  )}
                  <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    {bag.shotCount ?? 0} {(bag.shotCount ?? 0) === 1 ? "shot" : "shots"}
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    Bag {bag.bagIndex ?? 1}
                  </span>
                  {bag.weightG != null && (() => {
                    const remaining = Math.round(bag.weightG - (bag.totalDoseG ?? 0) + (bag.weightCorrectionG ?? 0));
                    if (remaining <= 0) return null;
                    return (
                      <span className="text-[12px]" style={{ color: remaining < 100 ? "#FF9500" : "var(--text-secondary)" }}>
                        ~{remaining}g left
                      </span>
                    );
                  })()}
                </div>
              </Link>
            );
          })}
        </div>
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
