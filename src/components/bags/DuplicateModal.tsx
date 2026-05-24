"use client";

import type { Bag } from "@/db/schema";

export default function DuplicateModal({
  duplicate,
  onReplace,
  onAddNew,
  onCancel,
}: {
  duplicate: Bag;
  onReplace: () => void;
  onAddNew: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3">
          <p
            className="text-[17px] font-semibold text-center"
            style={{ color: "var(--text-primary)" }}
          >
            Bag already exists
          </p>
          <p
            className="text-[14px] text-center mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {duplicate.roaster} — {duplicate.name} is already in your{" "}
            {duplicate.status} bags.
          </p>
        </div>

        <div
          className="mx-4 mb-3"
          style={{ height: "1px", backgroundColor: "var(--divider)" }}
        />

        {/* Actions */}
        <div className="px-4 pb-5 flex flex-col gap-2">
          <button
            onClick={onReplace}
            className="w-full py-3 rounded-xl text-[17px] font-medium"
            style={{
              backgroundColor: "var(--card-secondary)",
              color: "var(--destructive)",
            }}
          >
            Replace — mark existing as finished
          </button>
          <button
            onClick={onAddNew}
            className="w-full py-3 rounded-xl text-[17px] font-medium"
            style={{
              backgroundColor: "var(--card-secondary)",
              color: "var(--accent)",
            }}
          >
            Add as new bag
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-xl text-[17px] font-medium"
            style={{
              backgroundColor: "var(--card-secondary)",
              color: "var(--text-primary)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
