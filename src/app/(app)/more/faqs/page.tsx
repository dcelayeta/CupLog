import Link from "next/link";
import { getFaqs } from "@/lib/faqs/queries";
import FaqsClient from "@/components/faqs/FaqsClient";

export default async function FaqsPage() {
  const faqs = await getFaqs();

  return (
    <div className="pt-4 pb-24">
      <div className="flex items-center justify-between px-4 mb-4">
        <Link
          href="/more"
          className="flex items-center gap-1 text-[17px]"
          style={{ color: "var(--accent)" }}
        >
          <svg width="11" height="18" viewBox="0 0 11 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1L1 9l8 8" />
          </svg>
          More
        </Link>
      </div>

      <h1 className="text-[34px] font-display px-4 mb-1" style={{ color: "var(--text-primary)" }}>
        My Coffee FAQs
      </h1>
      <p className="text-[15px] px-4 mb-6" style={{ color: "var(--text-secondary)" }}>
        Ask anything. Answers are saved and personalized to your setup.
      </p>

      <FaqsClient initialFaqs={faqs} />
    </div>
  );
}
