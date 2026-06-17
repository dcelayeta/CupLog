"use client";

import { useState, useEffect } from "react";
import LogFormClient from "./LogFormClient";
import type { BagOption, LastShotDefaults } from "@/lib/shots/queries";
import type { EquipmentProfile, ExtractionThreshold } from "@/db/schema";
import { useDirtyForm } from "@/context/DirtyFormContext";

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
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const time = shot.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (shot.toDateString() === now.toDateString()) return `Today ${time}`;
  if (shot.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return shot.toLocaleDateString([], { month: "short", day: "numeric" }) + ` ${time}`;
}

function isInPeak(bag: BagOption): boolean {
  if (bag.peakStartDay == null || bag.peakEndDay == null) return false;
  const days = Math.floor((Date.now() - new Date(bag.roastDate).getTime()) / 86400000);
  return days >= bag.peakStartDay && days <= bag.peakEndDay;
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
  const { setDirty } = useDirtyForm();

  const lastBagId = lastShot ? (bags.find((b) => b.id === lastShot.bagId)?.id ?? null) : null;

  const [selectedBagId, setSelectedBagId] = useState<number | null>(
    bags.length === 1 ? bags[0].id : null
  );

  // Mark dirty whenever the log form is open (step 2 or single-bag auto-proceed)
  useEffect(() => {
    if (selectedBagId !== null) {
      setDirty(true);
    }
    return () => setDirty(false);
  }, [selectedBagId, setDirty]);

  if (selectedBagId !== null) {
    return (
      <LogFormClient
        {...props}
        preselectedBagId={selectedBagId.toString()}
        onSubmit={() => setDirty(false)}
      />
    );
  }

  // Before 14:00 prefer caf, 14:00+ prefer decaf
  const hour = new Date().getHours();
  const preferDecaf = hour >= 14;

  const matchesCaffPref = (bag: BagOption) => preferDecaf ? bag.isDecaf : !bag.isDecaf;

  // "Recommended" = right caffeine type for right now + in peak freshness window
  const isRecommended = (bag: BagOption) => matchesCaffPref(bag) && isInPeak(bag);

  // Sort: recommended first, then caffeine match, then last-used as tiebreaker
  const sorted = [...bags].sort((a, b) => {
    const aRec = isRecommended(a);
    const bRec = isRecommended(b);
    if (aRec && !bRec) return -1;
    if (!aRec && bRec) return 1;
    const aMatch = matchesCaffPref(a);
    const bMatch = matchesCaffPref(b);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    if (a.id === lastBagId) return -1;
    if (b.id === lastBagId) return 1;
    return 0;
  });

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
          const recommended = isRecommended(bag);
          const bagDefault = bagDefaults[bag.id];

          return (
            <button
              key={bag.id}
              type="button"
              onClick={() => setSelectedBagId(bag.id)}
              className="rounded-2xl text-left px-4 py-4 flex flex-col cursor-pointer active:opacity-70 transition-opacity"
              style={{
                backgroundColor: isLastUsed ? "var(--accent)" : "var(--card)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                minHeight: 130,
              }}
            >
              {/* Badges row */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {recommended && (
                  <span
                    className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor: isLastUsed ? "rgba(255,255,255,0.25)" : "#34C75920",
                      color: isLastUsed ? "white" : "#34C759",
                    }}
                  >
                    Recommended
                  </span>
                )}
                {isLastUsed && (
                  <span className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor: isLastUsed ? "rgba(255,255,255,0.2)" : "var(--card-secondary)",
                      color: "white",
                    }}
                  >
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
              <div
                className="mt-2 pt-2"
                style={{ borderTop: isLastUsed ? "1px solid rgba(255,255,255,0.2)" : "1px solid var(--separator)" }}
              >
                {bagDefault ? (
                  <>
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
                  </>
                ) : (
                  <p
                    className="text-[11px]"
                    style={{ color: isLastUsed ? "rgba(255,255,255,0.6)" : "var(--text-secondary)" }}
                  >
                    No shots yet
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
