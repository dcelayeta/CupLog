"use client";

import { useActionState, useState } from "react";
import { saveCoachingStateAction } from "@/lib/analysis/actions";

export default function CoachingStateClient({ initialJson }: { initialJson: string }) {
  const [json, setJson] = useState(initialJson);
  const [state, formAction, isPending] = useActionState(saveCoachingStateAction, null);

  return (
    <form action={formAction}>
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
      >
        <textarea
          name="json"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={28}
          spellCheck={false}
          className="w-full px-4 py-3 bg-transparent outline-none text-[13px] font-mono resize-none"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {state && "error" in state && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-2xl" style={{ backgroundColor: "var(--destructive)" + "22" }}>
          <p className="text-[15px]" style={{ color: "var(--destructive)" }}>{state.error}</p>
        </div>
      )}
      {state && "success" in state && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-2xl" style={{ backgroundColor: "var(--success)" + "22" }}>
          <p className="text-[15px]" style={{ color: "var(--success)" }}>Saved.</p>
        </div>
      )}

      <div
        className="fixed-col px-4 py-3"
        style={{
          bottom: "calc(80px + env(safe-area-inset-bottom))",
          background: "linear-gradient(to bottom, transparent, var(--bg) 40%)",
          pointerEvents: "none",
        }}
      >
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 rounded-full text-[17px] font-semibold disabled:opacity-40"
          style={{ backgroundColor: "var(--card)", color: "var(--accent)", pointerEvents: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
        >
          {isPending ? "Saving…" : "Save Coaching State"}
        </button>
      </div>
    </form>
  );
}
