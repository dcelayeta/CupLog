import { db } from "@/db/client";
import {
  bags,
  shots,
  drinks,
  equipmentProfiles,
  extractionThresholds,
  shotAnalyses,
} from "@/db/schema";
import { eq, and, sql, desc, isNotNull } from "drizzle-orm";
import { classifyTime, classifyRatio, type Classification } from "./classification";
import type { EquipmentProfile } from "@/db/schema";

export type BagOption = {
  id: number;
  roaster: string;
  name: string;
  roastDate: string;
  status: string;
  isDecaf: boolean;
  peakStartDay: number | null;
  peakEndDay: number | null;
};

export type ShotRow = {
  id: number;
  pulledAt: string;
  grindSetting: number | null;
  doseG: number;
  yieldG: number | null;
  shotTimeSeconds: number | null;
  bagId: number;
  bagName: string;
  roasterName: string;
  bagRoastDate: string;
  bagPeakStartDay: number | null;
  bagPeakEndDay: number | null;
  bagStatus: string;
  shotRating: number | null;
  notes: string | null;
  isLocked: boolean;
  isFailed: boolean;
  failReason: string | null;
  timeClassification: Classification;
  ratioClassification: Classification;
  drink: {
    id: number;
    overallRating: number | null;
    detectedDrinkName: string | null;
  } | null;
  hasAnalysis: boolean;
};

export type ShotDetail = {
  id: number;
  pulledAt: string;
  grindSetting: number | null;
  doseG: number;
  yieldG: number | null;
  shotTimeSeconds: number | null;
  lagG: number | null;
  preinfusionSeconds: number | null;
  temperatureC: number | null;
  springWeightLbs: number | null;
  wdtUsed: boolean;
  distributionToolUsed: boolean;
  grinderRetentionG: number | null;
  tasteBalance: number | null;
  shotRating: number | null;
  flowCharacteristics: string | null;
  isLocked: boolean;
  isFailed: boolean;
  failReason: string | null;
  notes: string | null;
  bagId: number;
  bagName: string;
  roasterName: string;
  bagRoastDate: string;
  bagPeakStartDay: number | null;
  bagPeakEndDay: number | null;
  timeClassification: Classification;
  ratioClassification: Classification;
  drink: {
    id: number;
    milkType: string | null;
    milkQuantityMl: number | null;
    foamMl: number | null;
    hotWaterMl: number | null;
    isIced: boolean;
    overallRating: number | null;
    notes: string | null;
    detectedDrinkName: string | null;
    latteArtRating: string | null;
  } | null;
};

export async function getActiveBags(): Promise<BagOption[]> {
  return db
    .select({
      id: bags.id,
      roaster: bags.roaster,
      name: bags.name,
      roastDate: bags.roastDate,
      status: bags.status,
      isDecaf: bags.isDecaf,
      peakStartDay: bags.peakStartDay,
      peakEndDay: bags.peakEndDay,
    })
    .from(bags)
    .where(eq(bags.status, "active"))
    .orderBy(desc(bags.roastDate));
}

export async function getAllBagsForHistory(): Promise<BagOption[]> {
  return db
    .select({
      id: bags.id,
      roaster: bags.roaster,
      name: bags.name,
      roastDate: bags.roastDate,
      status: bags.status,
      isDecaf: bags.isDecaf,
      peakStartDay: bags.peakStartDay,
      peakEndDay: bags.peakEndDay,
    })
    .from(bags)
    .where(sql`${bags.status} != ${"removed"}`)
    .orderBy(desc(bags.roastDate));
}

export async function getActiveEquipmentProfile(): Promise<EquipmentProfile | null> {
  const [profile] = await db
    .select()
    .from(equipmentProfiles)
    .where(eq(equipmentProfiles.isActive, true))
    .limit(1);
  return profile ?? null;
}


export type LastShotDefaults = {
  bagId: number;
  doseG: number;
  grindSetting: number | null;
  lagG: number | null;
  temperatureC: number | null;
  springWeightLbs: number | null;
  wdtUsed: boolean;
  distributionToolUsed: boolean;
  preinfusionSeconds: number | null;
  yieldG: number | null;
  grinderRetentionG: number | null;
  isLocked: boolean;
  aiRecommendationAction: string | null;
  pulledAt: string;
  shotRating: number | null;
};

export async function getLatestShotId(): Promise<number | null> {
  const [row] = await db
    .select({ id: shots.id })
    .from(shots)
    .orderBy(desc(shots.pulledAt))
    .limit(1);
  return row?.id ?? null;
}

