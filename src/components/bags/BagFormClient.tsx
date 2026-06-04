"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DuplicateModal from "./DuplicateModal";
import AIEntryPanel from "./AIEntryPanel";
import type { BagWithOrigins } from "@/lib/bags/queries";
import type { createBag } from "@/lib/bags/actions";
import type { ParsedBagData } from "@/lib/bags/parseWithAI";
import type { Bag } from "@/db/schema";

type BoundUpdateAction = (_prev: unknown, formData: FormData) => Promise<void>;

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

function StepperInput({
  name,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
}: {
  name?: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const decimals = step.toString().includes(".") ? step.toString().split(".")[1].length : 0;
  const num = parseFloat(value) || 0;
  const adjust = (delta: number) => {
    const next = Math.max(min, Math.min(max, Math.round((num + delta) * 1000) / 1000));
    onChange(next === 0 && value === "" ? "" : next.toFixed(decimals));
  };
  return (
    <div className="flex items-center gap-1">
      {name && <input type="hidden" name={name} value={value} />}
      <button type="button" onPointerDown={() => adjust(-step)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-[20px] font-light select-none"
        style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-primary)" }}>
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-center outline-none bg-transparent text-[17px] w-[44px]"
        style={{ color: "var(--text-primary)" }}
      />
      <button type="button" onPointerDown={() => adjust(step)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-[20px] font-light select-none"
        style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-primary)" }}>
        +
      </button>
    </div>
  );
}

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
      className="flex items-center px-6 min-h-[52px] gap-4"
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
      className="mx-4 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
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
        className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
        style={{ backgroundColor: checked ? "var(--accent)" : "var(--divider)" }}
      >
        <span
          className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transition-all duration-200 mt-[2px]"
          style={{ marginLeft: checked ? 22 : 2 }}
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

  // aiData + formKey: when AI parses data, we bump formKey to remount
  // uncontrolled inputs so their defaultValues pick up the new data
  const [aiData, setAiData] = useState<ParsedBagData | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [dialInTip, setDialInTip] = useState<string | null>(null);
  const [isTipLoading, setIsTipLoading] = useState(false);

  // Active data source: AI result takes priority over initialData
  const activeData = aiData ?? initialData;

  const [isBlend, setIsBlend] = useState(activeData?.isBlend ?? false);
  const [isDecaf, setIsDecaf] = useState(activeData?.isDecaf ?? false);
  const [price, setPrice] = useState(activeData?.price != null ? String(activeData.price) : "");
  const [weightG, setWeightG] = useState(activeData?.weightG != null ? String(activeData.weightG) : "");
  const [weightCorrectionG, setWeightCorrectionG] = useState(String(initialData?.weightCorrectionG ?? 0));
  const [peakStartDay, setPeakStartDay] = useState(initialData?.peakStartDay != null ? String(initialData.peakStartDay) : "");
  const [peakEndDay, setPeakEndDay] = useState(initialData?.peakEndDay != null ? String(initialData.peakEndDay) : "");
  const [origins, setOrigins] = useState<OriginRow[]>(
    activeData?.origins?.length
      ? activeData.origins.map((o) => ({
          country: o.country,
          region: o.region ?? "",
          farm: o.farm ?? "",
          variety: o.variety ?? "",
          blendPercentage: ("blendPercentage" in o ? o.blendPercentage?.toString() : "") ?? "",
        }))
      : [{ ...BLANK_ORIGIN }]
  );

  const handleAIParsed = (data: ParsedBagData) => {
    setAiData(data);
    setIsBlend(data.isBlend ?? false);
    setIsDecaf(data.isDecaf ?? false);
    setOrigins(
      data.origins?.length
        ? data.origins.map((o) => ({
            country: o.country ?? "",
            region: o.region ?? "",
            farm: o.farm ?? "",
            variety: o.variety ?? "",
            blendPercentage: o.blendPercentage?.toString() ?? "",
          }))
        : [{ ...BLANK_ORIGIN }]
    );
    if (data.price != null) setPrice(String(data.price));
    if (data.weightG != null) setWeightG(String(data.weightG));
    setFormKey((k) => k + 1); // remount uncontrolled inputs
  };
  const [duplicateBag, setDuplicateBag] = useState<Bag | null>(null);
  const [isModalPending, startModalTransition] = useTransition();

  const action = mode === "edit" && updateAction ? updateAction : createAction;

  const [, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      formData.set("origins", JSON.stringify(origins));
      formData.set("isBlend", isBlend ? "true" : "false");
      formData.set("isDecaf", isDecaf ? "true" : "false");

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

  const buildFormData = (overrides: Record<string, string> = {}) => {
    const formData = formRef.current ? new FormData(formRef.current) : new FormData();
    formData.set("origins", JSON.stringify(origins));
    formData.set("isBlend", isBlend ? "true" : "false");
    formData.set("isDecaf", isDecaf ? "true" : "false");
    for (const [k, v] of Object.entries(overrides)) formData.set(k, v);
    return formData;
  };

  const handleReplace = () => {
    if (!duplicateBag) return;
    const formData = buildFormData({ force: "true", replaceId: String(duplicateBag.id) });
    setDuplicateBag(null);
    startModalTransition(async () => {
      const result = await createAction(null, formData);
      if (result && "success" in result) router.push(`/bags/${result.id}`);
    });
  };

  const handleAddNew = () => {
    const formData = buildFormData({ force: "true" });
    setDuplicateBag(null);
    startModalTransition(async () => {
      const result = await createAction(null, formData);
      if (result && "success" in result) router.push(`/bags/${result.id}`);
    });
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

      <form ref={formRef} action={formAction} className="pb-48">

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

        {/* AI Entry — add mode only */}
        {mode === "add" && (
          <>
            <AIEntryPanel
              onParsed={handleAIParsed}
              onTip={setDialInTip}
              onTipLoading={setIsTipLoading}
            />
            {dialInTip && <input type="hidden" name="dialInTip" value={dialInTip} />}
          </>
        )}

        <div key={formKey} className="flex flex-col gap-6">
          {/* Coffee Details */}
          <div>
            <SectionHeader label="Coffee" />
            <GroupedCard>
              <FieldRow label="Roaster">
                <input
                  name="roaster"
                  type="text"
                  required
                  defaultValue={activeData?.roaster ?? ""}
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
                  defaultValue={activeData?.name ?? ""}
                  placeholder="e.g. Ándale Market"
                  className="text-right w-full bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
                  style={{ color: "var(--text-primary)" }}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Roast Level">
                <select
                  name="roastLevel"
                  defaultValue={activeData?.roastLevel ?? "unspecified"}
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
                    activeData?.processingMethod ?? "unspecified"
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
                  defaultValue={mode === "edit" ? (initialData?.roastDate ?? "") : (aiData?.roastDate ?? "")}
                  className="bg-transparent outline-none text-[17px] text-right"
                  style={{ color: "var(--text-secondary)" }}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Purchase Date">
                <input
                  name="purchaseDate"
                  type="date"
                  defaultValue={mode === "edit" ? (initialData?.purchaseDate ?? "") : (aiData?.purchaseDate ?? "")}
                  className="bg-transparent outline-none text-[17px] text-right"
                  style={{ color: "var(--text-secondary)" }}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Shop">
                <input
                  name="purchaseShop"
                  type="text"
                  defaultValue={activeData?.purchaseShop ?? ""}
                  placeholder="Where you bought it"
                  className="text-right w-full bg-transparent outline-none text-[17px] placeholder:text-[var(--text-secondary)]"
                  style={{ color: "var(--text-primary)" }}
                />
              </FieldRow>
              <Divider />
              <FieldRow label="Price">
                <StepperInput name="price" value={price} onChange={setPrice} step={0.5} min={0} max={999} />
              </FieldRow>
              <Divider />
              <FieldRow label="Weight (g)">
                <StepperInput name="weightG" value={weightG} onChange={setWeightG} step={10} min={0} max={2000} />
              </FieldRow>
              {mode === "edit" && (
                <>
                  <Divider />
                  <FieldRow label="Correction (g)">
                    <StepperInput name="weightCorrectionG" value={weightCorrectionG} onChange={setWeightCorrectionG} step={10} min={-2000} max={2000} />
                  </FieldRow>
                  {weightG !== "" && (
                    <p className="px-6 pb-3 text-[13px] text-right" style={{ color: "var(--text-secondary)" }}>
                      Est. remaining: {Math.max(0, Number(weightG) + Number(weightCorrectionG) - (initialData?.totalDoseG ?? 0))}g
                    </p>
                  )}
                </>
              )}
            </GroupedCard>
          </div>

          {/* Peak Freshness Window */}
          <div>
            <SectionHeader label="Peak Freshness Window" />
            <GroupedCard>
              <FieldRow label="Peak Start (day)">
                <StepperInput name="peakStartDay" value={peakStartDay} onChange={setPeakStartDay} step={1} min={1} max={60} />
              </FieldRow>
              <Divider />
              <FieldRow label="Peak End (day)">
                <StepperInput name="peakEndDay" value={peakEndDay} onChange={setPeakEndDay} step={1} min={1} max={90} />
              </FieldRow>
            </GroupedCard>
            <p className="px-4 mt-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
              Leave blank to auto-estimate from roast level and process.
            </p>
          </div>

          {/* Origins */}
          <div>
            <SectionHeader label="Origins" />
            <div className="mx-4 flex flex-col gap-3">
              {origins.map((origin, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: "var(--card)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                  }}
                >
                  {/* Origin header */}
                  <div
                    className="row-divider flex items-center justify-between px-4 py-2"
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
                  <div className="flex items-center px-6 min-h-[52px] gap-4">
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
                  <div className="flex items-center px-6 min-h-[52px] gap-4">
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
                  <div className="flex items-center px-6 min-h-[52px] gap-4">
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
                      <div className="flex items-center px-6 min-h-[52px] gap-4">
                        <span
                          className="text-[17px] flex-shrink-0 w-28"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Blend %
                        </span>
                        <div className="flex-1 flex justify-end">
                          <StepperInput
                            value={origin.blendPercentage}
                            onChange={(v) => updateOrigin(i, "blendPercentage", v)}
                            step={5}
                            min={0}
                            max={100}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {origins.length < 10 && (
                <button
                  type="button"
                  onClick={addOrigin}
                  className="w-full py-3 rounded-full text-[17px] font-medium"
                  style={{
                    backgroundColor: "var(--card)",
                    color: "var(--accent)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
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
              className="mx-4 rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}
            >
              <textarea
                name="notes"
                defaultValue={activeData?.notes ?? ""}
                placeholder="Tasting notes, coordinates, anything…"
                rows={4}
                className="w-full px-4 py-3 bg-transparent outline-none text-[17px] resize-none placeholder:text-[var(--text-secondary)]"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>
        </div>

        {/* Sticky Save — sits above the floating tab bar (~80px) */}
        <div
          className="fixed left-0 right-0 px-4 pb-4 flex flex-col gap-2"
          style={{
            bottom: "calc(80px + env(safe-area-inset-bottom))",
            backgroundColor: "var(--bg)",
          }}
        >
          <button
            type="submit"
            disabled={isPending || isModalPending || isTipLoading}
            className="w-full py-4 rounded-full text-[17px] font-medium transition-opacity disabled:opacity-50"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--accent)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            }}
          >
            {isPending || isModalPending ? "Saving…" : isTipLoading ? "Getting dial-in tip…" : "Save Bag"}
          </button>
          {mode === "add" && (
            <button
              type="submit"
              name="status"
              value="reserve"
              disabled={isPending || isModalPending}
              className="w-full py-3 rounded-full text-[15px] font-medium transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "transparent", color: "var(--text-secondary)" }}
            >
              Save as Reserve
            </button>
          )}
        </div>
      </form>
    </>
  );
}
