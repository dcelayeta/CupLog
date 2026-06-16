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

function daysSince(roastDate: string): number {
  return Math.floor((Date.now() - new Date(roastDate).getTime()) / 86400000);
}

export default function LogFlowClient(props: Props) {
  const { bags, lastShot } = props;

  const lastBagId = lastShot ? (bags.find((b) => b.id === lastShot.bagId)?.id ?? null) : null;

  const [selectedBagId, setSelectedBagId] = useState<number | null>(
    bags.length === 1 ? bags[0].id : null
  );

  if (selectedBagId !== null) {
    return <LogFormClient {...props} preselectedBagId={selectedBagId.toString()} />;
  }

  const lastBag = lastBagId != null ? bags.find((b) => b.id === lastBagId) ?? null : null;
  const otherBags = bags.filter((b) => b.id !== lastBagId);

  return (
    <>
      {lastBag && (
        <>
          <div className="px-4 pt-1 pb-2">
            <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Last Used
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedBagId(lastBag.id)}
            className="mx-4 mb-5 rounded-2xl text-left px-5 py-4"
            style={{ backgroundColor: "var(--accent)", width: "calc(100% - 2rem)" }}
          >
            <p className="text-[19px] font-semibold text-white leading-snug">{lastBag.name}</p>
            <p className="text-[14px] text-white mt-0.5" style={{ opacity: 0.75 }}>
              {lastBag.roaster} · {daysSince(lastBag.roastDate)}d since roast
            </p>
          </button>
        </>
      )}

      {otherBags.length > 0 && (
        <>
          <div className="px-4 pb-2">
            <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              {lastBag ? "Other Beans" : "Select Bean"}
            </p>
          </div>
          <div
            className="mx-4 rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
          >
            {otherBags.map((bag, i) => (
              <button
                key={bag.id}
                type="button"
                onClick={() => setSelectedBagId(bag.id)}
                className="w-full flex items-center justify-between px-5 min-h-[60px] text-left"
                style={{ borderBottom: i < otherBags.length - 1 ? "1px solid var(--separator)" : "none" }}
              >
                <div>
                  <p className="text-[17px]" style={{ color: "var(--text-primary)" }}>{bag.name}</p>
                  <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    {bag.roaster} · {daysSince(bag.roastDate)}d since roast
                  </p>
                </div>
                <span className="text-[22px] leading-none ml-3" style={{ color: "var(--text-secondary)" }}>›</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
