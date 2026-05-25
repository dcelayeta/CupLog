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

function NumberInput({ name, value, onChange, placeholder, step = "0.1", min, max }: {
  name: string; value: string; onChange: (v: string) => void; placeholder: string;
  step?: string; min?: string; max?: string;
}) {
  return (
    <input
      type="number"
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      step={step}
      min={min}
      max={max}
      className="text-right outline-none bg-transparent text-[17px] w-[90px]"
      style={{ color: "var(--text-primary)" }}
      inputMode="decimal"
    />
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
  const [distributionToolUsed, setDistributionToolUsed] = useState(shot.distributionToolUsed);
  const [grinderRetentionG, setGrinderRetentionG] = useState(shot.grinderRetentionG?.toString() ?? "");

  // Taste
  const [tasteBalance, setTasteBalance] = useState<number | null>(shot.tasteBalance);
  const [shotRating, setShotRating] = useState<number | null>(shot.shotRating);
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
  const [manualDrinkName, setManualDrinkName] = useState<string | null>(shot.drink?.detectedDrinkName ?? null);
  const [showDrinkPicker, setShowDrinkPicker] = useState(false);
  const [overallRating, setOverallRating] = useState<number | null>(shot.drink?.overallRating ?? null);
  const [drinkNotes, setDrinkNotes] = useState(shot.drink?.notes ?? "");

  // Live preview
  const dose = parseNum(doseG);
  const yield_ = parseNum(yieldG);
  const liveRatioDerived = dose && yield_ ? yield_ / dose : null;
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
        <input type="hidden" name="distributionToolUsed" value={distributionToolUsed ? "true" : "false"} />
        <input type="hidden" name="includeDrink" value={includeDrink ? "true" : "false"} />
        <input type="hidden" name="pulledAt" value={shot.pulledAt} />

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
          <Row label="Dose (g)"><NumberInput name="doseG" value={doseG} onChange={setDoseG} placeholder="18" step="0.1" min="5" max="30" /></Row>
          <Row label="Yield (g)"><NumberInput name="yieldG" value={yieldG} onChange={setYieldG} placeholder="36" step="0.1" min="10" max="100" /></Row>
          <Row label="Shot Time (s)"><NumberInput name="shotTimeSeconds" value={shotTimeSeconds} onChange={setShotTimeSeconds} placeholder="28" step="1" min="5" max="120" /></Row>
          <Row label="Lag (g)" noDivider={!!(liveRatio || timeClass || ratioClass)}><NumberInput name="lagG" value={lagG} onChange={setLagG} placeholder="—" step="0.5" min="0" /></Row>

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

          <Row label="Grind Setting"><NumberInput name="grindSetting" value={grindSetting} onChange={setGrindSetting} placeholder="—" step="0.5" min="0" /></Row>
          <Row label="Pre-infusion (s)"><NumberInput name="preinfusionSeconds" value={preinfusionSeconds} onChange={setPreinfusionSeconds} placeholder="—" step="1" min="0" /></Row>
          <Row label="Spring Weight (lbs)"><NumberInput name="springWeightLbs" value={springWeightLbs} onChange={setSpringWeightLbs} placeholder="—" step="1" min="0" /></Row>
          <Row label="Retention (g)"><NumberInput name="grinderRetentionG" value={grinderRetentionG} onChange={setGrinderRetentionG} placeholder="—" step="0.1" min="0" /></Row>
          <div className="flex items-center px-6 min-h-[52px]">
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>WDT Used</span>
            <button type="button" onClick={() => setWdtUsed(!wdtUsed)} className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200" style={{ backgroundColor: wdtUsed ? "var(--accent)" : "#E5E5EA" }}>
              <span className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200 mt-[2px]" style={{ marginLeft: wdtUsed ? 22 : 2 }} />
            </button>
          </div>
          <div className="flex items-center px-6 min-h-[52px]">
            <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Distribution Tool</span>
            <button type="button" onClick={() => setDistributionToolUsed(!distributionToolUsed)} className="relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200" style={{ backgroundColor: distributionToolUsed ? "var(--accent)" : "#E5E5EA" }}>
              <span className="pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200 mt-[2px]" style={{ marginLeft: distributionToolUsed ? 22 : 2 }} />
            </button>
          </div>
        </div>

        {/* Taste */}
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

        {/* Notes */}
        <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div className="px-4 py-3">
            <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes…" rows={3} className="w-full bg-transparent outline-none text-[17px] resize-none placeholder:text-[var(--text-secondary)]" style={{ color: "var(--text-primary)" }} />
          </div>
        </div>

        {/* Drink */}
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

              {/* Milk (ml) */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Milk (ml)</span>
                <NumberInput name="milkQuantityMl" value={milkQuantityMl} onChange={setMilkQuantityMl} placeholder="—" step="10" min="0" />
              </div>

              {/* Foam (ml) */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Foam (ml)</span>
                <NumberInput name="_foamMl" value={foamMl} onChange={setFoamMl} placeholder="—" step="10" min="0" />
              </div>

              {/* Hot Water (ml) */}
              <div className="row-divider-t flex items-center px-6 min-h-[52px]">
                <span className="text-[17px] flex-1" style={{ color: "var(--text-primary)" }}>Hot Water (ml)</span>
                <NumberInput name="_hotWaterMl" value={hotWaterMl} onChange={setHotWaterMl} placeholder="—" step="10" min="0" />
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

              <div className="px-6 py-3 row-divider-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Overall Rating</span>
                  {overallRating !== null && <button type="button" onClick={() => setOverallRating(null)} className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Clear</button>}
                </div>
                <PillRating value={overallRating} onChange={setOverallRating} name="overallRating" />
              </div>

              <div className="px-6 py-3 row-divider-t">
                <textarea name="drinkNotes" value={drinkNotes} onChange={(e) => setDrinkNotes(e.target.value)} placeholder="Drink notes…" rows={2} className="w-full bg-transparent outline-none text-[17px] resize-none placeholder:text-[var(--text-secondary)]" style={{ color: "var(--text-primary)" }} />
              </div>
            </>
          )}
        </div>

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
