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

export default function NextShotCard({ bags }: { bags: BagSummary[] }) {
  const [rec, setRec] = useState<{ bag: BagSummary; cafNote: string } | null>(null);

  useEffect(() => {
    if (bags.length === 0) return;

    const hour = new Date().getHours();
    const preferDecaf = hour >= 14;

    const scored = bags
      .map((bag) => {
        const days = getDaysSinceRoast(bag.roastDate);
        const peakStart = bag.peakStartDay ?? 7;
        const peakEnd = bag.peakEndDay ?? 35;
        return { bag, days, peakStart, peakEnd, priority: freshnessPriority(days, peakStart, peakEnd) };
      })
      .filter((b) => b.priority >= 0)
      .sort((a, b) => b.priority - a.priority);

    if (scored.length === 0) return;

    const decaf = scored.filter((b) => b.bag.isDecaf);
    const caf = scored.filter((b) => !b.bag.isDecaf);

    let pick: typeof scored[number] | undefined;
    let cafNote: string;

    if (preferDecaf && decaf.length > 0) {
      pick = decaf[0];
      cafNote = "Afternoon — lighter on caffeine";
    } else if (!preferDecaf && caf.length > 0) {
      pick = caf[0];
      cafNote = hour < 12 ? "Morning — full caffeine" : "Lunchtime shot";
    } else {
      pick = scored[0];
      cafNote = preferDecaf ? "No decaf available" : "";
    }

    if (pick) setRec({ bag: pick.bag, cafNote });
  }, [bags]);

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
        <p className="text-[17px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          {rec.bag.roaster} — {rec.bag.name}
          {rec.bag.isDecaf && (
            <span className="ml-1.5 text-[12px] font-medium px-1.5 py-0.5 rounded-full align-middle" style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }}>
              Decaf
            </span>
          )}
        </p>
        <MiniFreshnessBar days={days} peakStart={peakStart} peakEnd={peakEnd} />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[12px]" style={{ color: FRESHNESS_CSS[color] }}>{label}</span>
          {days >= 0 && (
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{days}d since roast</span>
          )}
        </div>
      </div>
    </Link>
  );
}
