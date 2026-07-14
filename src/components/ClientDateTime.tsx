"use client";

// Hand-rolled formatting instead of toLocaleString/Intl — Node's ICU data has
// changed the en-US date/time separator (comma vs. "at") across versions, so
// relying on it caused SSR/hydration text mismatches when server and browser
// used different ICU data.
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function formatTime(d: Date): string {
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  const hours = d.getHours() % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

export default function ClientDateTime({ iso, dateOnly }: { iso: string; dateOnly?: boolean }) {
  const d = new Date(iso);
  return <>{dateOnly ? formatDate(d) : `${formatDate(d)}, ${d.getFullYear()}, ${formatTime(d)}`}</>;
}
