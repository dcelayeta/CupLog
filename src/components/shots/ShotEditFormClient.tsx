"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteShot } from "@/lib/shots/actions";
import type { ShotDetail, BagOption } from "@/lib/shots/queries";
import { classifyTime, classifyRatio } from "@/lib/shots/classification";
import { detectDrink, detectEspressoBase, ALL_DRINK_NAMES, DRINK_DEFAULTS } from "@/lib/shots/drinkDetection";
import ClassificationBadge from "./ClassificationBadge";
import TasteBalanceControl from "./TasteBalanceControl";
import ShotStarRating from "./ShotStarRating";
import PillRating from "./PillRating";

const MILK_TYPES = ["Whole", "Oat", "Almond", "Skim", "Soy", "Coconut", "Half & Half"];

const LATTE_ART_OPTIONS = [
  { value: "pollock", label: "Pollock" },
  { value: "calder", label: "Calder" },
  { value: "picasso", label: "Picasso" },
  { value: "monet", label: "Monet" },
  { value: "van_gogh", label: "Van Gogh" },
];

const LATTE_ART_ELIGIBLE = new Set(["Cortado", "Flat White", "Cappuccino", "Latte", "Mocha", "Dirty Chai"]);

const FAIL_REASONS: { value: string; label: string }[] = [
  { value: "channeling", label: "Channeling" },
  { value: "choking", label: "Choking" },
  { value: "puck_collapse", label: "Puck Collapse" },
  { value: "grind_error", label: "Grind Error" },
  { value: "equipment_issue", label: "Equipment" },
  { value: "other", label: "Other" },
];

const FLOW_OPTIONS: { value: string; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "one_spout_dominant", label: "One spout dominant" },
  { value: "both_spouts_uneven", label: "Both spouts uneven" },
  { value: "spraying", label: "Spraying" },
  { value: "dripping_restricted", label: "Dripping / Restricted" },
  { value: "very_fast", label: "Very fast" },
];

const MAX_DRINK_ML = 300;

function LiveDrinkBar({ espressoMl, milkMl, foamMl, hotWaterMl, hasChocolate, hasIceCream, hasChai }: {
  espressoMl: number; milkMl: number; foamMl: number; hotWaterMl: number;
  hasChocolate: boolean; hasIceCream: boolean; hasChai: boolean;
}) {
  const chaiMl = hasChai ? 30 : 0;
  const chocolateMl = hasChocolate ? 10 : 0;
  const iceCreamMl = hasIceCream ? 60 : 0;
  const filled = espressoMl + chaiMl + chocolateMl + hotWaterMl + milkMl + iceCreamMl + foamMl;
  const empty = Math.max(0, MAX_DRINK_ML - filled);
  const segments = [
    { ml: espressoMl, color: "var(--drink-espresso)" },
    { ml: chaiMl, color: "var(--drink-chai)" },
    { ml: chocolateMl, color: "#79564d" },
    { ml: hotWaterMl, color: "#a0cee7" },
    { ml: milkMl, color: "#f3f2f6" },
    { ml: iceCreamMl, color: "#d2d3c4" },
    { ml: foamMl, color: "#fefce6" },
    { ml: empty, color: "#c9c9ce" },
  ].filter((s) => s.ml > 0);
  return (
    <div className="flex overflow-hidden rounded-full" style={{ height: 12 }}>
      {segments.map((seg, i) => (
        <div key={i} style={{ width: `${(seg.ml / MAX_DRINK_ML) * 100}%`, backgroundColor: seg.color, flexShrink: 0 }} />
      ))}
    </div>
  );
}

