"use client";

import { useState } from "react";
import LogFormClient from "./LogFormClient";
import type { BagOption, LastShotDefaults } from "@/lib/shots/queries";
import type { EquipmentProfile, ExtractionThreshold } from "@/db/schema";

type Props = {
  bags: BagOption[];
  equipmentProfile: EquipmentProfile | null;
  averageRetention: number | null;
  lastShot: LastShotDefaults | null;
  bagDefaults: Record<number, LastShotDefaults>;
  thresholds: ExtractionThreshold[];
};

function formatLastShot(pulledAt: string): string {
  const shot = new Date(pulledAt);
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const time = shot.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (shot.toDateString() === todayStr) return `Today ${time}`;
  if (shot.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;

  return shot.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${time}`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-[12px]">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export default function LogFlowClient(props: Props) {
  const { bags, lastShot, bagDefaults } = props;

  const lastBagId = lastShot ? (bags.find((b) => b.id === lastShot.bagId)?.id ?? null) : null;

  const [selectedBagId, setSelectedBagId] = useState<number | null>(
    bags.length === 1 ? bags[0].id : null
  );

  if (selectedBagId !== null) {
    return <LogFormClient {...props} preselectedBagId={selectedBagId.toString()} />;
  }

  // Time-of-day hint: before 14:00 → prefer caf, 14:00+ → prefer decaf
  const hour = new Date().getHours();
  const preferDecaf = hour >= 14;

  // Sort: time-of-day match first, last-used as tiebreaker within each tier
  const sorted = [...bags].sort((a, b) => {
    const aMatch = preferDecaf ? a.isDecaf : !a.isDecaf;
    const bMatch = preferDecaf ? b.isDecaf : !b.isDecaf;
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    if (a.id === lastBagId) return -1;
    if (b.id === lastBagId) return 1;
    return 0;
  });

  const hintLabel = preferDecaf ? "Good for this afternoon" : "Good for this morning";

  return (
    <>
      <div className="px-4 pt-1 pb-3">
        <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
          Which bean are you using?
        </p>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {sorted.map((bag) => {
          const isLastUsed = bag.id === lastBagId;
          const bagDefault = bagDefaults[bag.id];
          const matchesTimeHint = preferDecaf ? bag.isDecaf : !bag.isDecaf;

          return (
            <button
              key={bag.id}
              type="button"
              onClick={() => setSelectedBagId(bag.id)}
              className="rounded-2xl text-left px-4 py-4 flex flex-col"
              style={{
                backgroundColor: isLastUsed ? "var(--accent)" : "var(--card)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                minHeight: 130,
              }}
            >
              {/* Badges row */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {isLastUsed && (
                  <span className="text-[11px] font-semibold text-white bg-white/20 rounded-full px-2 py-0.5">
                    Last used
                  </span>
                )}
                {bag.isDecaf && (
                  <span
                    className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor: isLastUsed ? "rgba(255,255,255,0.2)" : "var(--card-secondary)",
                      color: isLastUsed ? "white" : "var(--text-secondary)",
                    }}
                  >
                    Decaf
                  </span>
                )}
                {matchesTimeHint && !isLastUsed && (
                  <span
                    className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                    style={{ backgroundColor: "var(--card-secondary)", color: "var(--accent)" }}
                  >
                    {hintLabel}
                  </span>
                )}
              </div>

              {/* Bean name + roaster */}
              <p
                className="text-[15px] font-semibold leading-snug flex-1"
                style={{ color: isLastUsed ? "white" : "var(--text-primary)" }}
              >
                {bag.name}
              </p>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: isLastUsed ? "rgba(255,255,255,0.75)" : "var(--text-secondary)" }}
              >
                {bag.roaster}
              </p>

              {/* Last shot info */}
              {bagDefault ? (
                <div className="mt-2 pt-2" style={{ borderTop: isLastUsed ? "1px solid rgba(255,255,255,0.2)" : "1px solid var(--separator)" }}>
                  <p
                    className="text-[11px]"
                    style={{ color: isLastUsed ? "rgba(255,255,255,0.75)" : "var(--text-secondary)" }}
                  >
                    {formatLastShot(bagDefault.pulledAt)}
                  </p>
                  {bagDefault.shotRating != null && (
                    <p style={{ color: isLastUsed ? "rgba(255,255,255,0.9)" : "#FF9500" }}>
                      <StarRating rating={bagDefault.shotRating} />
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-2 pt-2" style={{ borderTop: isLastUsed ? "1px solid rgba(255,255,255,0.2)" : "1px solid var(--separator)" }}>
                  <p
                    className="text-[11px]"
                    style={{ color: isLastUsed ? "rgba(255,255,255,0.6)" : "var(--text-secondary)" }}
                  >
                    No shots yet
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
