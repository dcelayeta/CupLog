"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { DrinkRow } from "@/lib/drinks/queries";
import { DRINK_DEFAULTS } from "@/lib/shots/drinkDetection";

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
    { ml: espressoMl, color: "#271812" },
    { ml: chaiMl,     color: "#462c21" },
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

export default function DrinkListClient({
  drinks,
}: {
  drinks: DrinkRow[];
}) {
  const [minRating, setMinRating] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let result = drinks;
    if (minRating !== null) {
      result = result.filter((d) => d.overallRating !== null && d.overallRating >= minRating);
    }
    return result;
  }, [drinks, minRating]);

  const hasFilters = minRating !== null;

  return (
    <div>
      {/* Rating filter */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 items-center">
          <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Min rating:</span>
          {[null, 3, 4, 5].map((r) => (
            <button
              key={r ?? "any"}
              type="button"
              onClick={() => setMinRating(r)}
              className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: minRating === r ? "var(--accent)" + "18" : "var(--card)",
                color: minRating === r ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: minRating === r ? 600 : 400,
                boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
              }}
            >
              {r === null ? "Any" : `${r}+★`}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      {hasFilters && (
        <p className="px-4 pb-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          {filtered.length} drink{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-[17px]" style={{ color: "var(--text-secondary)" }}>
            {hasFilters ? "No drinks match your filters" : "No drinks logged yet"}
          </p>
          {!hasFilters && (
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
