"use client";

import { usePathname, useRouter } from "next/navigation";
import { useDirtyForm } from "@/context/DirtyFormContext";

const tabs = [
  {
    href: "/home",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      </svg>
    ),
  },
  {
    href: "/bags",
    label: "Bags",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        {/* bag body — rounded bottom corners only */}
        <path d="M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9z" />
        {/* sealed/crimped top — matches home icon width x=3–21 */}
        <path d="M3 5h18l-1 4H4L3 5z" />
        {/* degassing valve */}
        <circle cx="12" cy="15" r="2.5" />
        <circle cx="12" cy="15" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/log",
    label: "Log",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 5h15l-3 15H7.5L4.5 5z" />
        <path d="M18 9h1.5a2.5 2.5 0 0 1 0 5h-1.5" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "History",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 15" />
      </svg>
    ),
  },
  {
    href: "/more/stats",
    label: "Stats",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4v16h18" />
        <polyline points="6 16 10 11 14 13 19 6" />
        <circle cx="6" cy="16" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="10" cy="11" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="14" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="19" cy="6" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/more",
    label: "More",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { requestNavigation } = useDirtyForm();

  return (
    <div
      className="fixed-col bottom-0 flex justify-center z-50"
      style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}
    >
      <nav
        className="flex items-center gap-1 px-3 py-2 rounded-[28px] shadow-xl"
        style={{
          backgroundColor: "var(--tab-bar-bg)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        {tabs.map((tab) => {
          const active = tab.href === "/more"
            ? pathname.startsWith("/more") && !pathname.startsWith("/more/stats")
            : pathname.startsWith(tab.href);
          return (
            <button
              key={tab.href}
              type="button"
              onClick={() => requestNavigation(() => router.push(tab.href))}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[58px] min-h-[52px] rounded-[20px] px-2.5 transition-colors"
              style={{
                backgroundColor: active ? "var(--tab-active-bg)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              {tab.icon(active)}
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
