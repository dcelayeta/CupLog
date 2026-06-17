import { db } from "@/db/client";
import {
  shots,
  bags,
  bagOrigins,
  extractionThresholds,
  coachingState,
  shotAnalyses,
  equipmentProfiles,
} from "@/db/schema";
import { eq, desc, lt, and, sql, not } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoredAnalysis = {
  id: number;
  shotId: number;
  analysisMode: "recent" | "historical";
  summary: string | null;
  numbers: string | null;
  recommendationAction: string | null;
  recommendationReason: string | null;
  beanContext: string | null;
  progressNote: string | null;
  overallVerdict: string | null;
  isStable: boolean;
  rawResponse: string | null;
  createdAt: string;
};

export type CoachingStateData = {
  experience_level: string;
  current_focus: string | null;
  known_patterns: string | null;
  last_recommendation: string | null;
  last_analysis_date: string | null;
  last_analyzed_shot_id: number | null;
  bean_contexts: BeanContext[];
};

export type BeanContext = {
  bag_id: number;
  name: string;
  status: "dialing_in" | "dialed_in" | "finished" | "resting";
  dialed_in_grind: number | null;
  dialed_in_yield_g: number | null;
  current_grind: number | null;
  shots_pulled: number;
  profile: string;
  notes: string;
};

// ─── Coaching State ───────────────────────────────────────────────────────────

const INITIAL_COACHING_STATE: CoachingStateData = {
  experience_level: "beginner",
  current_focus: "Dialing in espresso fundamentals — grind, dose, yield consistency",
  known_patterns:
    "Acidity sensitive — slight sourness on bright beans is often correct extraction. Bambino has 6-8g drip lag — stops pump early to compensate. WDT technique solid. 30lb spring tamper established after early channeling from 15lb spring.",
  last_recommendation: null,
  last_analysis_date: null,
  last_analyzed_shot_id: null,
  bean_contexts: [
    {
      bag_id: 1,
      name: "Metric — Ándale Market",
      status: "finished",
      dialed_in_grind: 33.5,
      dialed_in_yield_g: 37,
      current_grind: null,
      shots_pulled: 0,
      profile: "Medium roast, Latin American blend, bright and acidic, cherry/nougat/wildflower honey",
      notes: "Naturally bright — sourness was partially bean character not extraction error. Best results at grind 33-34, 30lb spring.",
    },
    {
      bag_id: 2,
      name: "Luckycat — Maomi Blend",
      status: "dialing_in",
      dialed_in_grind: null,
      dialed_in_yield_g: null,
      current_grind: 35,
      shots_pulled: 0,
      profile: "Unspecified roast, PNG/Guatemala/Mexico blend, full body, caramel/cocoa/nuts",
      notes: "Lower acidity than Ándale. Starting point grind 35, 30lb spring.",
    },
    {
      bag_id: 3,
      name: "Metric — Decaf Huila Pink Bourbon",
      status: "resting",
      dialed_in_grind: null,
      dialed_in_yield_g: null,
      current_grind: null,
      shots_pulled: 0,
      profile: "EA Washed decaf, Colombia Huila, Pink Bourbon variety, ganache/orange peel/Luxardo",
      notes: "Roasted May 18 2026. Do not use until May 28 2026 minimum. Start coarser than regular beans — decaf extracts more easily.",
    },
  ],
};

export async function getCoachingState(): Promise<CoachingStateData> {
  const [row] = await db.select().from(coachingState).where(eq(coachingState.id, 1)).limit(1);
  if (!row) return INITIAL_COACHING_STATE;
  return {
    experience_level: row.experienceLevel,
    current_focus: row.currentFocus,
    known_patterns: row.knownPatterns,
    last_recommendation: row.lastRecommendation,
    last_analysis_date: row.lastAnalysisDate,
    last_analyzed_shot_id: row.lastAnalyzedShotId,
    bean_contexts: row.beanContexts ? JSON.parse(row.beanContexts) : [],
  };
}

export async function upsertCoachingState(data: CoachingStateData): Promise<void> {
  await db
    .insert(coachingState)
    .values({
      id: 1,
      experienceLevel: data.experience_level,
      currentFocus: data.current_focus,
      knownPatterns: data.known_patterns,
      lastRecommendation: data.last_recommendation,
      lastAnalysisDate: data.last_analysis_date,
      lastAnalyzedShotId: data.last_analyzed_shot_id,
      beanContexts: JSON.stringify(data.bean_contexts),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: coachingState.id,
      set: {
        experienceLevel: data.experience_level,
        currentFocus: data.current_focus,
        knownPatterns: data.known_patterns,
        lastRecommendation: data.last_recommendation,
        lastAnalysisDate: data.last_analysis_date,
        lastAnalyzedShotId: data.last_analyzed_shot_id,
        beanContexts: JSON.stringify(data.bean_contexts),
        updatedAt: new Date().toISOString(),
      },
    });
}

