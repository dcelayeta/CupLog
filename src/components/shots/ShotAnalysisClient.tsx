"use client";

import { useTransition, useState } from "react";
import {
  analyzeShotById,
  getLatestAnalysisForShot,
  type AnalysisResult,
} from "@/lib/shots/analyzeShot";

const FALLBACK_ERROR_MESSAGE = "Something went wrong. Try again.";
const RECOVERY_POLL_INTERVAL_MS = 3000;
const RECOVERY_POLL_ATTEMPTS = 100; // ~5 minutes, the server's function ceiling

// Verdict → color
const VERDICT_COLORS: Record<string, string> = {
  great: "#34C759",
  good: "#007AFF",
  needs_work: "#FF9500",
  problem: "#FF3B30",
};

const VERDICT_LABELS: Record<string, string> = {
  great: "Great Shot",
  good: "Good Shot",
  needs_work: "Needs Work",
  problem: "Problem",
};

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return null;
  const color = VERDICT_COLORS[verdict] ?? "#8E8E93";
  const label = VERDICT_LABELS[verdict] ?? verdict;
  return (
    <span
      className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: color + "22", color }}
    >
      {label}
    </span>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>
        {label}
      </p>
      <div className="text-[15px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {children}
      </div>
    </div>
  );
}

function AnalysisDisplay({
  analysis,
  cached,
  onReanalyze,
  isPending,
  errorMessage,
}: {
  analysis: AnalysisResult;
  cached: boolean;
  onReanalyze: () => void;
  isPending: boolean;
  errorMessage: string | null;
}) {
  return (
    <div
      className="mx-4 rounded-2xl px-4 py-4"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[18px]" style={{ color: "var(--accent)" }}>✦</span>
        <p className="text-[17px] font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
          AI Analysis
        </p>
        <VerdictBadge verdict={analysis.overallVerdict} />
      </div>

      {/* Sections */}
      {analysis.summary && (
        <Section label="Summary">{analysis.summary}</Section>
      )}

      {analysis.numbers && (
        <Section label="What the Numbers Say">{analysis.numbers}</Section>
      )}

      {(analysis.recommendationAction || analysis.recommendationReason) && (
        <Section label="The One Thing to Change">
          {analysis.recommendationAction && (
            <p className="font-medium mb-1">{analysis.recommendationAction}</p>
          )}
          {analysis.recommendationReason && (
            <p style={{ color: "var(--text-secondary)" }}>{analysis.recommendationReason}</p>
          )}
        </Section>
      )}

      {analysis.beanContext && (
        <Section label="Bean Context">{analysis.beanContext}</Section>
      )}

      {analysis.progressNote && (
        <Section label="Progress">{analysis.progressNote}</Section>
      )}

      {/* Footer */}
      <div className="row-divider-t flex items-center justify-between mt-2 pt-3">
        {cached && (
          <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            Cached · {new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={onReanalyze}
          className="text-[13px] font-medium ml-auto disabled:opacity-50"
          style={{ color: "var(--accent)" }}
        >
          {isPending ? "Analyzing…" : "Re-analyze"}
        </button>
      </div>
      {errorMessage && (
        <p className="text-right text-[13px] mt-1.5" style={{ color: "var(--destructive)" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

// Polls for an analysis newer than `previousId` (null when none existed yet).
// Returns null if none appears within the polling window.
async function waitForSavedAnalysis(
  shotId: number,
  previousId: number | null,
): Promise<AnalysisResult | null> {
  for (let i = 0; i < RECOVERY_POLL_ATTEMPTS; i++) {
    await new Promise((resolve) => setTimeout(resolve, RECOVERY_POLL_INTERVAL_MS));
    try {
      const latest = await getLatestAnalysisForShot(shotId);
      if (latest && latest.id !== previousId) return latest;
    } catch {
      // Transient failure while polling — keep trying until the window closes.
    }
  }
  return null;
}

export default function ShotAnalysisClient({
  shotId,
  existingAnalysis,
}: {
  shotId: number;
  existingAnalysis: AnalysisResult | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(existingAnalysis);
  const [isCached, setIsCached] = useState(existingAnalysis !== null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAnalyze = () => {
    setErrorMessage(null);
    const previousId = analysis?.id ?? null;
    startTransition(async () => {
      try {
        const result = await analyzeShotById(shotId);
        if (result.success) {
          setAnalysis(result.analysis);
          setIsCached(false);
        } else {
          setErrorMessage(result.message);
        }
      } catch (err) {
        // The connection can drop (e.g. "Load failed" on Safari) while the server
        // is still generating and will save the analysis. Poll for it before
        // reporting a failure.
        const recovered = await waitForSavedAnalysis(shotId, previousId);
        if (recovered) {
          setAnalysis(recovered);
          setIsCached(false);
        } else {
          setErrorMessage(err instanceof Error ? err.message : FALLBACK_ERROR_MESSAGE);
        }
      }
    });
  };

  if (analysis) {
    return (
      <AnalysisDisplay
        analysis={analysis}
        cached={isCached}
        onReanalyze={handleAnalyze}
        isPending={isPending}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <div className="mx-4">
      <button
        type="button"
        disabled={isPending}
        onClick={handleAnalyze}
        className="w-full py-3.5 rounded-full text-[17px] font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
        style={{
          backgroundColor: "var(--card)",
          color: "var(--accent)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}
      >
        {isPending ? (
          <>
            <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Analyzing…
          </>
        ) : (
          <>✦ Analyze with AI</>
        )}
      </button>
      {errorMessage && (
        <p className="text-center text-[13px] mt-2" style={{ color: "var(--destructive)" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
