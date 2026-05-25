const SEGMENT_COLORS = ["#FF3B30", "#FF6B35", "#FFB347", "#34C759", "#FF9500", "#8B5CF6", "#6D28D9"];
const LABELS = ["Very Sour", "Sour", "Slightly Sour", "Balanced", "Slightly Bitter", "Bitter", "Very Bitter"];

export default function TasteBalanceDisplay({ value }: { value: number | null }) {
  const active = value ?? 4;
  return (
    <div>
      <div className="flex gap-[2px]" style={{ height: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((n, i) => (
          <div
            key={n}
            style={{
              flex: 1,
              borderRadius: i === 0 ? "12px 4px 4px 12px" : i === 6 ? "4px 12px 12px 4px" : 4,
              backgroundColor: active === n ? SEGMENT_COLORS[i] : "var(--card-secondary)",
              opacity: active === n ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5 px-0.5">
        <span className="text-[12px]" style={{ color: "#FF3B30" }}>Sour</span>
        <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
          {value !== null ? LABELS[value - 1] : "—"}
        </span>
        <span className="text-[12px]" style={{ color: "#6D28D9" }}>Bitter</span>
      </div>
    </div>
  );
}
