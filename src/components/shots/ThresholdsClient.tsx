"use client";

import { useState, useTransition } from "react";
import { saveThreshold, restoreDefaultThresholds } from "@/lib/shots/thresholds";
import { saveAppConfig } from "@/lib/config/queries";
import type { ExtractionThreshold } from "@/db/schema";

type EditableThreshold = {
  id: number;
  label: string;
  minValue: string;
  maxValue: string; // empty string = null (no upper bound)
  metric: "time" | "ratio";
  sortOrder: number;
};

function ThresholdRow({
  threshold,
  onChange,
  isLast,
}: {
  threshold: EditableThreshold;
  onChange: (updated: EditableThreshold) => void;
  isLast: boolean;
}) {
  return (
    <div
      className="row-divider flex items-center gap-2 px-4 py-3"
    >
      <input
        type="text"
        value={threshold.label}
        onChange={(e) => onChange({ ...threshold, label: e.target.value })}
        className="flex-1 outline-none bg-transparent text-[15px]"
        style={{ color: "var(--text-primary)" }}
        placeholder="Label"
      />
      <input
        type="number"
        value={threshold.minValue}
        onChange={(e) => onChange({ ...threshold, minValue: e.target.value })}
        className="w-[60px] text-right outline-none bg-transparent text-[15px]"
        style={{ color: "var(--text-secondary)" }}
        placeholder="min"
        step="0.5"
        min="0"
        inputMode="decimal"
      />
      <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>–</span>
      <input
        type="number"
        value={threshold.maxValue}
        onChange={(e) => onChange({ ...threshold, maxValue: e.target.value })}
        className="w-[60px] text-right outline-none bg-transparent text-[15px]"
        style={{ color: "var(--text-secondary)" }}
        placeholder="∞"
        step="0.5"
        min="0"
        inputMode="decimal"
      />
    </div>
  );
}

function Section({
  label,
  rows: sectionRows,
  updateRow,
}: {
  label: string;
  rows: EditableThreshold[];
  updateRow: (updated: EditableThreshold) => void;
}) {
  return (
    <div className="mb-1">
      <div className="px-4 pt-5 pb-1">
        <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{label}</p>
      </div>
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div className="row-divider flex items-center px-4 py-2">
          <span className="flex-1 text-[12px] uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Label</span>
          <span className="w-[60px] text-right text-[12px] uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Min</span>
          <span className="w-[8px]" />
          <span className="w-[60px] text-right text-[12px] uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Max</span>
        </div>
        {sectionRows.map((row, i) => (
          <ThresholdRow
            key={row.id}
            threshold={row}
            onChange={updateRow}
            isLast={i === sectionRows.length - 1}
          />
        ))}
      </div>
      <p className="px-4 mt-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
        {label === "Time (seconds)" ? "Values in seconds. Leave Max empty for no upper bound." : "Values as ratio (yield ÷ dose). Leave Max empty for no upper bound."}
      </p>
    </div>
  );
}