function parseNum(v: string) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
function parseIntVal(v: string) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function Row({ label, children, noDivider }: { label: string; children: React.ReactNode; noDivider?: boolean }) {
  return (
    <div className={`${noDivider ? "" : "row-divider "}flex items-center px-6 min-h-[52px]`}>
      <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function NumberInput({ name, value, onChange, placeholder, integer = false, min, max }: {
  name: string; value: string; onChange: (v: string) => void; placeholder: string;
  integer?: boolean; min?: string; max?: string;
}) {
  return (
    <input
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className="text-right outline-none bg-transparent text-[17px] w-[90px]"
      style={{ color: "var(--text-primary)" }}
    />
  );
}

function StepperInput({ name, value, onChange, step = 0.1, min = 0, max = 9.9 }: {
  name: string; value: string; onChange: (v: string) => void;
  step?: number; min?: number; max?: number;
}) {
  const decimals = step.toString().includes(".") ? step.toString().split(".")[1].length : 0;
  const num = parseFloat(value) || 0;
  const adjust = (delta: number) => {
    const next = Math.max(min, Math.min(max, Math.round((num + delta) * 1000) / 1000));
    onChange(next.toFixed(decimals));
  };
  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value} />
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

function SpringWeightInput({ name, value, onChange }: {
  name: string; value: string; onChange: (v: string) => void;
}) {
  const PRESETS = ["15", "25", "30"];
  const isManual = !PRESETS.includes(value);
  return (
    <div className="flex items-center gap-1.5">
      <input type="hidden" name={name} value={value} />
      {PRESETS.map((p) => (
        <button key={p} type="button" onPointerDown={() => onChange(p)}
          className="h-7 px-2.5 rounded-full text-[13px] font-medium select-none"
          style={{ backgroundColor: value === p ? "var(--accent)" : "var(--card-secondary)", color: value === p ? "white" : "var(--text-primary)" }}>
          {p}
        </button>
      ))}
      <button type="button" onPointerDown={() => onChange("")}
        className="h-7 px-2.5 rounded-full text-[13px] font-medium select-none"
        style={{ backgroundColor: isManual ? "var(--accent)" : "var(--card-secondary)", color: isManual ? "white" : "var(--text-primary)" }}>
        Manual
      </button>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{title}</p>
    </div>
  );
}

function DeleteButton({ shotId }: { shotId: number }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full py-3.5 rounded-full text-[17px] font-semibold"
        style={{ backgroundColor: "var(--destructive)" + "22", color: "var(--destructive)" }}
      >
        Delete Shot
      </button>
    );
  }

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="flex-1 py-3.5 rounded-full text-[17px] font-semibold"
        style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-primary)" }}
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => deleteShot(shotId))}
        className="flex-1 py-3.5 rounded-full text-[17px] font-semibold disabled:opacity-40"
        style={{ backgroundColor: "var(--destructive)", color: "#fff" }}
      >
        {pending ? "Deleting…" : "Confirm Delete"}
      </button>
    </div>
  );
}

type BoundUpdateAction = (_prev: unknown, formData: FormData) => Promise<{ error: string } | null>;

