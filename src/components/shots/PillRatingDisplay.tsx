export default function PillRatingDisplay({
  value,
  name,
}: {
  value: number | null;
  name: string;
}) {
  return (
    <div className="flex gap-[2px]" style={{ height: 52 }} aria-label={`${name}: ${value ?? "unset"}`}>
      {[1, 2, 3, 4, 5].map((n, i) => (
        <div
          key={n}
          style={{
            flex: 1,
            borderRadius:
              i === 0 ? "12px 4px 4px 12px" : i === 4 ? "4px 12px 12px 4px" : 4,
            backgroundColor:
              value !== null && n <= value ? "var(--accent)" : "var(--card-secondary)",
          }}
        />
      ))}
    </div>
  );
}
