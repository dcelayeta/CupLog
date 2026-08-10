"use client";

import { deleteRoaster } from "@/lib/roasters/actions";

export default function RoasterDeleteButton({ roasterId, bagCount }: { roasterId: number; bagCount: number }) {
  const handleDelete = async () => {
    const message = bagCount > 0
      ? `Delete this roaster? ${bagCount} linked bag${bagCount === 1 ? "" : "s"} will keep their existing roaster name but no longer be linked.`
      : "Delete this roaster?";
    if (!confirm(message)) return;
    await deleteRoaster(roasterId);
  };

  return (
    <div className="px-4 pt-6 pb-8 flex flex-col items-center">
      <button
        onClick={handleDelete}
        className="text-[15px] font-medium"
        style={{ color: "var(--destructive)" }}
      >
        Delete Roaster
      </button>
    </div>
  );
}
