"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DuplicateModal from "./DuplicateModal";
import type { BagWithOrigins } from "@/lib/bags/queries";
import type { createBag } from "@/lib/bags/actions";

type BoundUpdateAction = (_prev: unknown, formData: FormData) => Promise<void>;
import type { Bag } from "@/db/schema";

type OriginRow = {
  country: string;
  region: string;
  farm: string;
  variety: string;
  blendPercentage: string;
};

const BLANK_ORIGIN: OriginRow = {
  country: "",
  region: "",
  farm: "",
  variety: "",
  blendPercentage: "",
};

const ROAST_LEVELS = [
  { value: "unspecified", label: "Unspecified" },
  { value: "light", label: "Light" },
  { value: "medium_light", label: "Medium Light" },
  { value: "medium", label: "Medium" },
  { value: "medium_dark", label: "Medium Dark" },
  { value: "dark", label: "Dark" },
];

const PROCESSING_METHODS = [
  { value: "unspecified", label: "Unspecified" },
  { value: "washed", label: "Washed" },
  { value: "natural", label: "Natural" },
  { value: "honey", label: "Honey" },
  { value: "anaerobic", label: "Anaerobic" },
  { value: "ea_washed", label: "EA Washed (Decaf)" },
  { value: "swiss_water", label: "Swiss Water (Decaf)" },
  { value: "other", label: "Other" },
];

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      className="px-4 mb-2 text-[13px] font-medium uppercase tracking-wide"
      style={{ color: "var(--text-secondary)" }}
    >
      {label}
    </p>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center px-4 min-h-[52px] gap-4"
      style={{ color: "var(--text-primary)" }}
    >
      <span className="text-[17px] flex-shrink-0 w-36">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="ml-4"
      style={{ height: "1px", backgroundColor: "var(--divider)" }}
    />
  );
}

function GroupedCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-4 rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {children}
    </div>
  );
}

function Toggle({
  name,
  checked,
  onChange,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <>
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0"
        style={{ backgroundColor: checked ? "var(--accent)" : "var(--divider)" }}
      >
        <span
          className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
    </>
  );
}

