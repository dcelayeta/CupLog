"use client";

import { useActionState } from "react";
import { updateRoaster } from "@/lib/roasters/actions";
import type { Roaster } from "@/db/schema";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row-divider flex items-center px-6 min-h-[52px]">
      <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function TextInput({ name, defaultValue, placeholder, type = "text" }: { name: string; defaultValue?: string | null; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      name={name}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder ?? "—"}
      className="text-right outline-none bg-transparent text-[17px] max-w-[200px]"
      style={{ color: "var(--accent)" }}
    />
  );
}

export default function RoasterFormClient({ roaster }: { roaster: Roaster }) {
  const action = updateRoaster.bind(null, roaster.id);
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction}>
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <Row label="Name"><TextInput name="name" defaultValue={roaster.name} /></Row>
        <Row label="Website"><TextInput name="website" type="url" defaultValue={roaster.website} placeholder="https://…" /></Row>
        <div className="flex items-center px-6 min-h-[52px]">
          <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Location</span>
          <TextInput name="location" defaultValue={roaster.location} placeholder="e.g. Chicago, IL" />
        </div>
      </div>

      <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div className="px-4 py-3">
          <p className="text-[13px] mb-2" style={{ color: "var(--text-secondary)" }}>Notes</p>
          <textarea
            name="notes"
            defaultValue={roaster.notes ?? ""}
            placeholder="Anything you want to remember about them…"
            rows={4}
            className="w-full bg-transparent outline-none text-[17px] resize-none placeholder:text-[var(--text-secondary)]"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {state && "error" in state && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-2xl" style={{ backgroundColor: "var(--destructive)" + "22" }}>
          <p className="text-[15px]" style={{ color: "var(--destructive)" }}>{state.error}</p>
        </div>
      )}
      {state && "success" in state && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-2xl" style={{ backgroundColor: "var(--success)" + "22" }}>
          <p className="text-[15px]" style={{ color: "var(--success)" }}>Saved. Renaming updates every bag linked to this roaster.</p>
        </div>
      )}

      <div className="fixed-col px-4 py-3" style={{ bottom: "calc(80px + env(safe-area-inset-bottom))", background: "linear-gradient(to bottom, transparent, var(--bg) 40%)", pointerEvents: "none" }}>
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 rounded-full text-[17px] font-semibold disabled:opacity-40"
          style={{ backgroundColor: "var(--card)", color: "var(--accent)", pointerEvents: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
