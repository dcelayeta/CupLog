"use client";

import { useTransition } from "react";
import Link from "next/link";
import { setActiveEquipmentProfile } from "@/lib/equipment/actions";
import type { EquipmentProfile } from "@/db/schema";

export default function EquipmentProfileListClient({
  profiles,
}: {
  profiles: EquipmentProfile[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      {profiles.map((profile, i) => (
        <div
          key={profile.id}
          className={`flex items-center px-6 min-h-[64px]${i < profiles.length - 1 ? " row-divider" : ""}`}
        >
          <Link href={`/more/equipment/${profile.id}`} className="flex-1 active:opacity-70 transition-opacity">
            <p className="text-[17px]" style={{ color: "var(--text-primary)" }}>{profile.name}</p>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {[profile.machine, profile.grinder].filter(Boolean).join(" · ") || "No details"}
            </p>
          </Link>

          <div className="flex items-center gap-3 ml-3">
            {profile.isActive ? (
              <span
                className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "var(--accent)" + "22", color: "var(--accent)" }}
              >
                Active
              </span>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => setActiveEquipmentProfile(profile.id))}
                className="text-[13px] font-medium px-3 py-1.5 rounded-full transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-primary)" }}
              >
                Set Active
              </button>
            )}
            <Link href={`/more/equipment/${profile.id}`} style={{ color: "var(--text-secondary)" }}>
              <svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1l6 5.5L1 12" />
              </svg>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
