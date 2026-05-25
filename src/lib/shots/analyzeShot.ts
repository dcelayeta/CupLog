"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getShotById } from "@/lib/shots/queries";
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

Cross-reference against these standards always. If Diego's database thresholds have drifted significantly from standard, note it honestly.

### Database Thresholds (for label consistency only)
current_thresholds in the user message contains Diego's configured labels. Use these labels when referring to classifications so your language matches his UI.

### Balance Scale
1 → Very Sour, 2 → Sour, 3 → Balanced, 4 → Bitter, 5 → Very Bitter

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
- Compare time and ratio against both industry standards and database labels
- Does taste and balance match what numbers predict?
- Do notes reveal anything numbers miss?
- Flag contradictions explicitly
- Never flag 6-8g Bambino drip lag as abnormal

### 3. The One Thing to Change
Exactly ONE specific recommendation. Never multiple adjustments simultaneously.
- Recent shot: "Go 2 clicks finer on the grinder (from X to Y)"
- Historical shot: "At the time, the right move would have been..."
- Dialed in: "Keep everything identical"

If dialing in (shots 1-7 on bag): recommendation can be more directional ("go significantly finer, try 33-34") since the range is still being established.

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

## Response Format

Return JSON with this exact structure:

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

// ─── User Message Assembly ────────────────────────────────────────────────────

async function assembleUserMessage(shotId: number) {
  const shot = await getShotById(shotId);
  if (!shot) throw new Error("Shot not found");

  const brewRatio = shot.yieldG != null ? shot.yieldG / shot.doseG : null;
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

    coaching_state: coachingStateData,

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
        average_brew_ratio: Number(bs.avg_ratio ?? 0),
        average_shot_time_seconds: Number(bs.avg_time ?? 0),
        average_shot_quality: Number(bs.avg_shot_quality ?? 0),
        average_balance: Number(bs.avg_balance ?? 0),
      },
    },

    context_shots: contextShots
      .filter((s) => s.yieldG != null && s.shotTimeSeconds != null)
      .map((s) => {
        const r = s.yieldG! / s.doseG;
        return {
          pulled_at: s.pulledAt,
          grind_setting: s.grindSetting,
          dose_g: s.doseG,
          yield_g: s.yieldG,
          brew_ratio: Math.round(r * 100) / 100,
          shot_time_seconds: s.shotTimeSeconds,
          time_classification: classifyTime(s.shotTimeSeconds!).label,
          ratio_classification: classifyRatio(r).label,
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
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(userMessage) }],
  });

  const content = message.content[0];
  if (content.type !== "text") return null;
  const rawText = content.text;

  // Parse JSON response
  let parsed: {
    summary?: string;
    numbers?: string;
    recommendation?: { action?: string; reason?: string };
    bean_context?: string;
    progress_note?: string | null;
    overall_verdict?: string;
    updated_coaching_state?: CoachingStateData | null;
  } = {};

  try {
    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    parsed = JSON.parse(jsonText);
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
    rawResponse: rawText,
  });

  // Upsert coaching_state for recent shots only
  if (analysisMode === "recent" && parsed.updated_coaching_state) {
    await upsertCoachingState(parsed.updated_coaching_state);
  }

  return getAnalysisForShot(shotId);
}
