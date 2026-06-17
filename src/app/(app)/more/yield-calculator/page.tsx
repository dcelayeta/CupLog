"use client";

import Link from "next/link";
import { useState, useRef } from "react";

const RATIOS: { label: string; ratio: number; description: string; time: string }[] = [
  { label: "Turbo Ristretto", ratio: 1.0, description: "Very concentrated, intense",     time: "15–20s" },
  { label: "Ristretto",       ratio: 1.5, description: "Short, syrupy, sweet-forward",   time: "20–25s" },
  { label: "Espresso",        ratio: 2.0, description: "Standard espresso",               time: "25–30s" },
  { label: "Normale",         ratio: 2.5, description: "Balanced, slightly longer",       time: "28–32s" },
  { label: "Long Pull",       ratio: 3.0, description: "More volume, lighter body",       time: "35–40s" },
  { label: "Lungo",           ratio: 4.0, description: "Extended pull, thin body",        time: "40–50s" },
];

const PRESETS = [
  { label: "Single", dose: 9 },
  { label: "Double", dose: 18 },
  { label: "Triple", dose: 21 },
];

const STANDARD_MIN = 1.5;
const STANDARD_MAX = 2.5;

function DoseInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const dec = () => onChange(Math.max(1, Math.round((value - 0.1) * 10) / 10));
  const inc = () => onChange(Math.min(30, Math.round((value + 0.1) * 10) / 10));

  const startEdit = () => {
    setRaw(value.toFixed(1));
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const commitEdit = () => {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 30) {
      onChange(Math.round(parsed * 10) / 10);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={dec}
        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[20px] font-light active:opacity-60"
        style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-primary)" }}
      >
        −
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
          className="text-[22px] font-semibold w-20 text-center bg-transparent outline-none border-b-2"
          style={{ color: "var(--text-primary)", borderColor: "var(--accent)" }}
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="text-[22px] font-semibold w-20 text-center active:opacity-60"
          style={{ color: "var(--text-primary)" }}
        >
          {value.toFixed(1)}g
        </button>
      )}

      <button
        type="button"
        onClick={inc}
        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[20px] font-light active:opacity-60"
        style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-primary)" }}
      >
        +
      </button>
    </div>
  );
}

export default function YieldCalculatorPage() {
  const [dose, setDose] = useState(18.0);

  return (
    <div className="pt-4 pb-24">
      {/* Nav */}
      <div className="flex items-center px-4 mb-6">
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

      <h1 className="text-[34px] font-display px-4 mb-6" style={{ color: "var(--text-primary)" }}>
        Yield Calculator
      </h1>

      {/* Dose input */}
      <div className="px-4 mb-2">
        <p className="text-[13px] font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-secondary)" }}>
          Dose
        </p>

        {/* Presets */}
        <div className="flex gap-2 mb-3">
          {PRESETS.map((p) => {
            const active = dose === p.dose;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setDose(p.dose)}
                className="flex-1 py-2 rounded-xl text-[14px] font-medium active:opacity-70 transition-colors"
                style={{
                  backgroundColor: active ? "var(--accent)" : "var(--card)",
                  color: active ? "white" : "var(--text-primary)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                }}
              >
                {p.label}
                <span
                  className="block text-[11px] font-normal mt-0.5"
                  style={{ color: active ? "rgba(255,255,255,0.75)" : "var(--text-secondary)" }}
                >
                  {p.dose}g
                </span>
              </button>
            );
          })}
        </div>

        {/* Stepper */}
        <div
          className="rounded-2xl px-5 py-4 flex items-center justify-between"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
        >
          <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Ground dose</span>
          <DoseInput value={dose} onChange={setDose} />
        </div>
      </div>

      {/* Results */}
      <div className="px-4 mt-4 mb-2">
        <p className="text-[13px] font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-secondary)" }}>
          Yields
        </p>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
        >
          {RATIOS.map((r, i) => {
            const yield_ = Math.round(dose * r.ratio * 10) / 10;
            const isStandard = r.ratio >= STANDARD_MIN && r.ratio <= STANDARD_MAX;
            return (
              <div
                key={r.ratio}
                className="flex items-center px-5 py-3"
                style={{
                  borderTop: i > 0 ? "1px solid var(--separator)" : "none",
                  backgroundColor: isStandard ? "var(--card-secondary)" : "transparent",
                }}
              >
                <div className="flex-1">
                  <p className="text-[15px] font-medium" style={{ color: "var(--text-primary)" }}>
                    {r.label}
                  </p>
                  <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    {r.description} · {r.time}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span
                    className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isStandard ? "var(--accent)" : "var(--card-secondary)",
                      color: isStandard ? "white" : "var(--text-secondary)",
                    }}
                  >
                    1:{r.ratio}
                  </span>
                  <span
                    className="text-[20px] font-semibold w-14 text-right"
                    style={{ color: isStandard ? "var(--accent)" : "var(--text-primary)" }}
                  >
                    {yield_.toFixed(1)}g
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Context note */}
      <p className="px-5 mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Ratio = yield ÷ dose. Each style requires a different grind — coarser for longer ratios, finer for shorter ones. Times are approximate; your machine, dose, and grind will all shift them. The standard espresso range (1:1.5–1:2.5) is highlighted.
      </p>
    </div>
  );
}