export async function getLastShotDefaultsPerBag(): Promise<Record<number, LastShotDefaults>> {
  const rows = await db
    .select({
      bagId: shots.bagId,
      doseG: shots.doseG,
      grindSetting: shots.grindSetting,
      lagG: shots.lagG,
      temperatureC: shots.temperatureC,
      springWeightLbs: shots.springWeightLbs,
      wdtUsed: shots.wdtUsed,
      distributionToolUsed: shots.distributionToolUsed,
      preinfusionSeconds: shots.preinfusionSeconds,
      yieldG: shots.yieldG,
      grinderRetentionG: shots.grinderRetentionG,
      isLocked: shots.isLocked,
      aiRecommendationAction: shotAnalyses.recommendationAction,
      pulledAt: shots.pulledAt,
      shotRating: shots.shotRating,
    })
    .from(shots)
    .leftJoin(shotAnalyses, eq(shotAnalyses.shotId, shots.id))
    .where(sql`${shots.id} IN (SELECT MAX(id) FROM shots GROUP BY bag_id)`);
  return Object.fromEntries(rows.map(r => [r.bagId, r]));
}

export async function getLastShotDefaults(): Promise<LastShotDefaults | null> {
  const [row] = await db
    .select({
      bagId: shots.bagId,
      doseG: shots.doseG,
      grindSetting: shots.grindSetting,
      lagG: shots.lagG,
      temperatureC: shots.temperatureC,
      springWeightLbs: shots.springWeightLbs,
      wdtUsed: shots.wdtUsed,
      distributionToolUsed: shots.distributionToolUsed,
      preinfusionSeconds: shots.preinfusionSeconds,
      yieldG: shots.yieldG,
      grinderRetentionG: shots.grinderRetentionG,
      isLocked: shots.isLocked,
      aiRecommendationAction: shotAnalyses.recommendationAction,
      pulledAt: shots.pulledAt,
      shotRating: shots.shotRating,
    })
    .from(shots)
    .leftJoin(shotAnalyses, eq(shotAnalyses.shotId, shots.id))
    .orderBy(desc(shots.pulledAt))
    .limit(1);
  return row ?? null;
}

export async function getAverageRetention(limit = 10): Promise<number | null> {
  const [row] = await db
    .select({ avg: sql<number>`avg(${shots.grinderRetentionG})` })
    .from(
      db
        .select({ grinderRetentionG: shots.grinderRetentionG })
        .from(shots)
        .where(isNotNull(shots.grinderRetentionG))
        .orderBy(desc(shots.pulledAt))
        .limit(limit)
        .as("recent")
    );
  const val = row?.avg;
  return val != null ? Math.round(val * 100) / 100 : null;
}

export type ShotDosageRecord = {
  bagId: number;
  pulledAt: string;
  doseG: number;
  isDecaf: number; // 0 | 1 from SQLite integer
};

export async function getShotDosageHistory(days = 45): Promise<ShotDosageRecord[]> {
  const cutoff = `-${days} days`;
  return db.all(sql`
    SELECT s.bag_id AS bagId, s.pulled_at AS pulledAt, s.dose_g AS doseG, CAST(b.is_decaf AS INTEGER) AS isDecaf
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    WHERE s.is_failed = 0
      AND s.pulled_at >= datetime('now', ${cutoff})
    ORDER BY s.pulled_at ASC
  `) as Promise<ShotDosageRecord[]>;
}

export type AverageDailyDose = {
  total: number | null;
  regular: number | null;
  decaf: number | null;
};

export async function getAverageDailyDose(): Promise<AverageDailyDose> {
  const rows = await db.all(sql`
    SELECT
      b.is_decaf,
      ROUND(
        SUM(s.dose_g) * 1.0 /
        MAX(1, CAST(julianday('now') - julianday(MIN(s.pulled_at)) AS INTEGER)),
        1
      ) AS daily_g
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    WHERE s.is_failed = 0
      AND s.pulled_at >= datetime('now', '-60 days')
    GROUP BY b.is_decaf
  `) as { is_decaf: number; daily_g: number }[];

  let regular: number | null = null;
  let decaf: number | null = null;
  for (const row of rows) {
    if (row.is_decaf) decaf = row.daily_g;
    else regular = row.daily_g;
  }
  const total =
    regular != null || decaf != null
      ? Math.round(((regular ?? 0) + (decaf ?? 0)) * 10) / 10
      : null;
  return { total, regular, decaf };
}

export async function getRecentAvgDosePerBag(
  bagIds: number[],
  limit = 10
): Promise<Record<number, number>> {
  if (bagIds.length === 0) return {};
  const idList = sql.join(bagIds.map((id) => sql`${id}`), sql`, `);
  const rows = await db.all(sql`
    SELECT bag_id, ROUND(AVG(dose_g), 1) AS avg_dose
    FROM (
      SELECT bag_id, dose_g,
        ROW_NUMBER() OVER (PARTITION BY bag_id ORDER BY pulled_at DESC) AS rn
      FROM shots
      WHERE is_failed = 0 AND bag_id IN (${idList})
    )
    WHERE rn <= ${limit}
    GROUP BY bag_id
  `) as { bag_id: number; avg_dose: number }[];
  return Object.fromEntries(rows.map((r) => [r.bag_id, r.avg_dose]));
}

