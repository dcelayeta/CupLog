import Link from "next/link";
import { getExtractionThresholds } from "@/lib/shots/thresholds";
import ThresholdsClient from "@/components/shots/ThresholdsClient";

export default async function ThresholdsPage() {
  const thresholds = await getExtractionThresholds();

  return (
    <div className="pt-4 pb-8">
      <div className="px-4 mb-2">
        <Link href="/more" className="text-[17px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1L1 8.5L9 16" />
          </svg>
          More
        </Link>
      </div>
      <h1 className="text-[34px] font-display px-4 mb-2" style={{ color: "var(--text-primary)" }}>
        Thresholds
      </h1>
      <p className="px-4 mb-4 text-[15px]" style={{ color: "var(--text-secondary)" }}>
        Classification ranges for shot time and brew ratio.
      </p>
      <ThresholdsClient thresholds={thresholds} />
    </div>
  );
}
