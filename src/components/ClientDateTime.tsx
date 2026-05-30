"use client";

export default function ClientDateTime({ iso, dateOnly }: { iso: string; dateOnly?: boolean }) {
  const d = new Date(iso);
  return (
    <>
      {dateOnly
        ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        : d.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
    </>
  );
}
