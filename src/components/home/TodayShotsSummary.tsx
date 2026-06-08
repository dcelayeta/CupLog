"use client";

export default function TodayShotsSummary({
  totalShots,
  recentShots,
}: {
  totalShots: number;
  recentShots: { pulledAt: string }[];
}) {
  if (totalShots === 0) return <>No shots logged yet.</>;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayCount = recentShots.filter((s) => new Date(s.pulledAt) >= todayStart).length;

  return (
    <>
      {totalShots} shot{totalShots !== 1 ? "s" : ""}
      {todayCount > 0 && ` (${todayCount} today)`}
    </>
  );
}
