import BottomTabBar from "@/components/BottomTabBar";
import { DirtyFormProvider } from "@/context/DirtyFormContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DirtyFormProvider>
      <div className="min-h-dvh bg-[var(--bg)] flex justify-center">
        <div className="w-full min-h-dvh" style={{ maxWidth: 480 }}>
          <main className="pb-[calc(80px+env(safe-area-inset-bottom))]">
            {children}
          </main>
          <BottomTabBar />
        </div>
      </div>
    </DirtyFormProvider>
  );
}
