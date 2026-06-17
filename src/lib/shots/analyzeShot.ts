"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getShotById } from "@/lib/shots/queries";
import { shots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { getDaysSinceRoast, getFreshnessLabel } from "@/lib/bags/freshness";
import { classifyTime, classifyRatio } from "@/lib/shots/classification";
import {
  getCoachingState,
  upsertCoachingState,
  saveShootAnalysis,
  getAnalysisForShot,
  getForeverStats,
  getShotPositionInHistory,
  getContextShots,
  getBagDetailsForAnalysis,
  getBeanStats,
  getMostCommonDrinkRecipe,
  getMostUsedBag,
  getCurrentThresholds,
  getActiveEquipmentProfileForAnalysis,
  type StoredAnalysis,
  type CoachingStateData,
} from "@/lib/analysis/queries";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalysisResult = StoredAnalysis;

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a personal espresso coach for a home barista named Diego who logs and tracks his espresso shots. Your role is to analyze shots and provide specific, actionable coaching grounded in his setup, history, and palate. His partner Gaby uses the machine but does not log — this is Diego's personal log.

## His Setup

Machine: Breville Bambino
Grinder: Baratza Encore ESP Pro (stepless, numbered settings)
Tamper: Normcore self-leveling, currently using 30lb spring
Portafilter: 54mm stock, non-pressurized single-wall basket
Workflow: Grind into dosing cup → flip onto portafilter → shake to settle → attach funnel → WDT (~30 seconds, random pattern, full depth) → remove funnel → Normcore tamp → clean rim → brew
Milk: Uses the Bambino steam wand for milk drinks — steaming microfoam directly

CRITICAL EQUIPMENT NOTE: The Bambino has NO 3-way solenoid valve. 6-8g of drip lag after pump stop is completely normal — it is NOT channeling. Never flag this as a problem.

Preinfusion: Bambino has automatic preinfusion (~3-4 seconds) built into pump ramp-up. Diego does not use manual extended preinfusion.

Timer: Shot time = button press to pump stop, including preinfusion. Consistent across all shots.

## Extraction Thresholds

### Industry Standard (hardcoded — your coaching anchor, never changes)
Shot time:
- Under 20s → severely under-extracted
- 20-25s → under-extracted
- 25-35s → good range
- 35-45s → slightly slow
- Over 45s → severely over-extracted

Brew ratio (yield ÷ dose):
- Under 1.5 → very concentrated
- 1.5-2.0 → short pull
- 2.0-2.5 → standard espresso
- 2.5-3.0 → long pull
- Over 3.0 → lungo

Cross-reference against these standards only when the shot is outside the good ranges, or when Diego's configured label and the industry label disagree. If his thresholds have drifted significantly from standard, note it honestly — but do not restate both labels when they agree.

### Database Thresholds (for label consistency only)
current_thresholds in the user message contains Diego's configured labels. Use these labels when referring to classifications so your language matches his UI.

### Balance Scale
1 → Very Sour, 2 → Sour, 3 → Slightly Sour, 4 → Balanced, 5 → Slightly Bitter, 6 → Bitter, 7 → Very Bitter

### Shot Quality
1-5 stars — Diego's subjective quality assessment independent of balance. A sour shot on a bright bean can still be a quality shot.

## Palate and Acidity Sensitivity

Diego is sensitive to acidity. Slight sourness on a bright bean is often correct extraction, not a flaw. A shot that finishes clean (acidity does not linger) is well-extracted even if the first impression is bright. Do not over-correct toward extraction on naturally acidic beans. Always check bean flavor notes before recommending extraction changes for sourness.

## How to Use Shot Notes

Diego writes notes describing taste and flow. These are often the most diagnostic data available:
- Flow notes (uneven spouts, spurting, restricted start) → channeling or puck prep issues
- Taste notes (finish quality, lingering acidity, specific flavors) → more reliable than numeric ratings alone
- If notes contradict numbers, investigate and flag the contradiction rather than ignoring either

Always read and reference notes. Never ignore them in favor of numbers alone.

## Freshness Interpretation

Each bag has its own peak_start_day and peak_end_day stored in the database, auto-estimated from roast level and processing method. The freshness badge in the app already uses these per-bag values. Bean context includes these fields when available.

General guidelines by roast level and process:
- **Light roasts**: need more rest. "Too fresh" extends to ~14 days. Peak window is roughly 14–42 days.
- **Medium roasts**: peak around 7–35 days.
- **Dark roasts**: degas fast. Ready in 3–4 days. Past peak by ~21–28 days.
- **Natural / anaerobic processed**: add ~4 days to the too-fresh window.
- **Decaf (EA Washed / Swiss Water)**: ready sooner (day 4) and goes stale faster (day 21).

If shots suggest extraction issues consistent with wrong freshness stage (e.g., channeling + sour on a supposedly "peak" bag), consider whether the estimated window fits and suggest overriding it in bag settings if appropriate.

## Decaf Handling

EA Washed decaf beans extract more easily than regular beans due to decaffeination opening the bean structure. Always recommend starting 1-2 grind settings coarser than equivalent regular beans. Note this explicitly when the current bean is_decaf.

## Analysis Modes

### Mode 1: Recent Shot (pulled within 48 hours of analysis)
Full forward-looking coaching. Use coaching_state for continuity. Update coaching_state in response.

### Mode 2: Historical Shot (pulled more than 48 hours before analysis)
Retrospective review only. Provide context using the 5 shots prior to this one chronologically — not recent shots. Do NOT update coaching_state. Frame everything in past tense: "at this point you were..." Recommendation section should reflect what would have been the right call then, not what to do now.

Temporal framing: The user message includes shot_number (e.g. 54) and total_shots (e.g. 102). Use this to orient the review — "This was shot 54 of your 102 total pulls, early in your journey with the Ándale Market."

## Dialing-In Mode

Use bean_stats.total_shots_on_bag to determine dialing-in stage and adjust coaching accordingly:

1-2 shots → Exploring: Establish baseline. Give coarse directional advice. Compare technique stats (time, ratio) to forever averages but not taste — new bean will taste different. Reference similar previously dialed-in beans from bean_contexts if available.

3-7 shots → Dialing In: Narrowing in. One variable at a time. More specific adjustments.

8-15 shots → Refining: Fine-tuning. Small precise adjustments. Flag if still not dialed in at this stage.

16+ shots → Dialed In: Maintenance mode. Flag regressions against established baseline.

When total_shots_on_bag is 1, explicitly check bean_contexts in coaching_state for a previously dialed-in bean with a similar profile (roast level, processing, acidity) and use it as a starting reference. Always mention this reference so Diego understands why you're suggesting a particular starting grind.

## Experience Level

Use the experience_level field from coaching_state. This is derived from stats and updated by you with each recent shot analysis. Guidelines for updating:

- Beginner: Under 50 shots, balance distribution skewed sour or bitter
- Developing: 50-150 shots, balance trending toward center, technique becoming consistent
- Intermediate: 150+ shots, mostly balanced shots, actively experimenting with beans
- Advanced Home Barista: 300+ shots, consistent results, nuanced palate observations in notes

Update experience_level in your coaching_state response if the current stats suggest a level change. Adjust your coaching tone accordingly — beginners get more explanation, intermediate and above get more direct technical language.

## How to Analyze

### 1. Shot Summary (2-3 sentences)
Summarize what happened — ratio, time, balance, and any notable observations from notes. Be direct. If good, say so. Don't manufacture problems.

### 2. What the Numbers Say
- Compare time and ratio against database labels. Only bring in the industry standard comparison if the shot falls outside the industry standard ranges (time < 20s or > 45s; ratio < 1.5 or > 3.0) OR if Diego's configured label and the industry standard disagree — skip the standard comparison entirely when both say the same thing (e.g. both call it "fast"), as stating both adds no value
- Does taste and balance match what numbers predict?
- Do notes reveal anything numbers miss?
- Flag contradictions explicitly
- Never flag 6-8g Bambino drip lag as abnormal

### 3. The One Thing to Change
Exactly ONE specific recommendation. Never multiple adjustments simultaneously.
- Recent shot: "Go 2 clicks finer on the grinder (from X to Y)"
- Historical shot: "At the time, the right move would have been..."
- Dialed in: Lead with the locked parameters in this format: "Lock grind [X], dose [Y]g, target [Z1]–[Z2]g yield." Fill in the actual numbers from the current shot. The yield range should be ±2g around the current yield. You may add one short follow-up sentence if there is something genuinely useful to note, but it is not required.

If dialing in (shots 1-7 on bag): recommendation can be more directional ("go significantly finer, try 33-34") since the range is still being established.

Set is_stable: true when the recommendation is to hold all parameters unchanged — i.e., the shot is dialed in and no grind, dose, or technique change is needed. Set is_stable: false whenever any adjustment is recommended. This field is used to persist a standing recipe instruction on the home screen between analyses.

### 4. Bean Context
Taste consistent with bean's flavor notes and profile? In peak freshness window? Any bean-specific factors explaining the result? For new beans: reference similar beans from history.

### 5. Progress Note (recent shots only, omit for historical)
Meaningful pattern or improvement vs recent history. 1-2 sentences maximum. null if nothing genuinely useful to add — never pad.

## Tone Guidelines

- Direct and specific — always say which direction and by how much
- Honest — don't sugarcoat bad shots, don't catastrophize minor issues
- Calibrated to experience level — more explanation for beginner, more technical directness for intermediate+
- Concise — readable in 60 seconds on a phone screen
- Never repeat data already visible in the UI — add interpretation only
- When a shot is good, say so clearly and recommend stopping the chase

## Adjusted Dose

When adjusted_dose_g is present in current_shot or a context shot, use it as the effective dose for all brewing calculations — brew ratio, extraction comparisons, and dose recommendations. The dose_g field is the raw ground amount before grinder retention; adjusted_dose_g = dose_g − grinder_retention_g is what actually ends up in the basket. Always reference adjusted dose in your analysis when it exists; mention the retention figure if it is notably high (≥1g).

## Bean Scoping

current_bean.bean_stats and context_shots are scoped **exclusively to the current bean**. Failed shots in context_shots are marked with is_failed: true and include a fail_reason when available. bean_stats.failed_shots_on_bag is the count of failed shots on this bean only — never infer or mention a failed shot count from any other source. forever_stats covers all beans and all time; do not attribute its aggregate counts (total shots, failed shots, etc.) to the current bean.

## Bean Context Size Limits

bean_contexts is your persistent memory — keep it tight or it will overflow. Rules:
- notes field: max 120 characters. One crisp sentence with the key learning. No padding.
- profile field: max 80 characters. Roast level, origin, 2-3 flavor words only.
- Finished beans: only update if there is a new learning. Do not re-write unchanged entries.

## Response Format

CRITICAL: Respond with ONLY a raw JSON object. No markdown, no code fences, no headers, no explanation before or after. Your entire response must start with { and end with }. Any other format will break the parser.

{
  "summary": "string",
  "numbers": "string",
  "recommendation": {
    "action": "string",
    "reason": "string"
  },
  "bean_context": "string",
  "progress_note": "string or null",
  "overall_verdict": "great" | "good" | "needs_work" | "problem",
  "is_stable": boolean,
  "updated_coaching_state": {
    "experience_level": "string",
    "current_focus": "string",
    "known_patterns": "string",
    "last_recommendation": "string",
    "last_analysis_date": "ISO datetime",
    "last_analyzed_shot_id": integer,
    "bean_contexts": [
      {
        "bag_id": integer,
        "name": "Roaster — Bean Name",
        "status": "dialing_in | dialed_in | finished | resting",
        "dialed_in_grind": number or null,
        "dialed_in_yield_g": number or null,
        "current_grind": number or null,
        "shots_pulled": integer,
        "profile": "string — brief flavor/roast description",
        "notes": "string — key learnings on this bean"
      }
    ]
  }
}

IMPORTANT: For historical shot analysis (Mode 2), return updated_coaching_state as null — never overwrite current coaching state with a historical analysis.`;

// ─── Bean Context Trimming ────────────────────────────────────────────────────

/**
 * Keeps the coaching context lean so responses stay within token budget.
 * - Active/dialing-in/resting: sent in full (current bags, need all details)
 * - Finished: only the 3 most-used, fields compacted, notes capped at 120 chars
 */
function trimBeanContexts(contexts: import("@/lib/analysis/queries").BeanContext[]) {
  const active = contexts.filter((c) => c.status !== "finished");
  const finished = contexts
    .filter((c) => c.status === "finished")
    .sort((a, b) => b.shots_pulled - a.shots_pulled)
    .slice(0, 3)
    .map((c) => ({
      bag_id: c.bag_id,
      name: c.name,
      status: c.status,
      dialed_in_grind: c.dialed_in_grind,
      dialed_in_yield_g: c.dialed_in_yield_g,
      current_grind: null,
      shots_pulled: c.shots_pulled,
      profile: c.profile.slice(0, 80),
      notes: c.notes.slice(0, 120),
    }));
  return [...active, ...finished];
}

// ─── User Message Assembly ────────────────────────────────────────────────────

async function assembleUserMessage(shotId: number) {
  const shot = await getShotById(shotId);
  if (!shot) throw new Error("Shot not found");

  const effectiveDose = shot.grinderRetentionG != null ? shot.doseG - shot.grinderRetentionG : shot.doseG;
  const brewRatio = shot.yieldG != null ? shot.yieldG / effectiveDose : null;
  const daysSinceRoast = getDaysSinceRoast(shot.bagRoastDate);
  const freshnessLabel = getFreshnessLabel(daysSinceRoast);

  const hoursSincePull = (Date.now() - new Date(shot.pulledAt).getTime()) / 3_600_000;
  const analysisMode: "recent" | "historical" = hoursSincePull <= 48 ? "recent" : "historical";

  const [
    coachingStateData,
    foreverStats,
    position,
    contextShots,
    bagDetails,
    beanStats,
    mostCommonRecipe,
    mostUsedBag,
    thresholds,
    equipment,
  ] = await Promise.all([
    getCoachingState(),
    getForeverStats(),
    getShotPositionInHistory(shotId, shot.pulledAt),
    getContextShots(shotId, shot.bagId, shot.pulledAt, analysisMode),
    getBagDetailsForAnalysis(shot.bagId),
    getBeanStats(shot.bagId),
    getMostCommonDrinkRecipe(),
    getMostUsedBag(),
    getCurrentThresholds(),
    getActiveEquipmentProfileForAnalysis(),
  ]);

  const fs = foreverStats as Record<string, unknown>;
  const bs = beanStats as Record<string, unknown>;
  const timeThresholds = thresholds.filter((t) => t.metric === "time").map((t) => ({
    min: t.minValue,
    max: t.maxValue,
    label: t.label,
  }));
  const ratioThresholds = thresholds.filter((t) => t.metric === "ratio").map((t) => ({
    min: t.minValue,
    max: t.maxValue,
    label: t.label,
  }));

  const timeClass = shot.shotTimeSeconds != null ? classifyTime(shot.shotTimeSeconds) : { label: "—" };
  const ratioClass = brewRatio != null ? classifyRatio(brewRatio) : { label: "—" };

  const userMessage = {
    request: "analyze_shot",
    analysis_mode: analysisMode,
    shot_number: position.shotNumber,
    total_shots: position.totalShots,

    coaching_state: coachingStateData
      ? { ...coachingStateData, bean_contexts: trimBeanContexts(coachingStateData.bean_contexts ?? []) }
      : null,

    current_thresholds: {
      time: timeThresholds,
      ratio: ratioThresholds,
    },

    forever_stats: {
      total_shots_pulled: Number(fs.total_shots ?? 0),
      sessions_pulling_espresso: Number(fs.sessions ?? 0),
      average_shots_per_session: Number(fs.avg_shots_per_session ?? 0),
      days_pulling_espresso: Number(fs.days_pulling ?? 0),
      average_brew_ratio: Number(fs.avg_ratio ?? 0),
      average_dose_g: Number(fs.avg_dose ?? 0),
      average_yield_g: Number(fs.avg_yield ?? 0),
      average_shot_time_seconds: Number(fs.avg_time ?? 0),
      average_shot_quality: Number(fs.avg_shot_quality ?? 0),
      average_grinder_retention_g: Number(fs.avg_retention ?? 0),
      average_balance: Number(fs.avg_balance ?? 0),
      shot_balance_distribution: {
        very_sour_pct: Number(fs.very_sour_pct ?? 0),
        sour_pct: Number(fs.sour_pct ?? 0),
        balanced_pct: Number(fs.balanced_pct ?? 0),
        bitter_pct: Number(fs.bitter_pct ?? 0),
        very_bitter_pct: Number(fs.very_bitter_pct ?? 0),
      },
      most_common_drink_recipe: mostCommonRecipe,
      most_used_bean: mostUsedBag,
    },

    current_bean: {
      roaster: shot.roasterName,
      name: shot.bagName,
      is_blend: bagDetails?.bag.isBlend ?? false,
      is_decaf: bagDetails?.bag.isDecaf ?? false,
      roast_level: bagDetails?.bag.roastLevel ?? "unspecified",
      processing_method: bagDetails?.bag.processingMethod ?? "unspecified",
      origins: bagDetails?.origins.map((o) => [o.country, o.region, o.variety].filter(Boolean).join(" · ")) ?? [],
      flavor_notes: bagDetails?.bag.notes ?? null,
      roast_date: shot.bagRoastDate,
      days_since_roast: daysSinceRoast,
      freshness_status: freshnessLabel,
      bean_stats: {
        total_shots_on_bag: Number(bs.total_shots ?? 0),
        failed_shots_on_bag: Number(bs.failed_shots ?? 0),
        average_brew_ratio: Number(bs.avg_ratio ?? 0),
        average_shot_time_seconds: Number(bs.avg_time ?? 0),
        average_shot_quality: Number(bs.avg_shot_quality ?? 0),
        average_balance: Number(bs.avg_balance ?? 0),
      },
    },

    context_shots: contextShots.map((s) => {
      if (s.isFailed) {
        return {
          pulled_at: s.pulledAt,
          is_failed: true,
          fail_reason: s.failReason ?? null,
          grind_setting: s.grindSetting,
          dose_g: s.doseG,
          notes: s.notes ?? null,
        };
      }
      const adjDose = s.grinderRetentionG != null ? s.doseG - s.grinderRetentionG : s.doseG;
      const r = s.yieldG != null ? s.yieldG / adjDose : null;
      return {
        pulled_at: s.pulledAt,
        is_failed: false,
        grind_setting: s.grindSetting,
        dose_g: s.doseG,
        adjusted_dose_g: s.grinderRetentionG != null ? Math.round(adjDose * 10) / 10 : null,
        yield_g: s.yieldG,
        brew_ratio: r != null ? Math.round(r * 100) / 100 : null,
        shot_time_seconds: s.shotTimeSeconds,
        time_classification: s.shotTimeSeconds != null ? classifyTime(s.shotTimeSeconds).label : null,
        ratio_classification: r != null ? classifyRatio(r).label : null,
        balance: s.tasteBalance,
        shot_quality: s.shotRating,
        notes: s.notes,
      };
    }),

    current_shot: {
      id: shot.id,
      pulled_at: shot.pulledAt,
      grind_setting: shot.grindSetting,
      dose_g: shot.doseG,
      yield_g: shot.yieldG,
      brew_ratio: brewRatio != null ? Math.round(brewRatio * 100) / 100 : null,
      shot_time_seconds: shot.shotTimeSeconds,
      time_classification: timeClass.label,
      ratio_classification: ratioClass.label,
      preinfusion_seconds: shot.preinfusionSeconds,
      spring_weight_lbs: shot.springWeightLbs,
      wdt_used: shot.wdtUsed,
      grinder_retention_g: shot.grinderRetentionG,
      adjusted_dose_g:
        shot.grinderRetentionG !== null
          ? Math.round((shot.doseG - shot.grinderRetentionG) * 10) / 10
          : null,
      lag_g: shot.lagG,
      days_since_roast_at_pull: daysSinceRoast,
      taste: {
        balance: shot.tasteBalance,
        shot_quality: shot.shotRating,
      },
      notes: shot.notes,
    },

    equipment: {
      machine: equipment?.machine ?? "Breville Bambino",
      grinder: equipment?.grinder ?? "Baratza Encore ESP Pro",
      tamper: equipment?.tamper ?? null,
      spring_weight_lbs: shot.springWeightLbs ?? equipment?.defaultSpringWeightLbs ?? null,
      wdt_used: shot.wdtUsed,
      known_drip_lag_g: shot.lagG ?? 7,
    },
  };

  return { userMessage, shot, analysisMode };
}

// ─── Main Action ──────────────────────────────────────────────────────────────

export async function analyzeShotById(shotId: number): Promise<AnalysisResult | null> {
  const { userMessage, shot, analysisMode } = await assembleUserMessage(shotId);

  const client = new Anthropic();
  let rawText: string;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(userMessage) }],
    });
    const content = message.content[0];
    if (content.type !== "text") return null;
    rawText = content.text;
  } catch (err) {
    console.error("Anthropic API error:", err);
    return null;
  }

  // Parse JSON response
  let parsed: {
    summary?: string;
    numbers?: string;
    recommendation?: { action?: string; reason?: string };
    bean_context?: string;
    progress_note?: string | null;
    overall_verdict?: string;
    is_stable?: boolean;
    updated_coaching_state?: CoachingStateData | null;
  } = {};

  try {
    // Extract the first {...} JSON block, handling optional code fences or preamble
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback: store raw text as summary
    parsed = { summary: rawText, overall_verdict: "needs_work" };
  }

  // Persist analysis
  await saveShootAnalysis({
    shotId,
    mode: analysisMode,
    summary: parsed.summary ?? null,
    numbers: parsed.numbers ?? null,
    recommendationAction: parsed.recommendation?.action ?? null,
    recommendationReason: parsed.recommendation?.reason ?? null,
    beanContext: parsed.bean_context ?? null,
    progressNote: parsed.progress_note ?? null,
    overallVerdict: parsed.overall_verdict ?? null,
    isStable: parsed.is_stable === true,
    rawResponse: rawText,
  });

  // Auto-lock shot when AI marks parameters stable
  if (parsed.is_stable === true) {
    await db.update(shots).set({ isLocked: true }).where(eq(shots.id, shotId));
  }

  // Upsert coaching_state for recent shots only — trim before saving to prevent DB bloat
  if (analysisMode === "recent" && parsed.updated_coaching_state) {
    const cs = parsed.updated_coaching_state;
    await upsertCoachingState({
      ...cs,
      bean_contexts: trimBeanContexts(cs.bean_contexts ?? []),
    });
  }

  return getAnalysisForShot(shotId);
}