// ─── Analysis Persistence ─────────────────────────────────────────────────────

export async function saveShootAnalysis(params: {
  shotId: number;
  mode: "recent" | "historical";
  summary: string | null;
  numbers: string | null;
  recommendationAction: string | null;
  recommendationReason: string | null;
  beanContext: string | null;
  progressNote: string | null;
  overallVerdict: string | null;
  isStable: boolean;
  rawResponse: string;
}): Promise<void> {
  await db.insert(shotAnalyses).values({
    shotId: params.shotId,
    analysisMode: params.mode,
    summary: params.summary,
    numbers: params.numbers,
    recommendationAction: params.recommendationAction,
    recommendationReason: params.recommendationReason,
    beanContext: params.beanContext,
    progressNote: params.progressNote,
    overallVerdict: params.overallVerdict,
    isStable: params.isStable,
    rawResponse: params.rawResponse,
  });
}

export async function getRecommendationForBags(
  bagIds: number[]
): Promise<Record<number, { action: string; verdict: string; shotId: number }>> {
  if (bagIds.length === 0) return {};

  const idList = sql.join(bagIds.map((id) => sql`${id}`), sql`, `);

  // Last shot analysis per bag (always show regardless of stability)
  const lastShotRows = await db.all(sql`
    SELECT s.bag_id, s.id as shot_id, sa.recommendation_action, sa.overall_verdict
    FROM shots s
    JOIN shot_analyses sa ON sa.shot_id = s.id
    WHERE s.bag_id IN (${idList})
      AND s.id = (SELECT MAX(id) FROM shots s2 WHERE s2.bag_id = s.bag_id)
      AND sa.recommendation_action IS NOT NULL
  `) as { bag_id: number; shot_id: number; recommendation_action: string; overall_verdict: string | null }[];

  const result: Record<number, { action: string; verdict: string; shotId: number }> = {};
  for (const row of lastShotRows) {
    result[row.bag_id] = { action: row.recommendation_action, verdict: row.overall_verdict ?? "", shotId: row.shot_id };
  }

  // For bags with no last-shot analysis, fall back to most recent stable analysis
  const missing = bagIds.filter((id) => !result[id]);
  if (missing.length > 0) {
    const missingList = sql.join(missing.map((id) => sql`${id}`), sql`, `);
    const stableRows = await db.all(sql`
      SELECT s.bag_id, s.id as shot_id, sa.recommendation_action, sa.overall_verdict
      FROM shot_analyses sa
      JOIN shots s ON sa.shot_id = s.id
      WHERE s.bag_id IN (${missingList})
        AND sa.is_stable = 1
        AND sa.recommendation_action IS NOT NULL
      ORDER BY sa.id DESC
    `) as { bag_id: number; shot_id: number; recommendation_action: string; overall_verdict: string | null }[];

    for (const row of stableRows) {
      if (!result[row.bag_id]) {
        result[row.bag_id] = { action: row.recommendation_action, verdict: row.overall_verdict ?? "", shotId: row.shot_id };
      }
    }
  }

  return result;
}

export async function getAnalysisForShot(shotId: number): Promise<StoredAnalysis | null> {
  const [row] = await db
    .select()
    .from(shotAnalyses)
    .where(eq(shotAnalyses.shotId, shotId))
    .orderBy(desc(shotAnalyses.createdAt))
    .limit(1);
  if (!row) return null;
  return row as StoredAnalysis;
}

// ─── Stats for Analysis ───────────────────────────────────────────────────────

export async function getForeverStats() {
  const [stats] = await db.all(sql`
    SELECT
      COUNT(*) as total_shots,
      COUNT(DISTINCT DATE(pulled_at)) as sessions,
      ROUND(1.0 * COUNT(*) / MAX(1, COUNT(DISTINCT DATE(pulled_at))), 1) as avg_shots_per_session,
      CAST((julianday('now') - julianday(MIN(pulled_at))) AS INTEGER) as days_pulling,
      ROUND(AVG(CAST(yield_g AS REAL) / CAST(dose_g AS REAL)), 2) as avg_ratio,
      ROUND(AVG(dose_g), 1) as avg_dose,
      ROUND(AVG(yield_g), 1) as avg_yield,
      ROUND(AVG(shot_time_seconds), 0) as avg_time,
      ROUND(AVG(shot_rating), 1) as avg_shot_quality,
      ROUND(AVG(grinder_retention_g), 2) as avg_retention,
      ROUND(AVG(taste_balance), 1) as avg_balance,
      ROUND(100.0 * SUM(CASE WHEN taste_balance = 1 THEN 1 ELSE 0 END) / MAX(1, COUNT(taste_balance)), 0) as very_sour_pct,
      ROUND(100.0 * SUM(CASE WHEN taste_balance = 2 THEN 1 ELSE 0 END) / MAX(1, COUNT(taste_balance)), 0) as sour_pct,
      ROUND(100.0 * SUM(CASE WHEN taste_balance = 3 THEN 1 ELSE 0 END) / MAX(1, COUNT(taste_balance)), 0) as balanced_pct,
      ROUND(100.0 * SUM(CASE WHEN taste_balance = 4 THEN 1 ELSE 0 END) / MAX(1, COUNT(taste_balance)), 0) as bitter_pct,
      ROUND(100.0 * SUM(CASE WHEN taste_balance = 5 THEN 1 ELSE 0 END) / MAX(1, COUNT(taste_balance)), 0) as very_bitter_pct
    FROM shots
  `) as Record<string, unknown>[];

  return stats;
}

