"use client";

export default function PillRating({
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
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value !== null && n <= value;
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
              color: active ? "var(--accent)" : "var(--text-secondary)",
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
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}
