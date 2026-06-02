"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logShot } from "@/lib/shots/actions";
import type { BagOption, LastShotDefaults } from "@/lib/shots/queries";
import type { EquipmentProfile, ExtractionThreshold } from "@/db/schema";
import { classifyTime, classifyRatio } from "@/lib/shots/classification";
import { detectDrink, detectEspressoBase, ALL_DRINK_NAMES, DRINK_DEFAULTS } from "@/lib/shots/drinkDetection";
import ClassificationBadge from "./ClassificationBadge";
import PillRating from "./PillRating";
import TasteBalanceControl from "./TasteBalanceControl";
import ShotStarRating from "./ShotStarRating";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  bags: BagOption[];
  equipmentProfile: EquipmentProfile | null;
  averageRetention: number | null;
  lastShot: LastShotDefaults | null;
  bagDefaults: Record<number, LastShotDefaults>;
  thresholds: ExtractionThreshold[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MILK_TYPES = ["Whole", "Oat", "Almond", "Skim", "Soy", "Coconut", "Half & Half"];

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

// ─── Row layout ───────────────────────────────────────────────────────────────

function Row({ label, children, noDivider }: { label: string; children: React.ReactNode; noDivider?: boolean }) {
  return (
    <div className={`${noDivider ? "" : "row-divider "}flex items-center px-6 min-h-[52px]`}>
      <span
        className="text-[17px] flex-1"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function NumberInput({
  name,
  value,
  onChange,
  placeholder,
  integer = false,
  min,
  max,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  integer?: boolean;
  min?: string;
  max?: string;
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

function StepperInput({
  name,
  value,
  onChange,
  step = 0.1,
  min = 0,
  max = 9.9,
}: {
  name: string;
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {title}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LogFormClient({
  bags,
  equipmentProfile,
  averageRetention,
  lastShot,
  bagDefaults,
  thresholds,
}: Props) {
  const [state, formAction, isPending] = useActionState(logShot, null);
  const router = useRouter();

  useEffect(() => {
    if (state && "success" in state && state.success) {
      router.push(`/history/${state.shot.shotId}`);
    }
  }, [state, router]);

  // Resolve defaults: last shot takes priority over equipment profile fallbacks
  const initialBagId = (
    (lastShot ? bags.find((b) => b.id === lastShot.bagId)?.id : null) ?? bags[0]?.id
  )?.toString() ?? "";

  // Shot fields
  const [bagId, setBagId] = useState(initialBagId);
  const [doseG, setDoseG] = useState(lastShot ? lastShot.doseG.toString() : "18");
  const [yieldG, setYieldG] = useState("36");
  const [shotTimeSeconds, setShotTimeSeconds] = useState("28");
  const [grindSetting, setGrindSetting] = useState(
    lastShot?.grindSetting != null ? lastShot.grindSetting.toString() : ""
  );
  const [lagG, setLagG] = useState(
    lastShot?.lagG != null ? lastShot.lagG.toString() : ""
  );
  const [preinfusionSeconds, setPreinfusionSeconds] = useState("");
  const [springWeightLbs, setSpringWeightLbs] = useState(
    lastShot?.springWeightLbs != null
      ? lastShot.springWeightLbs.toString()
      : equipmentProfile?.defaultSpringWeightLbs?.toString() ?? ""
  );
  const [wdtUsed, setWdtUsed] = useState(lastShot ? lastShot.wdtUsed : true);
  const [distributionToolUsed, setDistributionToolUsed] = useState(false);
  const [grinderRetentionG, setGrinderRetentionG] = useState("0");
  const [flowCharacteristics, setFlowCharacteristics] = useState<string | null>(null);

  // Failed shot
  const [isFailed, setIsFailed] = useState(false);
  const [failReason, setFailReason] = useState<string>("");

  // Taste
  const [tasteBalance, setTasteBalance] = useState<number | null>(null);
  const [shotRating, setShotRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Date / time
  const [pulledAt, setPulledAt] = useState(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  // Drink
  const [includeDrink, setIncludeDrink] = useState(false);
  const [milkType, setMilkType] = useState("");
  const [milkQuantityMl, setMilkQuantityMl] = useState("");
  const [foamMl, setFoamMl] = useState("");
  const [hotWaterMl, setHotWaterMl] = useState("");
  const [hasChocolate, setHasChocolate] = useState(false);
  const [hasIceCream, setHasIceCream] = useState(false);
  const [hasChai, setHasChai] = useState(false);
  const [isIced, setIsIced] = useState(false);
  const [manualDrinkName, setManualDrinkName] = useState<string | null>(null);
  const [showDrinkPicker, setShowDrinkPicker] = useState(false);
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [drinkNotes, setDrinkNotes] = useState("");

  // Derived live values
  const dose = parseNum(doseG);
  const yield_ = parseNum(yieldG);
  const liveRatioDerived = dose && yield_ ? yield_ / dose : null;
  const liveRatio = liveRatioDerived ? liveRatioDerived.toFixed(2) : null;
  const liveTime = parseIntVal(shotTimeSeconds);
  const liveLagG = parseNum(lagG);
  const stoppedAtG = yield_ !== null && liveLagG !== null ? yield_ - liveLagG : null;

  const timeClass = liveTime !== null ? classifyTime(liveTime, thresholds) : null;
  const ratioClass = liveRatioDerived !== null ? classifyRatio(liveRatioDerived, thresholds) : null;

  const adjustedDoseG =
    dose !== null && parseNum(grinderRetentionG) !== null
      ? (dose - parseNum(grinderRetentionG)!).toFixed(1)
      : null;
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

  // Find selected bag's roast date
  const selectedBag = bags.find((b) => b.id.toString() === bagId);

  return (
    <>
      <form action={formAction} className="pb-32">
        {/* Hidden fields */}
        <input type="hidden" name="bagId" value={bagId} />
        <input type="hidden" name="bagRoastDate" value={selectedBag?.roastDate ?? ""} />
        <input type="hidden" name="wdtUsed" value={wdtUsed ? "true" : "false"} />
        <input type="hidden" name="distributionToolUsed" value={distributionToolUsed ? "true" : "false"} />
        <input type="hidden" name="flowCharacteristics" value={flowCharacteristics ?? ""} />
        <input type="hidden" name="includeDrink" value={includeDrink ? "true" : "false"} />
        <input type="hidden" name="isFailed" value={isFailed ? "true" : "false"} />
        {isFailed && failReason && <input type="hidden" name="failReason" value={failReason} />}
        {equipmentProfile && (
          <input type="hidden" name="equipmentProfileId" value={equipmentProfile.id} />
        )}

        {/* ── Bag ── */}
        <SectionHeader title="Bean" />
        <div
          className="mx-4 rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
        >
          <div
            className="flex items-center px-6 min-h-[52px]"
          >
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Bag</span>
            <select
              value={bagId}
              onChange={(e) => {
                const newId = e.target.value;
                setBagId(newId);
                const d = bagDefaults[Number(newId)];
                if (d) {
                  setDoseG(d.doseG.toString());
                  setGrindSetting(d.grindSetting?.toString() ?? "");
                  setLagG(d.lagG?.toString() ?? "");
                  setSpringWeightLbs(d.springWeightLbs?.toString() ?? "");
                  setWdtUsed(d.wdtUsed);
                }
              }}
              className="text-right outline-none bg-transparent text-[17px] max-w-[200px] truncate"
              style={{ color: "var(--accent)" }}
            >
              {(() => {
                const dupes = new Set(
                  bags.map(b => `${b.roaster}|${b.name}`)
                    .filter((k, _, a) => a.filter(x => x === k).length > 1)
                );
                return bags.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.roaster} · {b.name}{dupes.has(`${b.roaster}|${b.name}`) ? ` (${b.roastDate.slice(5)})` : ""}
                  </option>
                ));
              })()}
            </select>
          </div>
        </div>

        {/* ── Shot Parameters ── */}
        <SectionHeader title="Shot" />
        <div
          className="mx-4 rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
        >
          {/* Failed shot toggle */}
          <div className="flex items-center px-6 min-h-[52px]">
            <span className="text-[17px] flex-1" style={{ color: isFailed ? "#FF3B30" : "var(--text-primary)" }}>
              Failed Shot
            </span>
            <button
              type="button"
              onClick={() => { setIsFailed(!isFailed); setFailReason(""); }}
              className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
              style={{ backgroundColor: isFailed ? "#FF3B30" : "#E5E5EA" }}
            >
              <span
                className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]"
                style={{ marginLeft: isFailed ? 22 : 2 }}
              />
            </button>
          </div>
          {isFailed && (
            <div className="row-divider px-4 py-2">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "channeling", label: "Channeling" },
                  { value: "choking", label: "Choking" },
                  { value: "puck_collapse", label: "Puck Collapse" },
                  { value: "grind_error", label: "Grind Error" },
                  { value: "equipment_issue", label: "Equipment" },
                  { value: "other", label: "Other" },
                ].map((opt) => (
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
          <Row label="Dose (g)">
            <StepperInput name="doseG" value={doseG} onChange={setDoseG} step={0.1} min={0} max={30} />
          </Row>
          <Row label="Yield (g)">
            <StepperInput name="yieldG" value={yieldG} onChange={setYieldG} step={0.1} min={0} max={100} />
          </Row>
          <Row label="Shot Time (s)">
            <NumberInput name="shotTimeSeconds" value={shotTimeSeconds} onChange={setShotTimeSeconds} placeholder={isFailed ? "—" : "28"} integer min="0" max="120" />
          </Row>
          <Row label="Lag (g)" noDivider={!!(liveRatio || timeClass || ratioClass || adjustedDoseG)}>
            <NumberInput name="lagG" value={lagG} onChange={setLagG} placeholder="—" min="0" />
          </Row>

          {/* Live preview */}
          {(liveRatio || timeClass || ratioClass || adjustedDoseG) && (
            <div
              className="px-6 py-3 flex items-center gap-2 flex-wrap"
              style={{ backgroundColor: "var(--card-secondary)" }}
            >
              {liveRatio && (
                <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  Ratio 1:{liveRatio}
                </span>
              )}
              {stoppedAtG !== null && stoppedAtG > 0 && (
                <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  stopped at {stoppedAtG.toFixed(1)}g
                </span>
              )}
              {adjustedDoseG !== null && (
                <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  adjusted dose {adjustedDoseG}g
                </span>
              )}
              {timeClass && timeClass.label !== "Normal" && <ClassificationBadge classification={timeClass} size="sm" />}
              {ratioClass && ratioClass.label !== "Normal" && <ClassificationBadge classification={ratioClass} size="sm" />}
            </div>
          )}

          <Row label="Grind Setting">
            <StepperInput name="grindSetting" value={grindSetting} onChange={setGrindSetting} step={0.5} min={0} max={50} />
          </Row>
          <Row label="Pre-infusion (s)">
            <NumberInput name="preinfusionSeconds" value={preinfusionSeconds} onChange={setPreinfusionSeconds} placeholder="—" integer min="0" />
          </Row>
          <Row label="Spring Weight (lbs)">
            <NumberInput name="springWeightLbs" value={springWeightLbs} onChange={setSpringWeightLbs} placeholder="—" integer min="0" />
          </Row>
          <Row label="Retention (g)">
            <StepperInput name="grinderRetentionG" value={grinderRetentionG} onChange={setGrinderRetentionG} step={0.1} min={0} max={5} />
          </Row>
          <div
            className="flex items-center px-6 min-h-[52px]"
          >
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>WDT Used</span>
            <button
              type="button"
              onClick={() => setWdtUsed(!wdtUsed)}
              className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
              style={{ backgroundColor: wdtUsed ? "var(--accent)" : "#E5E5EA" }}
            >
              <span
                className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]"
                style={{ marginLeft: wdtUsed ? 22 : 2 }}
              />
            </button>
          </div>
          <div className="flex items-center px-6 min-h-[52px]">
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Distribution Tool</span>
            <button
              type="button"
              onClick={() => setDistributionToolUsed(!distributionToolUsed)}
              className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
              style={{ backgroundColor: distributionToolUsed ? "var(--accent)" : "#E5E5EA" }}
            >
              <span
                className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]"
                style={{ marginLeft: distributionToolUsed ? 22 : 2 }}
              />
            </button>
          </div>
          <div className="px-4 py-3">
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
          <Row label="Date & Time">
            <input
              type="datetime-local"
              value={pulledAt}
              onChange={(e) => setPulledAt(e.target.value)}
              className="text-right outline-none bg-transparent text-[17px]"
              style={{ color: "var(--accent)" }}
            />
            {/* Convert local time to UTC before submitting — server (Vercel) runs in UTC */}
            <input type="hidden" name="pulledAt" value={pulledAt ? new Date(pulledAt).toISOString() : ""} />
          </Row>
        </div>

        {/* ── Taste ── */}
        {!isFailed && (
          <>
            <SectionHeader title="Taste" />
            <div
              className="mx-4 rounded-2xl overflow-hidden"
              style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
            >
              <div className="px-6 py-3 row-divider">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Balance</span>
                  {tasteBalance !== null && (
                    <button type="button" onClick={() => setTasteBalance(null)} className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Clear</button>
                  )}
                </div>
                <TasteBalanceControl value={tasteBalance} onChange={setTasteBalance} name="tasteBalance" />
              </div>
              <div className="px-6 py-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Shot Rating</span>
                  {shotRating !== null && (
                    <button type="button" onClick={() => setShotRating(null)} className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Clear</button>
                  )}
                </div>
                <ShotStarRating value={shotRating} onChange={setShotRating} name="shotRating" />
              </div>
            </div>
          </>
        )}

        {/* ── Notes ── */}
        <div
          className="mx-4 mt-3 rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
        >
          <div className="px-4 py-3">
            <textarea
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes…"
              rows={3}
              className="w-full bg-transparent outline-none text-[17px] resize-none placeholder:text-[var(--text-secondary)]"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* ── Include Drink Toggle ── */}
        {!isFailed && (
        <>
        <SectionHeader title="Drink" />
        <div
          className="mx-4 rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
        >
          <div className="flex items-center px-6 min-h-[52px]">
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Include Drink</span>
            <button
              type="button"
              onClick={() => setIncludeDrink(!includeDrink)}
              className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
              style={{ backgroundColor: includeDrink ? "var(--accent)" : "#E5E5EA" }}
            >
              <span
                className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]"
                style={{ marginLeft: includeDrink ? 22 : 2 }}
              />
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
                  espressoMl={yield_ ?? 0}
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
                <NumberInput name="milkQuantityMl" value={milkQuantityMl} onChange={setMilkQuantityMl} placeholder="—" min="0" />
              </div>

              {/* Milk Type (only when milk > 0) */}
              {parseNum(milkQuantityMl) !== null && parseNum(milkQuantityMl)! > 0 && (
                <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                  <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Milk Type</span>
                  <select
                    name="milkType"
                    value={milkType}
                    onChange={(e) => setMilkType(e.target.value)}
                    className="text-right outline-none bg-transparent text-[17px]"
                    style={{ color: "var(--accent)" }}
                  >
                    <option value="">None</option>
                    {MILK_TYPES.map((t) => (
                      <option key={t} value={t.toLowerCase().replace(" & ", "_")}>{t}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Foam (ml) */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Foam (ml)</span>
                <NumberInput name="_foamMl" value={foamMl} onChange={setFoamMl} placeholder="—" min="0" />
              </div>

              {/* Hot Water (ml) */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Hot Water (ml)</span>
                <NumberInput name="_hotWaterMl" value={hotWaterMl} onChange={setHotWaterMl} placeholder="—" min="0" />
              </div>

              {/* Chocolate toggle */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Chocolate</span>
                <button
                  type="button"
                  onClick={() => setHasChocolate(!hasChocolate)}
                  className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
                  style={{ backgroundColor: hasChocolate ? "var(--accent)" : "#E5E5EA" }}
                >
                  <span
                    className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]"
                    style={{ marginLeft: hasChocolate ? 22 : 2 }}
                  />
                </button>
              </div>

              {/* Ice Cream toggle */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Ice Cream</span>
                <button
                  type="button"
                  onClick={() => setHasIceCream(!hasIceCream)}
                  className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
                  style={{ backgroundColor: hasIceCream ? "var(--accent)" : "#E5E5EA" }}
                >
                  <span
                    className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]"
                    style={{ marginLeft: hasIceCream ? 22 : 2 }}
                  />
                </button>
              </div>

              {/* Chai Concentrate toggle */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Chai Concentrate</span>
                <button
                  type="button"
                  onClick={() => setHasChai(!hasChai)}
                  className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
                  style={{ backgroundColor: hasChai ? "var(--accent)" : "#E5E5EA" }}
                >
                  <span
                    className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]"
                    style={{ marginLeft: hasChai ? 22 : 2 }}
                  />
                </button>
              </div>

              {/* Iced / Hot toggle */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Iced</span>
                <button
                  type="button"
                  onClick={() => setIsIced(!isIced)}
                  className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
                  style={{ backgroundColor: isIced ? "var(--accent)" : "#E5E5EA" }}
                >
                  <span
                    className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform duration-200 mt-[2px]"
                    style={{ marginLeft: isIced ? 22 : 2 }}
                  />
                </button>
              </div>

              {/* Overall Rating */}
              <div className="row-divider-t px-4 py-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Overall Rating</span>
                  {overallRating !== null && (
                    <button type="button" onClick={() => setOverallRating(null)} className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                      Clear
                    </button>
                  )}
                </div>
                <PillRating value={overallRating} onChange={setOverallRating} name="overallRating" />
              </div>

              {/* Drink Notes */}
              <div className="row-divider-t px-4 py-3">
                <textarea
                  name="drinkNotes"
                  value={drinkNotes}
                  onChange={(e) => setDrinkNotes(e.target.value)}
                  placeholder="Drink notes…"
                  rows={2}
                  className="w-full bg-transparent outline-none text-[17px] resize-none placeholder:text-[var(--text-secondary)]"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </>
          )}
        </div>
        </>
        )}

        {/* Error */}
        {state && "error" in state && (
          <div className="mx-4 mt-3 px-4 py-3 rounded-2xl" style={{ backgroundColor: "var(--destructive)" + "22" }}>
            <p className="text-[15px]" style={{ color: "var(--destructive)" }}>{state.error}</p>
          </div>
        )}

        {/* Save Button */}
        <div
          className="fixed-col px-4 py-3"
          style={{
            bottom: "calc(80px + env(safe-area-inset-bottom))",
            background: "linear-gradient(to bottom, transparent, var(--bg) 40%)",
            pointerEvents: "none",
          }}
        >
          <button
            type="submit"
            disabled={isPending || bags.length === 0}
            className="w-full py-3.5 rounded-full text-[17px] font-semibold disabled:opacity-40 transition-opacity"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--accent)",
              pointerEvents: "auto",
              boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            }}
          >
            {isPending ? "Saving…" : "Log Shot"}
          </button>
        </div>
      </form>

    </>
  );
}