export default function ShotEditFormClient({
  shot,
  bags,
  action,
}: {
  shot: ShotDetail;
  bags: BagOption[];
  action: BoundUpdateAction;
}) {
  const [state, formAction, isPending] = useActionState(action, null);

  // Shot fields — pre-populate from existing shot
  const [bagId, setBagId] = useState(shot.bagId.toString());
  const [doseG, setDoseG] = useState(shot.doseG.toString());
  const [yieldG, setYieldG] = useState(shot.yieldG?.toString() ?? "");
  const [shotTimeSeconds, setShotTimeSeconds] = useState(shot.shotTimeSeconds?.toString() ?? "");
  const [grindSetting, setGrindSetting] = useState(shot.grindSetting?.toString() ?? "");
  const [lagG, setLagG] = useState(shot.lagG?.toString() ?? "");
  const [preinfusionSeconds, setPreinfusionSeconds] = useState(shot.preinfusionSeconds?.toString() ?? "");
  const [springWeightLbs, setSpringWeightLbs] = useState(shot.springWeightLbs?.toString() ?? "");
  const [wdtUsed, setWdtUsed] = useState(shot.wdtUsed);
  const [isLocked, setIsLocked] = useState(shot.isLocked);
  const [distributionToolUsed, setDistributionToolUsed] = useState(shot.distributionToolUsed);
  const [grinderRetentionG, setGrinderRetentionG] = useState(shot.grinderRetentionG?.toString() ?? "");

  // Taste
  const [tasteBalance, setTasteBalance] = useState<number | null>(shot.tasteBalance);
  const [shotRating, setShotRating] = useState<number | null>(shot.shotRating);
  const [flowCharacteristics, setFlowCharacteristics] = useState<string | null>(shot.flowCharacteristics ?? null);
  const [notes, setNotes] = useState(shot.notes ?? "");

  // Drink
  const [includeDrink, setIncludeDrink] = useState(shot.drink !== null);
  const [milkType, setMilkType] = useState(shot.drink?.milkType ?? "");
  const [milkQuantityMl, setMilkQuantityMl] = useState(shot.drink?.milkQuantityMl?.toString() ?? "");
  const [foamMl, setFoamMl] = useState(shot.drink?.foamMl?.toString() ?? "");
  const [hotWaterMl, setHotWaterMl] = useState(shot.drink?.hotWaterMl?.toString() ?? "");
  const [hasChocolate, setHasChocolate] = useState(false);
  const [hasIceCream, setHasIceCream] = useState(false);
  const [hasChai, setHasChai] = useState(false);
  const [isIced, setIsIced] = useState(shot.drink?.isIced ?? false);
  const [manualDrinkName, setManualDrinkName] = useState<string | null>(shot.drink?.detectedDrinkName ?? null);
  const [showDrinkPicker, setShowDrinkPicker] = useState(false);
  const [overallRating, setOverallRating] = useState<number | null>(shot.drink?.overallRating ?? null);
  const [drinkNotes, setDrinkNotes] = useState(shot.drink?.notes ?? "");
  const [latteArtRating, setLatteArtRating] = useState<string | null>(shot.drink?.latteArtRating ?? null);

  // Failed shot
  const [isFailed, setIsFailed] = useState(shot.isFailed);
  const [failReason, setFailReason] = useState(shot.failReason ?? "");

  // Date / time
  const [pulledAt, setPulledAt] = useState(() => {
    const d = new Date(shot.pulledAt);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  // Live preview
  const dose = parseNum(doseG);
  const yield_ = parseNum(yieldG);
  const retention = parseNum(grinderRetentionG);
  const adjDose = dose !== null && retention !== null ? dose - retention : null;
  const effectiveDose = adjDose ?? dose;
  const liveRatioDerived = effectiveDose && yield_ ? yield_ / effectiveDose : null;
  const liveRatio = liveRatioDerived ? liveRatioDerived.toFixed(2) : null;
  const liveTime = parseIntVal(shotTimeSeconds);
  const liveLagG = parseNum(lagG);
  const stoppedAtG = yield_ !== null && liveLagG !== null ? yield_ - liveLagG : null;
  const timeClass = liveTime !== null ? classifyTime(liveTime) : null;
  const ratioClass = liveRatioDerived !== null ? classifyRatio(liveRatioDerived) : null;

  // Live drink detection
  const liveBase = dose && yield_ ? detectEspressoBase(dose, yield_) : null;
  const liveDrink = includeDrink
    ? (() => {
        if (!dose || !yield_) return null;
        if (manualDrinkName) return manualDrinkName;
        return detectDrink({
          doseG: dose,
          yieldG: yield_,
          milkMl: parseNum(milkQuantityMl),
          foamMl: parseNum(foamMl),
          hotWaterMl: parseNum(hotWaterMl),
          hasChocolate,
          hasIceCream,
          hasChai,
        });
      })()
    : null;

  const selectedBag = bags.find((b) => b.id.toString() === bagId);

  return (
    <>
      <form action={formAction} className="pb-40">
        {/* Hidden fields */}
        <input type="hidden" name="bagId" value={bagId} />
        <input type="hidden" name="bagRoastDate" value={selectedBag?.roastDate ?? ""} />
        <input type="hidden" name="wdtUsed" value={wdtUsed ? "true" : "false"} />
        <input type="hidden" name="isLocked" value={isLocked ? "true" : "false"} />
        <input type="hidden" name="distributionToolUsed" value={distributionToolUsed ? "true" : "false"} />
        <input type="hidden" name="flowCharacteristics" value={flowCharacteristics ?? ""} />
        <input type="hidden" name="includeDrink" value={(!isFailed && includeDrink) ? "true" : "false"} />
        <input type="hidden" name="isFailed" value={isFailed ? "true" : "false"} />
        {isFailed && failReason && <input type="hidden" name="failReason" value={failReason} />}
        {/* Bag */}
        <SectionHeader title="Bean" />
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center px-6 min-h-[52px]">
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Bag</span>
            <select value={bagId} onChange={(e) => setBagId(e.target.value)} className="text-right outline-none bg-transparent text-[17px] max-w-[200px]" style={{ color: "var(--accent)" }}>
              {bags.map((b) => <option key={b.id} value={b.id}>{b.roaster} · {b.name}</option>)}
            </select>
          </div>
        </div>

        {/* Shot */}
        <SectionHeader title="Shot" />
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>

          {/* Date */}
          <Row label="Date & Time">
            <input
              type="datetime-local"
              value={pulledAt}
              onChange={(e) => setPulledAt(e.target.value)}
              className="text-right outline-none bg-transparent text-[17px]"
              style={{ color: "var(--accent)" }}
            />
            <input type="hidden" name="pulledAt" value={pulledAt ? new Date(pulledAt).toISOString() : ""} />
          </Row>

          {/* Grind → Dose → Retention → [gray: adj dose] */}
          <Row label="Grind Setting"><StepperInput name="grindSetting" value={grindSetting} onChange={setGrindSetting} step={0.5} min={0} max={50} /></Row>
          <Row label="Dose (g)"><StepperInput name="doseG" value={doseG} onChange={setDoseG} step={0.1} min={0} max={30} /></Row>
          <Row label="Retention (g)" noDivider={adjDose !== null}>
            <StepperInput name="grinderRetentionG" value={grinderRetentionG} onChange={setGrinderRetentionG} step={0.1} min={0} max={5} />
          </Row>
          {adjDose !== null && (
            <div className="px-6 py-2 flex items-center gap-2" style={{ backgroundColor: "var(--card-secondary)" }}>
              <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Adjusted dose {adjDose.toFixed(1)}g</span>
            </div>
          )}

          {/* Puck prep */}
          <div className="flex items-center px-6 min-h-[52px]" style={{ borderTop: "1px solid var(--separator)" }}>
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>WDT Used</span>
            <button type="button" onClick={() => setWdtUsed(!wdtUsed)} className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200" style={{ backgroundColor: wdtUsed ? "var(--accent)" : "#E5E5EA" }}>
              <span className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200 mt-[2px]" style={{ marginLeft: wdtUsed ? 22 : 2 }} />
            </button>
          </div>
          <div className="flex items-center px-6 min-h-[52px]" style={{ borderTop: "1px solid var(--separator)" }}>
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Distribution Tool</span>
            <button type="button" onClick={() => setDistributionToolUsed(!distributionToolUsed)} className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200" style={{ backgroundColor: distributionToolUsed ? "var(--accent)" : "#E5E5EA" }}>
              <span className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200 mt-[2px]" style={{ marginLeft: distributionToolUsed ? 22 : 2 }} />
            </button>
          </div>
          <Row label="Spring Weight (lbs)"><SpringWeightInput name="springWeightLbs" value={springWeightLbs} onChange={setSpringWeightLbs} /></Row>

          {/* Pull */}
          <Row label="Pre-infusion (s)"><StepperInput name="preinfusionSeconds" value={preinfusionSeconds} onChange={setPreinfusionSeconds} step={1} min={0} max={30} /></Row>
          <div className="px-4 py-3" style={{ borderTop: "1px solid var(--separator)" }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Flow</span>
              {flowCharacteristics !== null && (
                <button type="button" onClick={() => setFlowCharacteristics(null)} className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Clear</button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {FLOW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFlowCharacteristics(flowCharacteristics === opt.value ? null : opt.value)}
                  className="text-[13px] font-medium px-3 py-1.5 rounded-full"
                  style={
                    flowCharacteristics === opt.value
                      ? { backgroundColor: "var(--accent)", color: "#fff" }
                      : { backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Row label="Shot Time (s)"><StepperInput name="shotTimeSeconds" value={shotTimeSeconds} onChange={setShotTimeSeconds} step={1} min={0} max={120} /></Row>
          <Row label="Yield (g)"><StepperInput name="yieldG" value={yieldG} onChange={setYieldG} step={0.1} min={0} max={100} /></Row>
          <Row label="Lag (g)" noDivider={!!(liveRatio || timeClass || ratioClass)}>
            <StepperInput name="lagG" value={lagG} onChange={setLagG} step={1} min={0} max={20} />
          </Row>
          {(liveRatio || timeClass || ratioClass) && (
            <div className="px-6 py-3 flex items-center gap-2 flex-wrap" style={{ backgroundColor: "var(--card-secondary)" }}>
              {liveRatio && <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Ratio 1:{liveRatio}</span>}
              {stoppedAtG !== null && liveLagG !== null && liveLagG > 0 && (
                <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>stopped at {stoppedAtG.toFixed(1)}g</span>
              )}
              {timeClass && timeClass.label !== "Normal" && <ClassificationBadge classification={timeClass} size="sm" />}
              {ratioClass && ratioClass.label !== "Normal" && <ClassificationBadge classification={ratioClass} size="sm" />}
            </div>
          )}

          {/* Failed Shot */}
          <div className="flex items-center px-6 min-h-[52px]" style={{ borderTop: "1px solid var(--separator)" }}>
            <span className="text-[17px] flex-1" style={{ color: isFailed ? "#FF3B30" : "var(--text-primary)" }}>Failed Shot</span>
            <button
              type="button"
              onClick={() => { setIsFailed(!isFailed); if (!isFailed) setFailReason(""); }}
              className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
              style={{ backgroundColor: isFailed ? "#FF3B30" : "#E5E5EA" }}
            >
              <span className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200 mt-[2px]" style={{ marginLeft: isFailed ? 22 : 2 }} />
            </button>
          </div>
          {isFailed && (
            <div className="row-divider-t px-4 py-2">
              <div className="flex flex-wrap gap-2">
                {FAIL_REASONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFailReason(failReason === opt.value ? "" : opt.value)}
                    className="text-[13px] font-medium px-3 py-1.5 rounded-full"
                    style={
                      failReason === opt.value
                        ? { backgroundColor: "#FF3B30", color: "#fff" }
                        : { backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parameters Locked */}
          <div className="flex items-center px-6 min-h-[52px]" style={{ borderTop: "1px solid var(--separator)" }}>
            <div className="flex-1">
              <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Parameters Locked</span>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Keep these settings next shot</p>
            </div>
            <button type="button" onClick={() => setIsLocked(!isLocked)} className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200" style={{ backgroundColor: isLocked ? "#34C759" : "#E5E5EA" }}>
              <span className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200 mt-[2px]" style={{ marginLeft: isLocked ? 22 : 2 }} />
            </button>
          </div>

        </div>

        {/* Taste */}
        {!isFailed && (<>
        <SectionHeader title="Taste" />
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div className="px-6 py-3 row-divider">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Balance</span>
              {tasteBalance !== null && <button type="button" onClick={() => setTasteBalance(null)} className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Clear</button>}
            </div>
            <TasteBalanceControl value={tasteBalance} onChange={setTasteBalance} name="tasteBalance" />
          </div>
          <div className="px-6 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Shot Rating</span>
              {shotRating !== null && <button type="button" onClick={() => setShotRating(null)} className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Clear</button>}
            </div>
            <ShotStarRating value={shotRating} onChange={setShotRating} name="shotRating" />
          </div>
        </div>

        </>)}

        {/* Notes */}
        <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div className="px-4 py-3">
            <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes…" rows={3} className="w-full bg-transparent outline-none text-[17px] resize-none placeholder:text-[var(--text-secondary)]" style={{ color: "var(--text-primary)" }} />
          </div>
        </div>

        {/* Drink */}
        {!isFailed && (<>
        <SectionHeader title="Drink" />
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center px-6 min-h-[52px]">
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Include Drink</span>
            <button type="button" onClick={() => setIncludeDrink(!includeDrink)} className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200" style={{ backgroundColor: includeDrink ? "var(--accent)" : "#E5E5EA" }}>
              <span className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200 mt-[2px]" style={{ marginLeft: includeDrink ? 22 : 2 }} />
            </button>
          </div>

          {includeDrink && (
            <>
              {/* Hidden fields */}
              <input type="hidden" name="foamMl" value={foamMl} />
              <input type="hidden" name="hotWaterMl" value={hotWaterMl} />
              <input type="hidden" name="detectedDrinkName" value={liveDrink ?? ""} />
              <input type="hidden" name="hasChocolate" value={hasChocolate ? "true" : "false"} />
              <input type="hidden" name="hasIceCream" value={hasIceCream ? "true" : "false"} />
              <input type="hidden" name="hasChai" value={hasChai ? "true" : "false"} />
              <input type="hidden" name="isIced" value={isIced ? "true" : "false"} />

              {/* Predicted Drink */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Drink</span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[13px] font-semibold px-3 py-1 rounded-full"
                    style={
                      liveDrink
                        ? { backgroundColor: "#FF950022", color: "#FF9500" }
                        : { backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }
                    }
                  >
                    {liveDrink ?? liveBase ?? "Undecided"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDrinkPicker(!showDrinkPicker)}
                    className="text-[15px]"
                    style={{ color: "var(--accent)" }}
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Drink Picker */}
              {showDrinkPicker && (
                <div className="row-divider-t px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setManualDrinkName(null); setShowDrinkPicker(false); }}
                      className="text-[13px] font-medium px-3 py-1.5 rounded-full"
                      style={
                        manualDrinkName === null
                          ? { backgroundColor: "var(--accent)", color: "#fff" }
                          : { backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }
                      }
                    >
                      Auto
                    </button>
                    {ALL_DRINK_NAMES.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          const d = DRINK_DEFAULTS[name];
                          setManualDrinkName(name);
                          setMilkQuantityMl(d.milkMl > 0 ? d.milkMl.toString() : "");
                          setFoamMl(d.foamMl > 0 ? d.foamMl.toString() : "");
                          setHotWaterMl(d.hotWaterMl > 0 ? d.hotWaterMl.toString() : "");
                          setHasChocolate(d.hasChocolate);
                          setHasIceCream(d.hasIceCream);
                          setHasChai(d.hasChai);
                          setShowDrinkPicker(false);
                        }}
                        className="text-[13px] font-medium px-3 py-1.5 rounded-full"
                        style={
                          manualDrinkName === name
                            ? { backgroundColor: "var(--accent)", color: "#fff" }
                            : { backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }
                        }
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live drink composition bar */}
              <div className="px-6 py-3">
                <LiveDrinkBar
                  espressoMl={parseNum(yieldG) ?? 0}
                  milkMl={parseNum(milkQuantityMl) ?? 0}
                  foamMl={parseNum(foamMl) ?? 0}
                  hotWaterMl={parseNum(hotWaterMl) ?? 0}
                  hasChocolate={hasChocolate}
                  hasIceCream={hasIceCream}
                  hasChai={hasChai}
                />
              </div>

              {/* Milk (ml) */}
              <div className="flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Milk (ml)</span>
                <StepperInput name="milkQuantityMl" value={milkQuantityMl} onChange={setMilkQuantityMl} step={10} min={0} max={300} />
              </div>

              {/* Milk Type (only when milk > 0) */}
              {parseNum(milkQuantityMl) !== null && parseNum(milkQuantityMl)! > 0 && (
                <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                  <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Milk Type</span>
                  <select name="milkType" value={milkType} onChange={(e) => setMilkType(e.target.value)} className="text-right outline-none bg-transparent text-[17px]" style={{ color: "var(--accent)" }}>
                    <option value="">None</option>
                    {MILK_TYPES.map((t) => <option key={t} value={t.toLowerCase().replace(" & ", "_")}>{t}</option>)}
                  </select>
                </div>
              )}

              {/* Foam (ml) */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Foam (ml)</span>
                <StepperInput name="_foamMl" value={foamMl} onChange={setFoamMl} step={5} min={0} max={300} />
              </div>

              {/* Hot Water (ml) */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Hot Water (ml)</span>
                <StepperInput name="_hotWaterMl" value={hotWaterMl} onChange={setHotWaterMl} step={10} min={0} max={300} />
              </div>

              {/* Chocolate toggle */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Chocolate</span>
                <button type="button" onClick={() => setHasChocolate(!hasChocolate)} className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200" style={{ backgroundColor: hasChocolate ? "var(--accent)" : "#E5E5EA" }}>
                  <span className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]" style={{ marginLeft: hasChocolate ? 22 : 2 }} />
                </button>
              </div>

              {/* Ice Cream toggle */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Ice Cream</span>
                <button type="button" onClick={() => setHasIceCream(!hasIceCream)} className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200" style={{ backgroundColor: hasIceCream ? "var(--accent)" : "#E5E5EA" }}>
                  <span className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]" style={{ marginLeft: hasIceCream ? 22 : 2 }} />
                </button>
              </div>

              {/* Chai Concentrate toggle */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Chai Concentrate</span>
                <button type="button" onClick={() => setHasChai(!hasChai)} className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200" style={{ backgroundColor: hasChai ? "var(--accent)" : "#E5E5EA" }}>
                  <span className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]" style={{ marginLeft: hasChai ? 22 : 2 }} />
                </button>
              </div>

              {/* Iced / Hot toggle */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Iced</span>
                <button type="button" onClick={() => setIsIced(!isIced)} className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200" style={{ backgroundColor: isIced ? "var(--accent)" : "#E5E5EA" }}>
                  <span className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]" style={{ marginLeft: isIced ? 22 : 2 }} />
                </button>
              </div>

              <div className="px-6 py-3 row-divider-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Overall Rating</span>
                  {overallRating !== null && <button type="button" onClick={() => setOverallRating(null)} className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Clear</button>}
                </div>
                <PillRating value={overallRating} onChange={setOverallRating} name="overallRating" />
              </div>

              {liveDrink && LATTE_ART_ELIGIBLE.has(liveDrink) && (
                <div className="px-4 py-3 row-divider-t">
                  <input type="hidden" name="latteArtRating" value={latteArtRating ?? ""} />
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Latte Art</span>
                    {latteArtRating !== null && (
                      <button type="button" onClick={() => setLatteArtRating(null)} className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Clear</button>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {LATTE_ART_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLatteArtRating(latteArtRating === opt.value ? null : opt.value)}
                        className="text-[13px] font-medium px-3 py-1.5 rounded-full"
                        style={
                          latteArtRating === opt.value
                            ? { backgroundColor: "var(--accent)", color: "#fff" }
                            : { backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-6 py-3 row-divider-t">
                <textarea name="drinkNotes" value={drinkNotes} onChange={(e) => setDrinkNotes(e.target.value)} placeholder="Drink notes…" rows={2} className="w-full bg-transparent outline-none text-[17px] resize-none placeholder:text-[var(--text-secondary)]" style={{ color: "var(--text-primary)" }} />
              </div>
            </>
          )}
        </div>
        </>)}

        {state && "error" in state && state !== null && (
          <div className="mx-4 mt-3 px-4 py-3 rounded-2xl" style={{ backgroundColor: "var(--destructive)" + "22" }}>
            <p className="text-[15px]" style={{ color: "var(--destructive)" }}>{state.error}</p>
          </div>
        )}

        {/* Save button */}
        <div className="fixed-col px-4 py-3" style={{ bottom: "calc(80px + env(safe-area-inset-bottom))", background: "linear-gradient(to bottom, transparent, var(--bg) 40%)", pointerEvents: "none" }}>
          <button type="submit" disabled={isPending} className="w-full py-3.5 rounded-full text-[17px] font-semibold disabled:opacity-40" style={{ backgroundColor: "var(--card)", color: "var(--accent)", pointerEvents: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Delete — outside form, below save button area */}
      <div className="mx-4 mt-2 mb-[160px]">
        <DeleteButton shotId={shot.id} />
      </div>
    </>
  );
}
