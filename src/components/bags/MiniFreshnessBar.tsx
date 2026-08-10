// Compact freshness timeline bar — extracted from the home page's Active
// Beans list once the roaster detail page's bag list needed it too.

export default function MiniFreshnessBar({ days, peakStart, peakEnd }: {
  days: number; peakStart: number; peakEnd: number;
}) {
  const mid = (peakStart + peakEnd) / 2;
  const total = Math.max(peakEnd + 15, days + 5);
  const clamp = (d: number) => Math.min(Math.max(d, 0), total);
  const seg = (from: number, to: number) =>
    ((clamp(to) - clamp(from)) / total * 100).toFixed(2) + "%";
  const todayPct = (clamp(days) / total * 100).toFixed(2) + "%";

  return (
    <div style={{ position: "relative", height: 6, borderRadius: 3, overflow: "hidden", display: "flex" }}>
      <div style={{ flexShrink: 0, width: seg(0, peakStart), backgroundColor: "#8E8E93", opacity: 0.35 }} />
      <div style={{ flexShrink: 0, width: seg(peakStart, mid), backgroundColor: "#30D158", opacity: 0.75 }} />
      <div style={{ flexShrink: 0, width: seg(mid, peakEnd), backgroundColor: "#248A3D", opacity: 0.75 }} />
      <div style={{ flexShrink: 0, width: seg(peakEnd, peakEnd + 10), backgroundColor: "#FF9500", opacity: 0.75 }} />
      <div style={{ flexShrink: 0, width: seg(peakEnd + 10, total), backgroundColor: "#FF3B30", opacity: 0.75 }} />
      <div style={{
        position: "absolute", left: todayPct, top: 0, bottom: 0, width: 2,
        backgroundColor: "white", transform: "translateX(-50%)", borderRadius: 1,
        boxShadow: "0 0 3px rgba(0,0,0,0.5)",
      }} />
    </div>
  );
}
