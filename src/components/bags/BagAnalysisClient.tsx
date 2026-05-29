"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { analyzeBag, type BagAnalysisResult } from "@/lib/bags/bagAnalysis";
import type { BagAnalysis } from "@/db/schema";

const RECS = {
  buy_again:            { label: "Buy Again",            color: "#30D158" },
  try_with_adjustments: { label: "Try with Adjustments", color: "#FF9500" },
  avoid:                { label: "Avoid",                 color: "#FF3B30" },
} as const;

function RecommendationBadge({ rec }: { rec: string }) {
  const cfg = RECS[rec as keyof typeof RECS] ?? { label: rec, color: "#8E8E93" };
  return (
    <span
      className="text-[13px] font-semibold px-3 py-1 rounded-full"
      style={{ backgroundColor: cfg.color + "22", color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-[12px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>
        {label}
      </p>
      <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {children}
      </p>
    </div>
  );
}

function AnalysisCard({
  result,
  onReanalyze,
  isPending,
}: {
  result: BagAnalysisResult;
  onReanalyze: () => void;
  isPending: boolean;
}) {
  return (
    <div
      className="mx-4 rounded-2xl px-4 pt-4 pb-3"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[18px]" style={{ color: "var(--accent)" }}>✦</span>
        <p className="text-[17px] font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
          Bag Review
        </p>
        <RecommendationBadge rec={result.recommendation} />
      </div>

      <Section label="Summary">{result.summary}</Section>
      <Section label="Recommendation">{result.recommendationReason}</Section>
      {result.grindNotes && <Section label="Grind Notes">{result.grindNotes}</Section>}
      {result.tasteNotes && <Section label="Taste Profile">{result.tasteNotes}</Section>}

      <button
        type="button"
        onClick={onReanalyze}
        disabled={isPending}
        className="mt-1 text-[13px]"
        style={{ color: "var(--text-secondary)" }}
      >
        {isPending ? "Re-analyzing…" : "Re-analyze"}
      </button>
    </div>
  );
}

export default function BagAnalysisClient({
  bagId,
  existingAnalysis,
}: {
  bagId: number;
  existingAnalysis: BagAnalysis | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BagAnalysisResult | null>(
    existingAnalysis
      ? {
          summary: existingAnalysis.summary,
          recommendation: existingAnalysis.recommendation as BagAnalysisResult["recommendation"],
          recommendationReason: existingAnalysis.recommendationReason,
          grindNotes: existingAnalysis.grindNotes ?? null,
          tasteNotes: existingAnalysis.tasteNotes ?? null,
        }
      : null
  );
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await analyzeBag(bagId);
      if ("error" in res) {
        setError(res.error);
      } else {
        setResult(res);
        router.refresh();
      }
    });
  };

  if (result) {
    return <AnalysisCard result={result} onReanalyze={run} isPending={isPending} />;
  }

  return (
    <div
      className="mx-4 rounded-2xl px-4 py-4"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[18px]" style={{ color: "var(--accent)" }}>✦</span>
        <p className="text-[17px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Bag Review
        </p>
      </div>
      <p className="text-[14px] mb-4" style={{ color: "var(--text-secondary)" }}>
        AI analysis of all shots from this bag — summary, taste profile, and whether to buy it again.
      </p>
      {error && (
        <p className="text-[14px] mb-3" style={{ color: "#FF3B30" }}>{error}</p>
      )}
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="px-5 py-2 rounded-full text-[15px] font-medium"
        style={{
          backgroundColor: isPending ? "var(--card-secondary)" : "var(--accent)",
          color: isPending ? "var(--text-secondary)" : "#fff",
        }}
      >
        {isPending ? "Analyzing…" : "Analyze Bag"}
      </button>
    </div>
  );
}