export default function ThresholdsClient({
  thresholds,
  lowInventoryWarningCups: initialWarningCups,
  recentShotWindow: initialShotWindow,
}: {
  thresholds: ExtractionThreshold[];
  lowInventoryWarningCups: number;
  recentShotWindow: number;
}) {
  const [rows, setRows] = useState<EditableThreshold[]>(
    thresholds.map((t) => ({
      id: t.id,
      label: t.label,
      minValue: t.minValue.toString(),
      maxValue: t.maxValue?.toString() ?? "",
      metric: t.metric,
      sortOrder: t.sortOrder,
    }))
  );
  const [warningCups, setWarningCups] = useState(initialWarningCups);
  const [shotWindow, setShotWindow] = useState(initialShotWindow);
  const [isPending, startTransition] = useTransition();
  const [isRestoring, startRestore] = useTransition();
  const [saved, setSaved] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const timeRows = rows.filter((r) => r.metric === "time").sort((a, b) => a.sortOrder - b.sortOrder);
  const ratioRows = rows.filter((r) => r.metric === "ratio").sort((a, b) => a.sortOrder - b.sortOrder);

  const updateRow = (updated: EditableThreshold) => {
    setSaved(false);
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleSave = () => {
    startTransition(async () => {
      for (const row of rows) {
        const minValue = parseFloat(row.minValue);
        const maxValue = row.maxValue !== "" ? parseFloat(row.maxValue) : null;
        if (!isNaN(minValue) && row.label.trim()) {
          await saveThreshold(row.id, { label: row.label.trim(), minValue, maxValue });
        }
      }
      await saveAppConfig({ lowInventoryWarningCups: warningCups, recentShotWindow: shotWindow });
      setSaved(true);
    });
  };

  const handleRestore = () => {
    startRestore(async () => {
      await restoreDefaultThresholds();
      setConfirmRestore(false);
      // Reload the page to reflect the restored data
      window.location.reload();
    });
  };

  return (
    <div className="pb-40">
      <Section label="Time (seconds)" rows={timeRows} updateRow={updateRow} />
      <Section label="Ratio (yield ÷ dose)" rows={ratioRows} updateRow={updateRow} />

      {/* Inventory alert threshold */}
      <div className="mb-1">
        <div className="px-4 pt-5 pb-1">
          <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Inventory</p>
        </div>
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center px-4 py-3 row-divider">
            <div className="flex-1">
              <p className="text-[15px]" style={{ color: "var(--text-primary)" }}>Low inventory alert</p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Warn when estimated cups remaining drops below this threshold.
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setSaved(false); setWarningCups((c) => Math.max(1, c - 1)); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[20px] leading-none"
                style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-primary)" }}
              >
                −
              </button>
              <span className="text-[17px] font-semibold w-16 text-center" style={{ color: "var(--text-primary)" }}>
                {warningCups} cups
              </span>
              <button
                type="button"
                onClick={() => { setSaved(false); setWarningCups((c) => Math.min(60, c + 1)); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[20px] leading-none"
                style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-primary)" }}
              >
                +
              </button>
            </div>
          </div>
          <div className="flex items-center px-4 py-3">
            <div className="flex-1">
              <p className="text-[15px]" style={{ color: "var(--text-primary)" }}>Dose avg window</p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Number of recent shots used to estimate your average dose per cup. Fallback: all-time avg, then 18g.
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setSaved(false); setShotWindow((s) => Math.max(1, s - 1)); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[20px] leading-none"
                style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-primary)" }}
              >
                −
              </button>
              <span className="text-[17px] font-semibold w-20 text-center" style={{ color: "var(--text-primary)" }}>
                {shotWindow} shots
              </span>
              <button
                type="button"
                onClick={() => { setSaved(false); setShotWindow((s) => Math.min(30, s + 1)); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[20px] leading-none"
                style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-primary)" }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {saved && (
        <p className="mx-4 mt-3 text-[15px] text-center" style={{ color: "var(--success)" }}>
          Saved successfully
        </p>
      )}

      {/* Save button */}
      <div
        className="fixed-col px-4 py-3"
        style={{
          bottom: "calc(80px + env(safe-area-inset-bottom))",
          background: "linear-gradient(to bottom, transparent, var(--bg) 40%)",
          pointerEvents: "none",
        }}
      >
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="w-full py-3.5 rounded-full text-[17px] font-semibold disabled:opacity-40 mb-2"
          style={{ backgroundColor: "var(--card)", color: "var(--accent)", pointerEvents: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>

        {!confirmRestore ? (
          <button
            type="button"
            onClick={() => setConfirmRestore(true)}
            className="w-full py-2.5 rounded-full text-[15px] font-medium"
            style={{ backgroundColor: "transparent", color: "var(--text-secondary)", pointerEvents: "auto" }}
          >
            Reset to Industry Standards
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmRestore(false)}
              className="flex-1 py-2.5 rounded-full text-[15px] font-medium"
              style={{ backgroundColor: "var(--card)", color: "var(--text-primary)", pointerEvents: "auto" }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isRestoring}
              onClick={handleRestore}
              className="flex-1 py-2.5 rounded-full text-[15px] font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--destructive)" + "22", color: "var(--destructive)", pointerEvents: "auto" }}
            >
              {isRestoring ? "Restoring…" : "Confirm Reset"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
