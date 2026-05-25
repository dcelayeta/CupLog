"use client";

import { useActionState } from "react";
import { addEquipmentProfile } from "@/lib/equipment/actions";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row-divider flex items-center px-6 min-h-[52px]">
      <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function TextInput({ name, placeholder }: { name: string; placeholder?: string }) {
  return (
    <input
      type="text"
      name={name}
      placeholder={placeholder ?? "—"}
      className="text-right outline-none bg-transparent text-[17px] max-w-[180px]"
      style={{ color: "var(--accent)" }}
    />
  );
}

function NumberInput({ name, placeholder, defaultValue }: { name: string; placeholder?: string; defaultValue?: number }) {
  return (
    <input
      type="number"
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder ?? "—"}
      min="0"
      className="text-right outline-none bg-transparent text-[17px] w-[80px]"
      style={{ color: "var(--accent)" }}
      inputMode="numeric"
    />
  );
}

export default function NewEquipmentFormClient() {
  const [state, formAction, isPending] = useActionState(addEquipmentProfile, null);

  return (
    <form action={formAction}>
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <Row label="Name"><TextInput name="name" placeholder="My Setup" /></Row>
        <Row label="Machine"><TextInput name="machine" /></Row>
        <Row label="Grinder"><TextInput name="grinder" /></Row>
        <Row label="Tamper"><TextInput name="tamper" /></Row>
        <Row label="Default Spring (lbs)"><NumberInput name="defaultSpringWeightLbs" /></Row>
        <Row label="Machine Clean (days)"><NumberInput name="machineCleaningIntervalDays" defaultValue={30} /></Row>
        <div className="flex items-center px-6 min-h-[52px]">
          <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Grinder Clean (days)</span>
          <NumberInput name="grinderCleaningIntervalDays" defaultValue={14} />
        </div>
      </div>

      <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div className="px-4 py-3">
          <p className="text-[13px] mb-2" style={{ color: "var(--text-secondary)" }}>Notes</p>
          <textarea
            name="notes"
            placeholder="Any notes about your setup…"
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

      <div className="fixed-col px-4 py-3" style={{ bottom: "calc(80px + env(safe-area-inset-bottom))", background: "linear-gradient(to bottom, transparent, var(--bg) 40%)", pointerEvents: "none" }}>
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 rounded-full text-[17px] font-semibold disabled:opacity-40"
          style={{ backgroundColor: "var(--card)", color: "var(--accent)", pointerEvents: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
        >
          {isPending ? "Saving…" : "Add Profile"}
        </button>
      </div>
    </form>
  );
}
