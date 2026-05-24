"use client";

import { markBagFinished, removeBag, reactivateBag } from "@/lib/bags/actions";

export default function BagActions({
  bagId,
  status,
}: {
  bagId: number;
  status: "active" | "finished" | "removed";
}) {
  const handleFinish = async () => {
    if (!confirm("Mark this bag as finished?")) return;
    await markBagFinished(bagId);
  };

  const handleRemove = async () => {
    if (!confirm("Remove this bag? It will no longer appear in your list."))
      return;
    await removeBag(bagId);
  };

  const handleReactivate = async () => {
    await reactivateBag(bagId);
  };

  return (
    <div className="px-4 pb-8 flex flex-col gap-3">
      {status === "active" && (
        <>
          <button
            onClick={handleFinish}
            className="w-full py-4 rounded-xl text-[17px] font-medium"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--warning)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            Mark as Finished
          </button>
          <button
            onClick={handleRemove}
            className="w-full py-4 rounded-xl text-[17px] font-medium"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--destructive)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            Remove Bag
          </button>
        </>
      )}
      {status === "finished" && (
        <>
          <button
            onClick={handleReactivate}
            className="w-full py-4 rounded-xl text-[17px] font-medium"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--accent)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            Reactivate
          </button>
          <button
            onClick={handleRemove}
            className="w-full py-4 rounded-xl text-[17px] font-medium"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--destructive)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            Remove Bag
          </button>
        </>
      )}
    </div>
  );
}
