"use client";

export default function ShotStarRating({
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
    <div className="flex items-center justify-center gap-5 w-full mb-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange(n === value ? 0 : n)}
          className="text-[34px] leading-none transition-opacity active:opacity-70"
          style={{
            color: value !== null && n <= value ? "#FF9500" : "var(--card-secondary)",
            cursor: readOnly ? "default" : "pointer",
          }}
        >
          ★
        </button>
      ))}
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}
