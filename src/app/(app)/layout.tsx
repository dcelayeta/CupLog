import BottomTabBar from "@/components/BottomTabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh bg-[var(--bg)]">
      <main className="flex-1 pb-[calc(80px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
