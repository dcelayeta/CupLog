"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import BagCard from "./BagCard";
import type { BagWithOrigins } from "@/lib/bags/queries";

export default function BagsListClient({
  bags,
  status,
  query,
}: {
  bags: BagWithOrigins[];
  status: "active" | "finished";
  query: string;
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
          className="flex items-center gap-2 px-3 rounded-xl"
          style={{ backgroundColor: "var(--card-secondary)", height: "44px" }}
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
          className="flex rounded-xl p-1 gap-1"
          style={{ backgroundColor: "var(--card-secondary)" }}
        >
          {(["active", "finished"] as const).map((s) => (
            <button
              key={s}
              onClick={() => updateUrl(s, query)}
              className="flex-1 py-1.5 rounded-[10px] text-[14px] font-medium transition-colors capitalize"
              style={{
                backgroundColor:
                  status === s ? "var(--card)" : "transparent",
                color:
                  status === s ? "var(--text-primary)" : "var(--text-secondary)",
                boxShadow:
                  status === s
                    ? "0 1px 3px rgba(0,0,0,0.12)"
                    : "none",
              }}
            >
              {s === "active" ? "Active" : "Finished"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {bags.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p
            className="text-[17px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {query
              ? `No ${status} bags matching "${query}"`
              : `No ${status} bags`}
          </p>
        </div>
      ) : (
        <div
          className="mx-4 rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          {bags.map((bag, i) => (
            <div key={bag.id}>
              {i > 0 && (
                <div
                  className="ml-4"
                  style={{
                    height: "1px",
                    backgroundColor: "var(--divider)",
                  }}
                />
              )}
              <BagCard bag={bag} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
