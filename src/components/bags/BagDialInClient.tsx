"use client";

import { useState, useTransition } from "react";
import { getBagRecommendation } from "@/lib/bags/parseWithAI";

export default function BagDialInClient({
  bagId,
  shotCount,
  existingTip,
}: {
  bagId: number;
  shotCount: number;
  existingTip: string | null;
}) {
  const [tip, setTip] = useState<string | null>(existingTip);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await getBagRecommendation(bagId);
      if ("error" in res) {
        setError(res.error);
      } else {
        setTip(res.tip);
      }
    });
  };

  const hasShots = shotCount > 0;
  const buttonLabel = hasShots ? "Get improvement tip" : "Get dial-in tip";
  const loadingLabel = hasShots ? "Analyzing shots…" : "Generating tip…";

  return (
    <div
      className="mx-4 rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#AF52DE11", border: "1px solid #AF52DE33", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
    >
      {tip ? (
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: "#AF52DE", fontSize: 16 }}>✦</span>
            <p className="text-[15px] font-semibold flex-1" style={{ color: "#AF52DE" }}>
              {hasShots ? "Dial-in advice" : "Dial-in tip"}
            </p>
          </div>
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {tip}
          </p>
          <button
            type="button"
            onClick={run}
            disabled={isPending}
            className="mt-3 text-[13px]"
            style={{ color: "#AF52DE88" }}
          >
            {isPending ? loadingLabel : "Refresh ↺"}
          </button>
        </div>
      ) : (
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: "#AF52DE", fontSize: 16 }}>✦</span>
            <p className="text-[15px] font-semibold" style={{ color: "#AF52DE" }}>
              {hasShots ? "Dial-in advice" : "Dial-in tip"}
            </p>
          </div>
          <p className="text-[14px] mb-4" style={{ color: "var(--text-secondary)" }}>
            {hasShots
              ? `AI analysis of your ${shotCount} shot${shotCount === 1 ? "" : "s"} — specific advice on what to adjust next.`
              : "Get a starting point recommendation for this bean based on your grinder and history."}
          </p>
          {error && (
            <p className="text-[14px] mb-3" style={{ color: "#FF3B30" }}>{error}</p>
          )}
          <button
            type="button"
            onClick={run}
            disabled={isPending}
            className="px-5 py-2 rounded-full text-[15px] font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#AF52DE", color: "#fff" }}
          >
            {isPending ? loadingLabel : buttonLabel}
          </button>
        </div>
      )}
    </div>
  );
}
