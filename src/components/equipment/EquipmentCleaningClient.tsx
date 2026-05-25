"use client";

import { useTransition } from "react";
import { markEquipmentCleaned } from "@/lib/equipment/actions";

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function CleaningRow({
  label,
  lastCleaned,
  intervalDays,
  profileId,
  type,
  isLast,
}: {
  label: string;
  lastCleaned: string | null;
  intervalDays: number;
  profileId: number;
  type: "machine" | "grinder";
  isLast?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const days = daysSince(lastCleaned);
  const overdue = days !== null && days >= intervalDays;
  const neverCleaned = days === null;

  return (
    <div className="row-divider px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>{label}</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => markEquipmentCleaned(profileId, type))}
          className="text-[13px] font-medium px-3 py-1 rounded-full disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" + "22", color: "var(--accent)" }}
        >
          {isPending ? "Saving…" : "Mark cleaned today"}
        </button>
      </div>
      <p className="text-[14px]" style={{ color: overdue || neverCleaned ? "var(--destructive)" : "var(--text-secondary)" }}>
        {neverCleaned
          ? `Never cleaned — interval: ${intervalDays} days`
          : overdue
          ? `${days} days ago — overdue by ${days - intervalDays} days`
          : `${days} days ago — next in ${intervalDays - days} days`}
      </p>
    </div>
  );
}

export default function EquipmentCleaningClient({
  profile,
}: {
  profile: {
    id: number;
    machineLastCleanedAt: string | null;
    grinderLastCleanedAt: string | null;
    machineCleaningIntervalDays: number | null;
    grinderCleaningIntervalDays: number | null;
  };
}) {
  return (
    <div
      className="mx-4 rounded-2xl overflow-hidden mb-1"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
    >
      <CleaningRow
        label="Machine"
        lastCleaned={profile.machineLastCleanedAt}
        intervalDays={profile.machineCleaningIntervalDays ?? 30}
        profileId={profile.id}
        type="machine"
      />
      <CleaningRow
        label="Grinder"
        lastCleaned={profile.grinderLastCleanedAt}
        intervalDays={profile.grinderCleaningIntervalDays ?? 14}
        profileId={profile.id}
        type="grinder"
        isLast
      />
    </div>
  );
}
