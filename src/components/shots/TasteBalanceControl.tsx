"use client";

const LABELS = ["Very Sour", "Sour", "Slightly Sour", "Balanced", "Slightly Bitter", "Bitter", "Very Bitter"];
const COLORS = ["#FF3B30", "#FF6B35", "#FFB347", "#34C759", "#FF9500", "#8B5CF6", "#6D28D9"];

export default function TasteBalanceControl({
  value,
  onChange,
  name,
  readOnly = false,
}: {
  value: number | null;
  onChange: (v: number) => void;
  name: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((n, i) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onChange(n)}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 999,
                backgroundColor: active ? "var(--card)" : "var(--card-secondary)",
                color: active ? COLORS[i] : "var(--text-secondary)",
                fontWeight: active ? 600 : 400,
                fontSize: 15,
                boxShadow: active ? "0 1px 4px rgba(0,0,0,0.14)" : "none",
                border: "none",
                cursor: readOnly ? "default" : "pointer",
                transition: "background-color 0.15s, box-shadow 0.15s",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 px-0.5">
        <span className="text-[12px]" style={{ color: COLORS[0] }}>Sour</span>
        <span className="text-[12px]" style={{ color: value !== null ? COLORS[value - 1] : "var(--text-secondary)" }}>
          {value !== null ? LABELS[value - 1] : ""}
        </span>
        <span className="text-[12px]" style={{ color: COLORS[6] }}>Bitter</span>
      </div>
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}