export async function getShotPositionInHistory(
  shotId: number,
  pulledAt: string
): Promise<{ shotNumber: number; totalShots: number }> {
  const [pos] = await db.all(sql`
    SELECT
      (SELECT COUNT(*) FROM shots WHERE pulled_at <= ${pulledAt}) as shot_number,
      (SELECT COUNT(*) FROM shots) as total_shots
  `) as Record<string, number>[];

  return {
    shotNumber: Number(pos?.shot_number ?? 1),
    totalShots: Number(pos?.total_shots ?? 1),
  };
}

export async function getContextShots(
  shotId: number,
  bagId: number,
  pulledAt: string,
  mode: "recent" | "historical"
) {
  const fields = {
    pulledAt: shots.pulledAt,
    grindSetting: shots.grindSetting,
    doseG: shots.doseG,
    grinderRetentionG: shots.grinderRetentionG,
    yieldG: shots.yieldG,
    shotTimeSeconds: shots.shotTimeSeconds,
    tasteBalance: shots.tasteBalance,
    shotRating: shots.shotRating,
    notes: shots.notes,
    isFailed: shots.isFailed,
    failReason: shots.failReason,
  };

  if (mode === "recent") {
    return db
      .select(fields)
      .from(shots)
      .where(and(eq(shots.bagId, bagId), not(eq(shots.id, shotId))))
      .orderBy(desc(shots.pulledAt))
      .limit(5);
  } else {
    return db
      .select(fields)
      .from(shots)
      .where(and(eq(shots.bagId, bagId), lt(shots.pulledAt, pulledAt)))
      .orderBy(desc(shots.pulledAt))
      .limit(5);
  }
}

export async function getBagDetailsForAnalysis(bagId: number) {
  const [bag] = await db
    .select()
    .from(bags)
    .where(eq(bags.id, bagId))
    .limit(1);

  if (!bag) return null;

  const origins = await db
    .select({ country: bagOrigins.country, region: bagOrigins.region, variety: bagOrigins.variety })
    .from(bagOrigins)
    .where(eq(bagOrigins.bagId, bagId));

  return { bag, origins };
}

export async function getBeanStats(bagId: number) {
  const [stats] = await db.all(sql`
    SELECT
      COUNT(*) as total_shots,
      SUM(CASE WHEN is_failed = 1 THEN 1 ELSE 0 END) as failed_shots,
      ROUND(AVG(CASE WHEN (is_failed = 0 OR is_failed IS NULL) AND yield_g IS NOT NULL
        THEN CAST(yield_g AS REAL) / CAST(dose_g AS REAL) END), 2) as avg_ratio,
      ROUND(AVG(CASE WHEN is_failed = 0 OR is_failed IS NULL THEN shot_time_seconds END), 0) as avg_time,
      ROUND(AVG(CASE WHEN is_failed = 0 OR is_failed IS NULL THEN shot_rating END), 1) as avg_shot_quality,
      ROUND(AVG(CASE WHEN is_failed = 0 OR is_failed IS NULL THEN taste_balance END), 1) as avg_balance
    FROM shots
    WHERE bag_id = ${bagId}
  `) as Record<string, unknown>[];
  return stats;
}

export async function getMostCommonDrinkRecipe(): Promise<string | null> {
  const [row] = await db.all(sql`
    SELECT detected_drink_name as name
    FROM drinks
    WHERE detected_drink_name IS NOT NULL
    GROUP BY detected_drink_name
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `) as Record<string, string>[];
  return row?.name ?? null;
}

export async function getMostUsedBag(): Promise<string | null> {
  const [row] = await db.all(sql`
    SELECT b.roaster || ' — ' || b.name as bag_name
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    GROUP BY s.bag_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `) as Record<string, string>[];
  return row?.bag_name ?? null;
}

export async function getCurrentThresholds() {
  return db
    .select({
      metric: extractionThresholds.metric,
      minValue: extractionThresholds.minValue,
      maxValue: extractionThresholds.maxValue,
      label: extractionThresholds.label,
    })
    .from(extractionThresholds)
    .orderBy(extractionThresholds.metric, extractionThresholds.minValue);
}

export async function getActiveEquipmentProfileForAnalysis() {
  const [profile] = await db
    .select()
    .from(equipmentProfiles)
    .where(eq(equipmentProfiles.isActive, true))
    .limit(1);
  return profile ?? null;
}
