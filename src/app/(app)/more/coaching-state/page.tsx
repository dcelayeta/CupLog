import { getCoachingState } from "@/lib/analysis/queries";
import CoachingStateClient from "@/components/analysis/CoachingStateClient";
import Link from "next/link";

export default async function CoachingStatePage() {
  const state = await getCoachingState();

  return (
    <div className="pt-4 pb-32">
      <div className="px-4 mb-2">
        <Link href="/more" className="text-[17px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1L1 8.5L9 16" />
          </svg>
          More
        </Link>
      </div>

      <div className="px-4 mb-4">
        <h1 className="text-[34px] font-display" style={{ color: "var(--text-primary)" }}>
          Coaching State
        </h1>
        <p className="text-[15px] mt-1" style={{ color: "var(--text-secondary)" }}>
          Edit the AI's rolling context. Changes take effect on the next analysis.
        </p>
      </div>

      <CoachingStateClient initialJson={JSON.stringify(state, null, 2)} />
    </div>
  );
}
