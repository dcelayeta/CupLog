"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDaysSinceRoast, getFreshnessLabel, getFreshnessColor, FRESHNESS_CSS } from "@/lib/bags/freshness";

type BagSummary = {
  id: number;
  roaster: string;
  name: string;
  roastDate: string;
  peakStartDay: number | null;
  peakEndDay: number | null;
  isDecaf: boolean;
};

function freshnessPriority(days: number, peakStart: number, peakEnd: number): number {
  if (days >= peakStart && days <= peakEnd) return 3;
  if (days < peakStart && days >= peakStart - 5) return 2;
  if (days < peakStart) return 1;
  if (days <= peakEnd + 10) return 0;
  return -1; // stale — exclude
}

function MiniFreshnessBar({ days, peakStart, peakEnd }: { days: number; peakStart: number; peakEnd: number }) {
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

export default function NextShotCard({
  bags,
  recommendations = {},
  todayShots = [],
}: {
  bags: BagSummary[];
  recommendations?: Record<number, { action: string; verdict: string; shotId: number }>;
  todayShots?: { pulledAt: string; isDecaf: boolean }[];
}) {
  const [rec, setRec] = useState<{ bag: BagSummary; cafNote: string } | null>(null);

  useEffect(() => {
    if (bags.length === 0) { setRec(null); return; }

    const now = new Date();
    const hour = now.getHours();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const pulledCafToday = todayShots.some((s) => !s.isDecaf && new Date(s.pulledAt) >= todayStart);
    const pulledDecafToday = todayShots.some((s) => s.isDecaf && new Date(s.pulledAt) >= todayStart);

    if (pulledDecafToday) { setRec(null); return; }
    if (pulledCafToday && hour < 14) { setRec(null); return; }
    if (hour >= 19) { setRec(null); return; }

    const scored = bags
      .map((bag) => {
        const days = getDaysSinceRoast(bag.roastDate);
        const peakStart = bag.peakStartDay ?? 7;
        const peakEnd = bag.peakEndDay ?? 35;
        return { bag, days, peakStart, peakEnd, priority: freshnessPriority(days, peakStart, peakEnd) };
      })
      .filter((b) => b.priority >= 0)
      .sort((a, b) => b.priority - a.priority);

    if (scored.length === 0) { setRec(null); return; }

    const decaf = scored.filter((b) => b.bag.isDecaf);
    const caf = scored.filter((b) => !b.bag.isDecaf);

    let pick: typeof scored[number] | undefined;
    let cafNote: string;

    if (pulledCafToday) {
      // After 2pm and already had caffeine — decaf only, no fallback
      if (decaf.length === 0) { setRec(null); return; }
      pick = decaf[0];
      cafNote = "Afternoon — lighter on caffeine";
    } else if (hour >= 14) {
      // Afternoon preference for decaf, fall back to caf if none
      if (decaf.length > 0) {
        pick = decaf[0];
        cafNote = "Afternoon — lighter on caffeine";
      } else {
        pick = caf[0];
        cafNote = "No decaf available";
      }
    } else {
      // Morning/noon, prefer caf, fall back to decaf
      if (caf.length > 0) {
        pick = caf[0];
        cafNote = hour < 12 ? "Morning — full caffeine" : "Lunchtime shot";
      } else {
        pick = decaf[0] ?? scored[0];
        cafNote = "";
      }
    }

    if (pick) setRec({ bag: pick.bag, cafNote });
  }, [bags, todayShots]);

  if (!rec) return null;

  const days = getDaysSinceRoast(rec.bag.roastDate);
  const peakStart = rec.bag.peakStartDay ?? 7;
  const peakEnd = rec.bag.peakEndDay ?? 35;
  const label = getFreshnessLabel(days, peakStart, peakEnd);
  const color = getFreshnessColor(days, peakStart, peakEnd);

  return (
    <Link
      href={`/bags/${rec.bag.id}`}
      className="block rounded-2xl overflow-hidden active:opacity-70 transition-opacity mb-4"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
    >
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Recommended next shot
        </p>
        {rec.cafNote && (
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            {rec.cafNote}
          </p>
        )}
      </div>
      <div className="row-divider-t px-4 pt-3 pb-3">
        <div className="flex items-start gap-2 mb-2">
          <p className="text-[17px] font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
            {rec.bag.roaster} — {rec.bag.name}
          </p>
          {rec.bag.isDecaf && (
            <span className="shrink-0 text-[12px] font-medium px-3 py-0.5 rounded-full mt-0.5" style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }}>
              Decaf
            </span>
          )}
        </div>
        <MiniFreshnessBar days={days} peakStart={peakStart} peakEnd={peakEnd} />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[12px]" style={{ color: FRESHNESS_CSS[color] }}>{label}</span>
          {days >= 0 && (
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{days}d since roast</span>
          )}
        </div>
        {recommendations[rec.bag.id] && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--divider)" }}>
            <div className="flex items-start gap-2 mb-1.5">
              <span
                className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full"
                style={{ backgroundColor: "#AF52DE22", color: "#AF52DE", lineHeight: 1 }}
              >
                AI
              </span>
              <p className="text-[13px] leading-snug" style={{ color: "var(--text-secondary)" }}>
                {recommendations[rec.bag.id].action}
              </p>
            </div>
            <Link
              href={`/history/${recommendations[rec.bag.id].shotId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[13px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              View shot details →
            </Link>
          </div>
        )}
      </div>
    </Link>
  );
}
