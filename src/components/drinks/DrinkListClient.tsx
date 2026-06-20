"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { DrinkRow } from "@/lib/drinks/queries";
import { DRINK_DEFAULTS } from "@/lib/shots/drinkDetection";

const LATTE_ART_LABELS: Record<string, string> = {
  pollock: "Pollock",
  calder: "Calder",
  picasso: "Picasso",
  monet: "Monet",
  van_gogh: "Van Gogh",
};

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
    <div className="flex overflow-hidden rounded-full" style={{ height: 10 }}>
      {segments.map((seg, i) => (
        <div key={i} style={{ width: `${(seg.ml / MAX_DRINK_ML) * 100}%`, backgroundColor: seg.color, flexShrink: 0 }} />
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function StarRating({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <span className="text-[13px]" style={{ color: "var(--accent)" }}>
      {"★".repeat(value)}{"☆".repeat(5 - value)}
    </span>
  );
}

function formatMilkType(raw: string | null) {
  if (!raw) return null;
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Chip({
  label,
  active,
  onClick,
  color,
}: {
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  const accent = color ?? "var(--accent)";
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 px-4 py-2 rounded-full text-[14px] transition-colors active:opacity-70"
      style={{
        backgroundColor: active ? `color-mix(in srgb, ${accent} 15%, transparent)` : "var(--card)",
        color: active ? accent : "var(--text-secondary)",
        fontWeight: active ? 600 : 400,
        boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
      }}
    >
      {label}
    </button>
  );
}

export default function DrinkListClient({ drinks }: { drinks: DrinkRow[] }) {
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [drinkTypeFilter, setDrinkTypeFilter] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [latteArtOnly, setLatteArtOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const drinkTypes = useMemo(() => {
    const seen = new Set<string>();
    const types: string[] = [];
    for (const d of drinks) {
      if (d.detectedDrinkName && !seen.has(d.detectedDrinkName)) {
        seen.add(d.detectedDrinkName);
        types.push(d.detectedDrinkName);
      }
    }
    return types.sort();
  }, [drinks]);

  const hasActiveFilters = !!(searchText || fromDate || toDate || drinkTypeFilter || minRating !== null || latteArtOnly);

  const filtered = useMemo(() => {
    let result = drinks;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (d) =>
          d.bagName.toLowerCase().includes(q) ||
          d.roasterName.toLowerCase().includes(q) ||
          (d.detectedDrinkName?.toLowerCase().includes(q) ?? false)
      );
    }
    if (fromDate) result = result.filter((d) => d.pulledAt.slice(0, 10) >= fromDate);
    if (toDate)   result = result.filter((d) => d.pulledAt.slice(0, 10) <= toDate);
    if (drinkTypeFilter) result = result.filter((d) => d.detectedDrinkName === drinkTypeFilter);
    if (minRating !== null) result = result.filter((d) => d.overallRating !== null && d.overallRating >= minRating);
    if (latteArtOnly) result = result.filter((d) => !!d.latteArtRating);
    return result;
  }, [drinks, searchText, fromDate, toDate, drinkTypeFilter, minRating, latteArtOnly]);

  const clearAll = () => {
    setSearchText("");
    setFromDate("");
    setToDate("");
    setDrinkTypeFilter(null);
    setMinRating(null);
    setLatteArtOnly(false);
  };

  return (
    <div>
      {/* Search bar */}
      <div className="px-4 pb-3">
        <div
          className="flex items-center gap-2 px-4 rounded-full"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search drinks…"
            className="flex-1 py-3 bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
            style={{ color: "var(--text-primary)" }}
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText("")}
              className="text-[13px] px-2 py-1 rounded-full"
              style={{ color: "var(--text-secondary)", backgroundColor: "var(--card-secondary)" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick chips */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Chip
            label="Latte Art"
            active={latteArtOnly}
            onClick={() => setLatteArtOnly((v) => !v)}
            color="#AF52DE"
          />
          <Chip
            label={
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
                </svg>
                Filter{hasActiveFilters ? " ·" : ""}
              </span>
            }
            active={hasActiveFilters}
            onClick={() => setFiltersOpen((v) => !v)}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="shrink-0 px-4 py-2 rounded-full text-[14px] transition-colors active:opacity-70"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--destructive)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Expandable filter panel */}
      {filtersOpen && (
        <div
          className="mx-4 mb-3 rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
        >
          {/* Date range */}
          <div className="px-5 py-3 row-divider">
            <p className="text-[13px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>Date Range</p>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <label className="text-[12px]" style={{ color: "var(--text-secondary)" }}>From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="block w-full mt-0.5 text-[15px] bg-transparent outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <span style={{ color: "var(--text-secondary)" }}>→</span>
              <div className="flex-1">
                <label className="text-[12px]" style={{ color: "var(--text-secondary)" }}>To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="block w-full mt-0.5 text-[15px] bg-transparent outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </div>
          </div>

          {/* Drink type */}
          {drinkTypes.length > 0 && (
            <div className="px-5 py-3 row-divider">
              <p className="text-[13px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>Drink Type</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDrinkTypeFilter(null)}
                  className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors"
                  style={{
                    backgroundColor: drinkTypeFilter === null ? "var(--accent)" + "18" : "var(--card-secondary)",
                    color: drinkTypeFilter === null ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  All
                </button>
                {drinkTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDrinkTypeFilter(drinkTypeFilter === type ? null : type)}
                    className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors"
                    style={{
                      backgroundColor: drinkTypeFilter === type ? "var(--accent)" + "18" : "var(--card-secondary)",
                      color: drinkTypeFilter === type ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Min rating */}
          <div className="px-5 py-3">
            <p className="text-[13px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>Min Rating</p>
            <div className="flex gap-2">
              {([null, 3, 4, 5] as (number | null)[]).map((r) => (
                <button
                  key={r ?? "any"}
                  type="button"
                  onClick={() => setMinRating(r)}
                  className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors"
                  style={{
                    backgroundColor: minRating === r ? "var(--accent)" + "18" : "var(--card-secondary)",
                    color: minRating === r ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {r === null ? "Any" : `${r}+★`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Result count */}
      {hasActiveFilters && (
        <p className="px-4 pb-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          {filtered.length} drink{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-[17px]" style={{ color: "var(--text-secondary)" }}>
            {hasActiveFilters ? "No drinks match your filters" : "No drinks logged yet"}
          </p>
          {!hasActiveFilters && (
            <p className="text-[15px] mt-1" style={{ color: "var(--text-secondary)" }}>
              Enable &quot;Include Drink&quot; when logging a shot
            </p>
          )}
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-2">
          {filtered.map((drink) => {
            const milkDesc = [
              formatMilkType(drink.milkType),
              drink.milkQuantityMl ? `${drink.milkQuantityMl}ml` : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <Link
                key={drink.id}
                href={`/history/${drink.shotId}`}
                className="rounded-2xl overflow-hidden active:opacity-70 transition-opacity block"
                style={{
                  backgroundColor: "var(--card)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                }}
              >
                <div className="px-4 pt-3 pb-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        {drink.roasterName} · {drink.bagName}
                      </p>
                      <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {formatDate(drink.pulledAt)} at {formatTime(drink.pulledAt)}
                      </p>
                    </div>
                    <StarRating value={drink.overallRating} />
                  </div>

                  {/* Details row */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {drink.detectedDrinkName && (
                      <span
                        className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "var(--accent)" + "22",
                          color: "var(--accent)",
                        }}
                      >
                        {drink.detectedDrinkName}
                      </span>
                    )}
                    {drink.latteArtRating && (
                      <span
                        className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#AF52DE22", color: "#AF52DE" }}
                      >
                        {LATTE_ART_LABELS[drink.latteArtRating] ?? drink.latteArtRating}
                      </span>
                    )}
                    {milkDesc && (
                      <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                        {milkDesc}
                      </span>
                    )}
                  </div>

                  {/* Composition bar */}
                  <div className="mt-2.5">
                    {(() => {
                      const defaults = drink.detectedDrinkName
                        ? DRINK_DEFAULTS[drink.detectedDrinkName as keyof typeof DRINK_DEFAULTS]
                        : null;
                      return (
                        <DrinkCompositionBar
                          espressoMl={drink.yieldG ?? 0}
                          milkMl={drink.milkQuantityMl ?? 0}
                          foamMl={drink.foamMl ?? 0}
                          hotWaterMl={drink.hotWaterMl ?? 0}
                          hasChocolate={defaults?.hasChocolate ?? false}
                          hasIceCream={defaults?.hasIceCream ?? false}
                          hasChai={defaults?.hasChai ?? false}
                        />
                      );
                    })()}
                  </div>

                  {drink.notes && (
                    <p className="text-[13px] mt-1.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                      {drink.notes}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