export async function getPerBagDailyDose(bagIds: number[]): Promise<Record<number, number>> {
  if (bagIds.length === 0) return {};
  const idList = sql.join(bagIds.map((id) => sql`${id}`), sql`, `);
  const rows = await db.all(sql`
    SELECT
      bag_id,
      SUM(dose_g) AS total_dose,
      MAX(1, CAST(julianday('now') - julianday(MIN(pulled_at)) AS INTEGER)) AS days_active
    FROM shots
    WHERE is_failed = 0
      AND bag_id IN (${idList})
      AND pulled_at >= datetime('now', '-60 days')
    GROUP BY bag_id
  `) as { bag_id: number; total_dose: number; days_active: number }[];
  return Object.fromEntries(
    rows.map((r) => [r.bag_id, Math.round((r.total_dose / r.days_active) * 10) / 10])
  );
}

export async function getShotsForHistory(bagId?: number): Promise<ShotRow[]> {
  const conditions = bagId ? [eq(shots.bagId, bagId)] : [];

  const dbThresholds = await db.select().from(extractionThresholds);

  const shotRows = await db
    .select({
      id: shots.id,
      pulledAt: shots.pulledAt,
      grindSetting: shots.grindSetting,
      doseG: shots.doseG,
      yieldG: shots.yieldG,
      shotTimeSeconds: shots.shotTimeSeconds,
      bagId: shots.bagId,
      bagName: bags.name,
      roasterName: bags.roaster,
      bagRoastDate: bags.roastDate,
      bagPeakStartDay: bags.peakStartDay,
      bagPeakEndDay: bags.peakEndDay,
      bagStatus: bags.status,
      shotRating: shots.shotRating,
      notes: shots.notes,
      isLocked: shots.isLocked,
      isFailed: shots.isFailed,
      failReason: shots.failReason,
    })
    .from(shots)
    .innerJoin(bags, eq(shots.bagId, bags.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(shots.pulledAt));

  if (shotRows.length === 0) return [];

  const shotIdList = sql.join(shotRows.map((s) => sql`${s.id}`), sql`, `);

  const [drinkRows, analysisRows] = await Promise.all([
    db
      .select({
        shotId: drinks.shotId,
        id: drinks.id,
        overallRating: drinks.overallRating,
        detectedDrinkName: drinks.detectedDrinkName,
      })
      .from(drinks)
      .where(sql`${drinks.shotId} IN (${shotIdList})`),
    db
      .select({ shotId: shotAnalyses.shotId })
      .from(shotAnalyses)
      .where(sql`${shotAnalyses.shotId} IN (${shotIdList})`),
  ]);

  const drinkMap = new Map(drinkRows.map((d) => [d.shotId, d]));
  const analysisSet = new Set(analysisRows.map((a) => a.shotId));

  const noData: Classification = { label: "—", color: "#8E8E93" };
  return shotRows.map((s) => {
    const ratio = s.yieldG != null ? s.yieldG / s.doseG : null;
    const d = drinkMap.get(s.id);
    return {
      ...s,
      bagStatus: s.bagStatus,
      notes: s.notes ?? null,
      timeClassification: s.shotTimeSeconds != null ? classifyTime(s.shotTimeSeconds, dbThresholds) : noData,
      ratioClassification: ratio != null ? classifyRatio(ratio, dbThresholds) : noData,
      drink: d
        ? {
            id: d.id,
            overallRating: d.overallRating,
            detectedDrinkName: d.detectedDrinkName ?? null,
          }
        : null,
      isLocked: s.isLocked,
      hasAnalysis: analysisSet.has(s.id),
    };
  });
}

export async function getShotById(id: number): Promise<ShotDetail | null> {
  const dbThresholds = await db.select().from(extractionThresholds);

  const [shot] = await db
    .select({
      id: shots.id,
      pulledAt: shots.pulledAt,
      grindSetting: shots.grindSetting,
      doseG: shots.doseG,
      yieldG: shots.yieldG,
      shotTimeSeconds: shots.shotTimeSeconds,
      lagG: shots.lagG,
      preinfusionSeconds: shots.preinfusionSeconds,
      temperatureC: shots.temperatureC,
      springWeightLbs: shots.springWeightLbs,
      wdtUsed: shots.wdtUsed,
      distributionToolUsed: shots.distributionToolUsed,
      grinderRetentionG: shots.grinderRetentionG,
      tasteBalance: shots.tasteBalance,
      shotRating: shots.shotRating,
      flowCharacteristics: shots.flowCharacteristics,
      isLocked: shots.isLocked,
      isFailed: shots.isFailed,
      failReason: shots.failReason,
      notes: shots.notes,
      bagId: shots.bagId,
      bagName: bags.name,
      roasterName: bags.roaster,
      bagRoastDate: bags.roastDate,
      bagPeakStartDay: bags.peakStartDay,
      bagPeakEndDay: bags.peakEndDay,
    })
    .from(shots)
    .innerJoin(bags, eq(shots.bagId, bags.id))
    .where(eq(shots.id, id))
    .limit(1);

  if (!shot) return null;

  const [drink] = await db
    .select({
      id: drinks.id,
      milkType: drinks.milkType,
      milkQuantityMl: drinks.milkQuantityMl,
      foamMl: drinks.foamMl,
      hotWaterMl: drinks.hotWaterMl,
      isIced: drinks.isIced,
      overallRating: drinks.overallRating,
      notes: drinks.notes,
      detectedDrinkName: drinks.detectedDrinkName,
      latteArtRating: drinks.latteArtRating,
    })
    .from(drinks)
    .where(eq(drinks.shotId, id))
    .limit(1);

  const ratio = shot.yieldG != null ? shot.yieldG / shot.doseG : null;
  const noData: Classification = { label: "—", color: "#8E8E93" };

  return {
    ...shot,
    timeClassification: shot.shotTimeSeconds != null ? classifyTime(shot.shotTimeSeconds, dbThresholds) : noData,
    ratioClassification: ratio != null ? classifyRatio(ratio, dbThresholds) : noData,
    drink: drink
      ? {
          id: drink.id,
          milkType: drink.milkType ?? null,
          milkQuantityMl: drink.milkQuantityMl ?? null,
          foamMl: drink.foamMl ?? null,
          hotWaterMl: drink.hotWaterMl ?? null,
          isIced: drink.isIced,
          overallRating: drink.overallRating ?? null,
          notes: drink.notes ?? null,
          detectedDrinkName: drink.detectedDrinkName ?? null,
          latteArtRating: drink.latteArtRating ?? null,
        }
      : null,
  };
}

// ─── Recent shots for log form ────────────────────────────────────────────────

export type RecentShotSummary = {
  id: number;
  bagId: number;
  pulledAt: string;
  grindSetting: number | null;
  doseG: number;
  grinderRetentionG: number | null;
  yieldG: number | null;
  shotTimeSeconds: number | null;
  shotRating: number | null;
  flowCharacteristics: string | null;
  tasteBalance: number | null;
  isLocked: boolean;
};

export async function getRecentShotsForAllBags(
  bagIds: number[],
  limit = 5
): Promise<Record<number, RecentShotSummary[]>> {
  if (bagIds.length === 0) return {};

  const idList = sql.join(bagIds.map((id) => sql`${id}`), sql`, `);

  const rows = await db.all(sql`
    SELECT id, bag_id, pulled_at, grind_setting, dose_g, grinder_retention_g,
           yield_g, shot_time_seconds, shot_rating, flow_characteristics,
           taste_balance, is_locked
    FROM (
      SELECT *,
             ROW_NUMBER() OVER (PARTITION BY bag_id ORDER BY pulled_at DESC) AS rn
      FROM shots
      WHERE bag_id IN (${idList})
        AND (is_failed IS NULL OR is_failed = 0)
    )
    WHERE rn <= ${limit}
    ORDER BY bag_id, pulled_at DESC
  `) as {
    id: number; bag_id: number; pulled_at: string; grind_setting: number | null;
    dose_g: number; grinder_retention_g: number | null; yield_g: number | null;
    shot_time_seconds: number | null; shot_rating: number | null;
    flow_characteristics: string | null; taste_balance: number | null; is_locked: number;
  }[];

  const result: Record<number, RecentShotSummary[]> = {};
  for (const row of rows) {
    const bagId = Number(row.bag_id);
    if (!result[bagId]) result[bagId] = [];
    result[bagId].push({
      id: Number(row.id),
      bagId,
      pulledAt: String(row.pulled_at),
      grindSetting: row.grind_setting != null ? Number(row.grind_setting) : null,
      doseG: Number(row.dose_g),
      grinderRetentionG: row.grinder_retention_g != null ? Number(row.grinder_retention_g) : null,
      yieldG: row.yield_g != null ? Number(row.yield_g) : null,
      shotTimeSeconds: row.shot_time_seconds != null ? Number(row.shot_time_seconds) : null,
      shotRating: row.shot_rating != null ? Number(row.shot_rating) : null,
      flowCharacteristics: row.flow_characteristics ? String(row.flow_characteristics) : null,
      tasteBalance: row.taste_balance != null ? Number(row.taste_balance) : null,
      isLocked: Boolean(row.is_locked),
    });
  }
  return result;
}
