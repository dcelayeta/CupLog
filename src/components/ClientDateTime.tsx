"use client";

export default function ClientDateTime({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <>
      {d.toLocaleString("en-US", {
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
