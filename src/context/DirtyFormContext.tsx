"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

type DirtyFormContextType = {
  isDirty: boolean;
  setDirty: (v: boolean) => void;
  requestNavigation: (proceed: () => void) => void;
};

const DirtyFormContext = createContext<DirtyFormContextType>({
  isDirty: false,
  setDirty: () => {},
  requestNavigation: (proceed) => proceed(),
});

export function useDirtyForm() {
  return useContext(DirtyFormContext);
}

export function DirtyFormProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<(() => void) | null>(null);

  const setDirty = useCallback((v: boolean) => setIsDirty(v), []);

  const requestNavigation = useCallback(
    (proceed: () => void) => {
      if (!isDirty) {
        proceed();
        return;
      }
      setPendingNavigate(() => proceed);
    },
    [isDirty]
  );

  // Warn on browser close / refresh
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const confirmLeave = () => {
    setIsDirty(false);
    const navigate = pendingNavigate;
    setPendingNavigate(null);
    navigate?.();
  };

  const cancelLeave = () => setPendingNavigate(null);

  return (
    <DirtyFormContext.Provider value={{ isDirty, setDirty, requestNavigation }}>
      {children}

      {pendingNavigate && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)", paddingBottom: "env(safe-area-inset-bottom)" }}
          onClick={cancelLeave}
        >
          <div
            className="w-full rounded-t-3xl px-4 pt-6 pb-8 flex flex-col gap-3"
            style={{
              maxWidth: 480,
              backgroundColor: "var(--card)",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-1">
              <p className="text-[17px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Leave without saving?
              </p>
              <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
                Your shot details will be lost.
              </p>
            </div>

            <button
              type="button"
              onClick={confirmLeave}
              className="w-full py-3.5 rounded-2xl text-[17px] font-semibold active:opacity-70"
              style={{ backgroundColor: "var(--destructive)", color: "white" }}
            >
              Leave
            </button>

            <button
              type="button"
              onClick={cancelLeave}
              className="w-full py-3.5 rounded-2xl text-[17px] font-medium active:opacity-70"
              style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-primary)" }}
            >
              Keep editing
            </button>
          </div>
        </div>
      )}
    </DirtyFormContext.Provider>
  );
}
