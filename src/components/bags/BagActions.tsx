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
    <div className="px-4 pb-8 flex flex-col items-center gap-4">
      {status === "active" && (
        <>
          <button
            onClick={handleFinish}
            className="text-[15px] font-medium"
            style={{ color: "var(--warning)" }}
          >
            Mark as Finished
          </button>
          <button
            onClick={handleRemove}
            className="text-[15px] font-medium"
            style={{ color: "var(--destructive)" }}
          >
            Delete Bag
          </button>
        </>
      )}
      {status === "finished" && (
        <>
          <button
            onClick={handleReactivate}
            className="text-[15px] font-medium"
            style={{ color: "var(--accent)" }}
          >
            Reactivate
          </button>
          <button
            onClick={handleRemove}
            className="text-[15px] font-medium"
            style={{ color: "var(--destructive)" }}
          >
            Delete Bag
          </button>
        </>
      )}
    </div>
  );
}
