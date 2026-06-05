"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import BagCard from "./BagCard";
import type { BagWithOrigins } from "@/lib/bags/queries";

export default function BagsListClient({
  bags,
  reserveBags = [],
  status,
  query,
  avgDosePerBag = {},
}: {
  bags: BagWithOrigins[];
  reserveBags?: BagWithOrigins[];
  status: "active" | "finished" | "all";
  query: string;
  avgDosePerBag?: Record<number, number>;
}) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateUrl = useCallback(
    (newStatus: string, newQuery: string) => {
      const params = new URLSearchParams();
      if (newStatus !== "active") params.set("status", newStatus);
      if (newQuery) params.set("q", newQuery);
      const qs = params.toString();
      router.replace(`/bags${qs ? "?" + qs : ""}`, { scroll: false });
    },
    [router]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateUrl(status, q), 300);
  };

  return (
    <div>
      {/* Search bar */}
      <div className="px-4 mb-3">
        <div
          className="flex items-center gap-2 px-4 rounded-full"
          style={{ backgroundColor: "var(--card)", height: "44px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text-secondary)", flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            defaultValue={query}
            onChange={handleSearch}
            placeholder="Search bags..."
            className="flex-1 bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 mb-4">
        <div
          className="flex rounded-full p-1 gap-1"
          style={{ backgroundColor: "var(--card-secondary)" }}
        >
          {(["active", "finished", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => updateUrl(s, query)}
              className="flex-1 py-1.5 rounded-full text-[14px] font-medium transition-colors capitalize"
              style={{
                backgroundColor: status === s ? "var(--card)" : "transparent",
                color: status === s ? "var(--text-primary)" : "var(--text-secondary)",
                boxShadow: status === s ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              }}
            >
              {s === "active" ? "Active" : s === "finished" ? "Finished" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Active / main list */}
      {bags.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p
            className="text-[17px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {query
              ? `No ${status === "all" ? "" : status + " "}bags matching "${query}"`
              : status === "all" ? "No bags yet" : `No ${status} bags`}
          </p>
        </div>
      ) : (
        <div
          className="mx-4 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          }}
        >
          {bags.map((bag, i) => (
            <div key={bag.id}>
              {i > 0 && (
                <div
                  className="ml-4"
                  style={{ height: "1px", backgroundColor: "var(--divider)" }}
                />
              )}
              <BagCard bag={bag} avgDose={avgDosePerBag[bag.id]} />
            </div>
          ))}
        </div>
      )}

      {/* Reserve bags section */}
      {reserveBags.length > 0 && (
        <div className="mt-6">
          <p className="px-4 mb-2 text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Reserve
          </p>
          <div
            className="mx-4 rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
          >
            {reserveBags.map((bag, i) => (
              <div key={bag.id}>
                {i > 0 && (
                  <div className="ml-4" style={{ height: "1px", backgroundColor: "var(--divider)" }} />
                )}
                <BagCard bag={bag} avgDose={avgDosePerBag[bag.id]} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
