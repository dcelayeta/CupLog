const SEGMENT_COLORS = ["#FF6B35", "#FFB347", "#34C759", "#FF9500", "#8B5CF6"];
const LABELS = ["Very Sour", "Sour", "Balanced", "Bitter", "Very Bitter"];

export default function TasteBalanceDisplay({ value }: { value: number | null }) {
  const active = value ?? 3;
  return (
    <div>
      <div className="flex gap-[2px]" style={{ height: 52 }}>
        {[1, 2, 3, 4, 5].map((n, i) => (
          <div
            key={n}
            style={{
              flex: 1,
              borderRadius: i === 0 ? "12px 4px 4px 12px" : i === 4 ? "4px 12px 12px 4px" : 4,
              backgroundColor: active === n ? SEGMENT_COLORS[i] : "var(--card-secondary)",
              opacity: active === n ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5 px-0.5">
        <span className="text-[12px]" style={{ color: "#FF6B35" }}>Sour</span>
        <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
          {value !== null ? LABELS[value - 1] : "—"}
        </span>
        <span className="text-[12px]" style={{ color: "#8B5CF6" }}>Bitter</span>
      </div>
    </div>
  );
}
