"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition, useState, useMemo } from "react";
import Link from "next/link";
import type { ShotRow, BagOption } from "@/lib/shots/queries";
import ClassificationBadge from "./ClassificationBadge";
import { getFreshnessLabel, getFreshnessColor, FRESHNESS_CSS } from "@/lib/bags/freshness";

function getTimeBucket(pulledAt: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shot = new Date(pulledAt);
  const shotDay = new Date(shot.getFullYear(), shot.getMonth(), shot.getDate());
  const diffDays = Math.round((today.getTime() - shotDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays <= 6) return "This Week";
  if (diffDays <= 29) return "This Month";
  return "Older";
}

function BucketDivider({ label }: { label: string }) {
  return (
    <div className="pt-3 pb-1 first:pt-0">
      <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
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

const TIME_LABELS = ["Very Fast", "Fast", "Normal", "Slow", "Very Slow"];
const RATIO_LABELS = ["Ristretto", "Short", "Normal", "Long", "Lungo"];

export default function HistoryListClient({
  shots,
  bags,
  selectedBagId,
}: {
  shots: ShotRow[];
  bags: BagOption[];
  selectedBagId?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [timeClass, setTimeClass] = useState<string | null>(null);
  const [ratioClass, setRatioClass] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasActiveFilters = searchText || fromDate || toDate || timeClass || ratioClass;

  const updateBagFilter = useCallback(
    (bagId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (bagId) {
        params.set("bagId", bagId);
      } else {
        params.delete("bagId");
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const filtered = useMemo(() => {
    let result = shots;

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (s) =>
          s.roasterName.toLowerCase().includes(q) ||
          s.bagName.toLowerCase().includes(q) ||
          (s.notes ?? "").toLowerCase().includes(q) ||
          (s.drink?.detectedDrinkName ?? "").toLowerCase().includes(q)
      );
    }

    if (fromDate) {
      result = result.filter((s) => s.pulledAt.slice(0, 10) >= fromDate);
    }

    if (toDate) {
      result = result.filter((s) => s.pulledAt.slice(0, 10) <= toDate);
    }

    if (timeClass) {
      result = result.filter((s) => s.timeClassification.label === timeClass);
    }

    if (ratioClass) {
      result = result.filter((s) => s.ratioClassification.label === ratioClass);
    }

    return result;
  }, [shots, searchText, fromDate, toDate, timeClass, ratioClass]);

  type GroupedItem = { type: "divider"; label: string } | { type: "shot"; shot: ShotRow };
  const groupedItems = useMemo<GroupedItem[]>(() => {
    const items: GroupedItem[] = [];
    let lastBucket: string | null = null;
    for (const shot of filtered) {
      const bucket = getTimeBucket(shot.pulledAt);
      if (bucket !== lastBucket) {
        items.push({ type: "divider", label: bucket });
        lastBucket = bucket;
      }
      items.push({ type: "shot", shot });
    }
    return items;
  }, [filtered]);

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
            placeholder="Search shots…"
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

      {/* Bag filter chips + Filters button */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {bags.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => updateBagFilter("")}
                className="shrink-0 px-4 py-2 rounded-full text-[14px] font-medium transition-colors"
                style={{
                  backgroundColor: !selectedBagId ? "var(--accent)" + "18" : "var(--card)",
                  color: !selectedBagId ? "var(--accent)" : "var(--text-secondary)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                  fontWeight: !selectedBagId ? 600 : 400,
                }}
              >
                All
              </button>
              {bags.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => updateBagFilter(b.id.toString())}
                  className="shrink-0 px-4 py-2 rounded-full text-[14px] transition-colors"
                  style={{
                    backgroundColor: selectedBagId === b.id ? "var(--accent)" + "18" : "var(--card)",
                    color: selectedBagId === b.id ? "var(--accent)" : "var(--text-secondary)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                    fontWeight: selectedBagId === b.id ? 600 : 400,
                  }}
                >
                  {b.roaster} · {b.name}
                </button>
              ))}
            </>
          )}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] transition-colors"
            style={{
              backgroundColor: hasActiveFilters ? "var(--accent)" + "18" : "var(--card)",
              color: hasActiveFilters ? "var(--accent)" : "var(--text-secondary)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
              fontWeight: hasActiveFilters ? 600 : 400,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filter{hasActiveFilters ? " ·" : ""}
          </button>
        </div>
      </div>

      {/* Expandable filter panel */}
      {filtersOpen && (
        <div
          className="mx-4 mb-3 rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
        >
          {/* Date range */}
          <div className="px-6 py-3 row-divider">
            <p className="text-[13px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>Date Range</p>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <label className="text-[12px]" style={{ color: "var(--text-secondary)" }}>From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="block w-full mt-0.5 bg-transparent outline-none text-[15px]"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <div className="w-px h-8" style={{ backgroundColor: "var(--divider)" }} />
              <div className="flex-1">
                <label className="text-[12px]" style={{ color: "var(--text-secondary)" }}>To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="block w-full mt-0.5 bg-transparent outline-none text-[15px]"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => { setFromDate(""); setToDate(""); }}
                  className="text-[13px] px-2 py-1 rounded-full shrink-0"
                  style={{ color: "var(--text-secondary)", backgroundColor: "var(--card-secondary)" }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Time classification chips */}
          <div className="px-6 py-3 row-divider">
            <p className="text-[13px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>Time</p>
            <div className="flex gap-2 flex-wrap">
              {TIME_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTimeClass((v) => (v === label ? null : label))}
                  className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors"
                  style={{
                    backgroundColor: timeClass === label ? "var(--accent)" + "18" : "var(--card-secondary)",
                    color: timeClass === label ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: timeClass === label ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Ratio classification chips */}
          <div className="px-4 py-3">
            <p className="text-[13px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>Ratio</p>
            <div className="flex gap-2 flex-wrap">
              {RATIO_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setRatioClass((v) => (v === label ? null : label))}
                  className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors"
                  style={{
                    backgroundColor: ratioClass === label ? "var(--accent)" + "18" : "var(--card-secondary)",
                    color: ratioClass === label ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: ratioClass === label ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear all */}
          {hasActiveFilters && (
            <div className="px-6 py-3 row-divider-t">
              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  setFromDate("");
                  setToDate("");
                  setTimeClass(null);
                  setRatioClass(null);
                }}
                className="text-[15px] font-medium"
                style={{ color: "var(--destructive)" }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Result count when filtering */}
      {hasActiveFilters && (
        <p className="px-4 pb-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          {filtered.length} shot{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-[17px]" style={{ color: "var(--text-secondary)" }}>
            {hasActiveFilters ? "No shots match your filters" : "No shots logged yet"}
          </p>
          {!hasActiveFilters && (
            <p className="text-[15px] mt-1" style={{ color: "var(--text-secondary)" }}>Head to Log to pull your first shot</p>
          )}
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-2">
          {groupedItems.map((item) => {
            if (item.type === "divider") return <BucketDivider key={`div-${item.label}`} label={item.label} />;
            const shot = item.shot;
            const brewRatio = shot.yieldG != null ? shot.yieldG / shot.doseG : null;
            const _s = new Date(shot.pulledAt);
            const shotDate = new Date(_s.getFullYear(), _s.getMonth(), _s.getDate());
            const [ry, rm, rd] = shot.bagRoastDate.split("-").map(Number);
            const roastDate = new Date(ry, rm - 1, rd);
            const days = Math.floor((shotDate.getTime() - roastDate.getTime()) / (1000 * 60 * 60 * 24));
            const peakStart = shot.bagPeakStartDay ?? 7;
            const peakEnd = shot.bagPeakEndDay ?? 35;
            const freshnessColor = FRESHNESS_CSS[getFreshnessColor(days, peakStart, peakEnd)];
            const freshnessLabel = getFreshnessLabel(days, peakStart, peakEnd);
            return (
              <Link
                key={shot.id}
                href={`/history/${shot.id}`}
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
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold" style={{ color: shot.isFailed ? "#FF3B30" : "var(--text-primary)" }}>
                          {shot.bagStatus === "removed" ? "[Archived] " : ""}{shot.roasterName} · {shot.bagName}
                        </p>
                        {shot.isFailed && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FF3B3022", color: "#FF3B30" }}>
                            Failed
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {formatDate(shot.pulledAt)} at {formatTime(shot.pulledAt)}
                      </p>
                    </div>
                    {!shot.isFailed && shot.shotRating != null && (
                      <StarRating value={shot.shotRating} />
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                      {shot.doseG}g → {shot.yieldG != null ? `${shot.yieldG}g` : "—"}
                    </span>
                    {brewRatio != null && (
                      <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                        1:{brewRatio.toFixed(2)}
                      </span>
                    )}
                    {shot.shotTimeSeconds != null && (
                      <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                        {shot.shotTimeSeconds}s
                      </span>
                    )}
                    {shot.yieldG != null && shot.shotTimeSeconds != null && shot.shotTimeSeconds > 0 && (
                      <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                        {(shot.yieldG / shot.shotTimeSeconds).toFixed(2)} g/s
                      </span>
                    )}
                    {shot.grindSetting && (
                      <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                        Grind {shot.grindSetting}
                      </span>
                    )}
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <ClassificationBadge classification={shot.timeClassification} size="sm" />
                    <ClassificationBadge classification={shot.ratioClassification} size="sm" />
                    {shot.drink?.detectedDrinkName && (
                      <span
                        className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "var(--accent)" + "22",
                          color: "var(--accent)",
                        }}
                      >
                        {shot.drink.detectedDrinkName}
                      </span>
                    )}
                    {shot.isLocked && (
                      <span
                        className="text-[12px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ backgroundColor: "#AF52DE22", color: "#AF52DE" }}
                      >
                        <svg width="9" height="11" viewBox="0 0 9 11" fill="currentColor">
                          <rect x="1" y="4.5" width="7" height="6" rx="1" />
                          <path d="M2.5 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                        </svg>
                        Locked
                      </span>
                    )}
                    {shot.hasAnalysis && (
                      <span
                        className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "#AF52DE22",
                          color: "#AF52DE",
                        }}
                      >
                        AI
                      </span>
                    )}
                    <span
                      className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: freshnessColor + "22",
                        color: freshnessColor,
                      }}
                    >
                      Day {days} · {freshnessLabel}
                    </span>
                  </div>

                  {/* Notes snippet */}
                  {shot.notes && searchText && shot.notes.toLowerCase().includes(searchText.toLowerCase()) && (
                    <p className="text-[12px] mt-1.5 line-clamp-1" style={{ color: "var(--text-secondary)" }}>
                      {shot.notes}
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