export default function BagFormClient({
  mode,
  initialData,
  createAction,
  updateAction,
}: {
  mode: "add" | "edit";
  initialData?: BagWithOrigins;
  createAction: typeof createBag;
  updateAction?: BoundUpdateAction;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [isBlend, setIsBlend] = useState(initialData?.isBlend ?? false);
  const [isDecaf, setIsDecaf] = useState(initialData?.isDecaf ?? false);
  const [origins, setOrigins] = useState<OriginRow[]>(
    initialData?.origins?.length
      ? initialData.origins.map((o) => ({
          country: o.country,
          region: o.region ?? "",
          farm: o.farm ?? "",
          variety: o.variety ?? "",
          blendPercentage: o.blendPercentage?.toString() ?? "",
        }))
      : [{ ...BLANK_ORIGIN }]
  );
  const [duplicateBag, setDuplicateBag] = useState<Bag | null>(null);
  const [forceMode, setForceMode] = useState<"replace" | "addNew" | null>(null);

  const action = mode === "edit" && updateAction ? updateAction : createAction;

  const [, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      formData.set("origins", JSON.stringify(origins));
      formData.set("isBlend", isBlend ? "true" : "false");
      formData.set("isDecaf", isDecaf ? "true" : "false");

      if (forceMode === "replace" && duplicateBag) {
        formData.set("force", "true");
        formData.set("replaceId", String(duplicateBag.id));
      } else if (forceMode === "addNew") {
        formData.set("force", "true");
      }

      const result = await action(_prev, formData);

      if (result && "duplicate" in result) {
        setDuplicateBag(result.duplicate);
        return result;
      }

      if (result && "success" in result) {
        router.push(`/bags/${result.id}`);
      }

      return result;
    },
    null
  );

  const handleReplace = () => {
    setForceMode("replace");
    setDuplicateBag(null);
    formRef.current?.requestSubmit();
  };

  const handleAddNew = () => {
    setForceMode("addNew");
    setDuplicateBag(null);
    formRef.current?.requestSubmit();
  };

  const updateOrigin = (
    index: number,
    field: keyof OriginRow,
    value: string
  ) => {
    setOrigins((prev) =>
      prev.map((o, i) => (i === index ? { ...o, [field]: value } : o))
    );
  };

  const addOrigin = () => {
    if (origins.length < 10) setOrigins((prev) => [...prev, { ...BLANK_ORIGIN }]);
  };

  const removeOrigin = (index: number) => {
    setOrigins((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {duplicateBag && (
        <DuplicateModal
          duplicate={duplicateBag}
          onReplace={handleReplace}
          onAddNew={handleAddNew}
          onCancel={() => setDuplicateBag(null)}
        />
      )}

      <form ref={formRef} action={formAction} className="pb-32">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pt-4 pb-4 sticky top-0 z-10"
          style={{ backgroundColor: "var(--bg)" }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-1.5 rounded-full text-[15px] font-medium"
            style={{
              backgroundColor: "var(--card-secondary)",
              color: "var(--text-primary)",
            }}
          >
            Cancel
          </button>
          <h1
            className="text-[17px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {mode === "add" ? "New Bag" : "Edit Bag"}
          </h1>
          <div className="w-16" />
        </div>

        <div className="flex flex-col gap-6">
          {/* Coffee Details */}
          <div>
            <SectionHeader label="Coffee" />
            <GroupedCard>
              <FieldRow label="Roaster">
                <input
                  name="roaster"
                  type="text"
                  required
                  defaultValue={initialData?.roaster ?? ""}
                  placeholder="e.g. Metric"
                  className="text-right w-full bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
                  style={{ color: "var(--text-primary)" }}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Name">
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={initialData?.name ?? ""}
                  placeholder="e.g. Ándale Market"
                  className="text-right w-full bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
                  style={{ color: "var(--text-primary)" }}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Roast Level">
                <select
                  name="roastLevel"
                  defaultValue={initialData?.roastLevel ?? "unspecified"}
                  className="bg-transparent outline-none text-[17px] text-right appearance-none pr-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {ROAST_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <span style={{ color: "var(--text-secondary)" }}>›</span>
              </FieldRow>
              <Divider />
              <FieldRow label="Process">
                <select
                  name="processingMethod"
                  defaultValue={
                    initialData?.processingMethod ?? "unspecified"
                  }
                  className="bg-transparent outline-none text-[17px] text-right appearance-none pr-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {PROCESSING_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <span style={{ color: "var(--text-secondary)" }}>›</span>
              </FieldRow>
            </GroupedCard>
          </div>

          {/* Properties */}
          <div>
            <SectionHeader label="Properties" />
            <GroupedCard>
              <FieldRow label="Blend">
                <Toggle
                  name="isBlend"
                  checked={isBlend}
                  onChange={setIsBlend}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Decaf">
                <Toggle
                  name="isDecaf"
                  checked={isDecaf}
                  onChange={setIsDecaf}
                />
              </FieldRow>
            </GroupedCard>
          </div>

          {/* Dates & Purchase */}
          <div>
            <SectionHeader label="Dates & Purchase" />
            <GroupedCard>
              <FieldRow label="Roast Date">
                <input
                  name="roastDate"
                  type="date"
                  required
                  defaultValue={initialData?.roastDate ?? ""}
                  className="bg-transparent outline-none text-[17px] text-right"
                  style={{ color: "var(--text-secondary)" }}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Purchase Date">
                <input
                  name="purchaseDate"
                  type="date"
                  defaultValue={initialData?.purchaseDate ?? ""}
                  className="bg-transparent outline-none text-[17px] text-right"
                  style={{ color: "var(--text-secondary)" }}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Shop">
                <input
                  name="purchaseShop"
                  type="text"
                  defaultValue={initialData?.purchaseShop ?? ""}
                  placeholder="Where you bought it"
                  className="text-right w-full bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
                  style={{ color: "var(--text-primary)" }}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Price">
                <input
                  name="price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  defaultValue={initialData?.price ?? ""}
                  placeholder="0.00"
                  className="text-right w-24 bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
                  style={{ color: "var(--text-primary)" }}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Weight (g)">
                <input
                  name="weightG"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  defaultValue={initialData?.weightG ?? ""}
                  placeholder="250"
                  className="text-right w-24 bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
                  style={{ color: "var(--text-primary)" }}
                />
              </FieldRow>
            </GroupedCard>
          </div>

          {/* Origins */}
          <div>
            <SectionHeader label="Origins" />
            <div className="mx-4 flex flex-col gap-3">
              {origins.map((origin, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: "var(--card)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}
                >
                  {/* Origin header */}
                  <div
                    className="flex items-center justify-between px-4 py-2"
                    style={{ borderBottom: "1px solid var(--divider)" }}
                  >
                    <span
                      className="text-[13px] font-medium uppercase tracking-wide"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Origin {i + 1}
                    </span>
                    {origins.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrigin(i)}
                        className="text-[13px]"
                        style={{ color: "var(--destructive)" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Country */}
                  <div className="flex items-center px-4 min-h-[52px] gap-4">
                    <span
                      className="text-[17px] flex-shrink-0 w-28"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Country
                    </span>
                    <input
                      type="text"
                      value={origin.country}
                      onChange={(e) =>
                        updateOrigin(i, "country", e.target.value)
                      }
                      placeholder="e.g. Colombia"
                      required={i === 0}
                      className="flex-1 text-right bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>

                  <div
                    className="ml-4"
                    style={{
                      height: "1px",
                      backgroundColor: "var(--divider)",
                    }}
                  />

                  {/* Region */}
                  <div className="flex items-center px-4 min-h-[52px] gap-4">
                    <span
                      className="text-[17px] flex-shrink-0 w-28"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Region
                    </span>
                    <input
                      type="text"
                      value={origin.region}
                      onChange={(e) =>
                        updateOrigin(i, "region", e.target.value)
                      }
                      placeholder="Optional"
                      className="flex-1 text-right bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
                      style={{ color: "var(--text-secondary)" }}
                    />
                  </div>

                  <div
                    className="ml-4"
                    style={{
                      height: "1px",
                      backgroundColor: "var(--divider)",
                    }}
                  />

                  {/* Variety */}
                  <div className="flex items-center px-4 min-h-[52px] gap-4">
                    <span
                      className="text-[17px] flex-shrink-0 w-28"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Variety
                    </span>
                    <input
                      type="text"
                      value={origin.variety}
                      onChange={(e) =>
                        updateOrigin(i, "variety", e.target.value)
                      }
                      placeholder="Optional"
                      className="flex-1 text-right bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
                      style={{ color: "var(--text-secondary)" }}
                    />
                  </div>

                  {isBlend && (
                    <>
                      <div
                        className="ml-4"
                        style={{
                          height: "1px",
                          backgroundColor: "var(--divider)",
                        }}
                      />
                      <div className="flex items-center px-4 min-h-[52px] gap-4">
                        <span
                          className="text-[17px] flex-shrink-0 w-28"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Blend %
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="100"
                          value={origin.blendPercentage}
                          onChange={(e) =>
                            updateOrigin(i, "blendPercentage", e.target.value)
                          }
                          placeholder="Optional"
                          className="flex-1 text-right bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
                          style={{ color: "var(--text-secondary)" }}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}

              {origins.length < 10 && (
                <button
                  type="button"
                  onClick={addOrigin}
                  className="w-full py-3 rounded-xl text-[17px] font-medium"
                  style={{
                    backgroundColor: "var(--card)",
                    color: "var(--accent)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}
                >
                  + Add Origin
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <SectionHeader label="Notes" />
            <div
              className="mx-4 rounded-xl overflow-hidden"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <textarea
                name="notes"
                defaultValue={initialData?.notes ?? ""}
                placeholder="Tasting notes, coordinates, anything…"
                rows={4}
                className="w-full px-4 py-3 bg-transparent outline-none text-[17px] resize-none placeholder:text-[var(--text-secondary)]"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>
        </div>

        {/* Sticky Save */}
        <div
          className="fixed bottom-0 left-0 right-0 px-4"
          style={{
            paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
            backgroundColor: "var(--bg)",
          }}
        >
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-4 rounded-xl text-[17px] font-medium transition-opacity disabled:opacity-50"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--accent)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            {isPending ? "Saving…" : "Save Bag"}
          </button>
        </div>
      </form>
    </>
  );
}
