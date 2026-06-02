"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "auto" | "dark";

const STORAGE_KEY = "yield-theme";

function applyTheme(theme: Theme) {
  if (theme === "auto") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "auto", label: "Auto" },
  { value: "dark", label: "Dark" },
];

export default function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") setTheme(stored);
    } catch {}
  }, []);

  function select(t: Theme) {
    setTheme(t);
    try {
      if (t === "auto") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    applyTheme(t);
  }

  return (
    <div className="flex gap-2 px-6 py-3">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => select(o.value)}
          className="flex-1 py-1.5 rounded-xl text-[15px] font-medium transition-colors"
          style={{
            backgroundColor: theme === o.value ? "var(--accent)" : "var(--card-secondary)",
            color: theme === o.value ? "#fff" : "var(--text-primary)",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
