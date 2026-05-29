"use client";

import { useActionState, useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { askCoffeeQuestion, deleteFaq } from "@/lib/faqs/actions";
import type { CoffeeFaq } from "@/db/schema";

const CATEGORY_COLORS: Record<string, string> = {
  Extraction:     "#007AFF",
  Beans:          "#30D158",
  Equipment:      "#8E8E93",
  Technique:      "#AF52DE",
  Drinks:         "#FF9500",
  Science:        "#5AC8FA",
  Troubleshooting:"#FF3B30",
  General:        "#636366",
};

const CATEGORY_ORDER = [
  "Extraction", "Technique", "Beans", "Equipment",
  "Drinks", "Science", "Troubleshooting", "General",
];

export default function FaqsClient({ initialFaqs }: { initialFaqs: CoffeeFaq[] }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [state, formAction, isPending] = useActionState(askCoffeeQuestion, null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state && "answer" in state) {
      setQuestion("");
      router.refresh();
    }
  }, [state, router]);

  const grouped = initialFaqs.reduce<Record<string, CoffeeFaq[]>>((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {});

  const sortedCategories = CATEGORY_ORDER.filter((c) => grouped[c]);

  const handleAskAgain = (q: string) => {
    setQuestion(q);
    textareaRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this answer?")) return;
    startDeleteTransition(async () => {
      await deleteFaq(id);
      router.refresh();
    });
  };

  return (
    <>
      {/* Ask form */}
      <form action={formAction}>
        <div
          className="mx-4 rounded-2xl overflow-hidden mb-4"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
        >
          <div className="px-4 pt-3 pb-1">
            <textarea
              ref={textareaRef}
              name="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a coffee question…"
              rows={3}
              className="w-full bg-transparent outline-none text-[17px] resize-none placeholder:text-[var(--text-secondary)]"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <div
            className="px-4 py-2 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--divider)" }}
          >
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              Grounded in your beans, shots &amp; equipment
            </p>
            <button
              type="submit"
              disabled={isPending || !question.trim()}
              className="px-5 py-1.5 rounded-full text-[15px] font-medium transition-colors"
              style={{
                backgroundColor: isPending || !question.trim() ? "var(--card-secondary)" : "var(--accent)",
                color: isPending || !question.trim() ? "var(--text-secondary)" : "#fff",
              }}
            >
              {isPending ? "Asking…" : "Ask"}
            </button>
          </div>
        </div>
      </form>

      {/* Error */}
      {state && "error" in state && (
        <div className="mx-4 mb-4 px-4 py-3 rounded-2xl" style={{ backgroundColor: "#FF3B3022" }}>
          <p className="text-[15px]" style={{ color: "#FF3B30" }}>{state.error}</p>
        </div>
      )}

      {/* Inline answer after asking */}
      {state && "answer" in state && (
        <div className="mb-6">
          <p
            className="px-4 mb-2 text-[13px] font-medium uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Latest answer
          </p>
          <div
            className="mx-4 rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
          >
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: (CATEGORY_COLORS[state.category] ?? "#636366") + "22",
                  color: CATEGORY_COLORS[state.category] ?? "#636366",
                }}
              >
                {state.category}
              </span>
            </div>
            <div className="px-4 pb-3">
              <p className="text-[15px] font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                {state.question}
              </p>
              <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {state.answer}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Saved FAQ list */}
      {sortedCategories.length === 0 && !(state && "answer" in state) && (
        <div className="px-4 py-12 text-center">
          <p className="text-[17px]" style={{ color: "var(--text-secondary)" }}>
            No saved answers yet.
          </p>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
            Ask a question above to get started.
          </p>
        </div>
      )}

      {sortedCategories.map((category) => (
        <div key={category} className="mb-6">
          <p
            className="px-4 mb-2 text-[13px] font-medium uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            {category}
          </p>
          <div
            className="mx-4 rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
          >
            {grouped[category].map((faq, i) => (
              <div key={faq.id}>
                {i > 0 && (
                  <div className="ml-4" style={{ height: 1, backgroundColor: "var(--divider)" }} />
                )}
                <div className="px-4 py-3">
                  <div className="flex items-start gap-2 mb-1">
                    <span
                      className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[category] ?? "#636366", marginTop: 7 }}
                    />
                    <p className="text-[15px] font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
                      {faq.question}
                    </p>
                  </div>
                  <p
                    className="text-[14px] leading-relaxed mb-2 pl-3.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {faq.answer}
                  </p>
                  <div className="flex items-center gap-4 pl-3.5">
                    <button
                      type="button"
                      onClick={() => handleAskAgain(faq.question)}
                      className="text-[13px] font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      Ask Again
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(faq.id)}
                      disabled={isDeleting}
                      className="text-[13px] font-medium"
                      style={{ color: "var(--destructive)" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
