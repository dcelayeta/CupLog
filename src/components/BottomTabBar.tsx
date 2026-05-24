"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/log",
    label: "Log",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        {/* espresso cup */}
        <path d="M6 7h12l-1.5 9H7.5L6 7z" />
        <path d="M16 10h2a2 2 0 0 1 0 4h-2" />
        <path d="M4 20h16" />
      </svg>
    ),
  },
  {
    href: "/bags",
    label: "Bags",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        {/* bag / sack */}
        <path d="M6 2h12l2 6H4L6 2z" />
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M9 12h6" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "History",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 15" />
      </svg>
    ),
  },
  {
    href: "/more",
    label: "More",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex justify-center"
      style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
    >
      <nav
        className="flex items-center gap-1 px-2 py-2 rounded-[24px] shadow-lg"
        style={{ backgroundColor: "var(--tab-bar-bg)" }}
      >
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[52px] rounded-[18px] px-3 transition-colors"
              style={{
                backgroundColor: active ? "var(--tab-active-bg)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              {tab.icon(active)}
              <span className="text-[11px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
