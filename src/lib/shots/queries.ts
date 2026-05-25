import { db } from "@/db/client";
import {
  bags,
  shots,
  drinks,
  equipmentProfiles,
  extractionThresholds,
} from "@/db/schema";
import { eq, and, sql, desc, isNotNull } from "drizzle-orm";
import { classifyTime, classifyRatio, type Classification } from "./classification";
import type { EquipmentProfile } from "@/db/schema";

export type BagOption = {
  id: number;
  roaster: string;
  name: string;
  roastDate: string;
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
  bagStatus: string;
  shotRating: number | null;
  notes: string | null;
  timeClassification: Classification;
  ratioClassification: Classification;
  drink: {
    id: number;
    overallRating: number | null;
    detectedDrinkName: string | null;
  } | null;
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
  springWeightLbs: number | null;
  wdtUsed: boolean;
  grinderRetentionG: number | null;
  acidity: number | null;
  sweetness: number | null;
  bitterness: number | null;
  body: number | null;
  aroma: number | null;
  tasteBalance: number | null;
  shotRating: number | null;
  notes: string | null;
  bagId: number;
  bagName: string;
  roasterName: string;
  bagRoastDate: string;
  timeClassification: Classification;
  ratioClassification: Classification;
  drink: {
    id: number;
    milkType: string | null;
    milkQuantityMl: number | null;
    foamMl: number | null;
    hotWaterMl: number | null;
    overallRating: number | null;
    notes: string | null;
    detectedDrinkName: string | null;
  } | null;
};

export async function getActiveBags(): Promise<BagOption[]> {
  return db
    .select({
      id: bags.id,
      roaster: bags.roaster,
      name: bags.name,
      roastDate: bags.roastDate,
    })
    .from(bags)
    .where(eq(bags.status, "active"))
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
  springWeightLbs: number | null;
  wdtUsed: boolean;
};

export async function getLastShotDefaults(): Promise<LastShotDefaults | null> {
  const [row] = await db
    .select({
      bagId: shots.bagId,
      doseG: shots.doseG,
      grindSetting: shots.grindSetting,
      lagG: shots.lagG,
      springWeightLbs: shots.springWeightLbs,
      wdtUsed: shots.wdtUsed,
    })
    .from(shots)
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
      bagStatus: bags.status,
      shotRating: shots.shotRating,
      notes: shots.notes,
    })
    .from(shots)
    .innerJoin(bags, eq(shots.bagId, bags.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(shots.pulledAt));

  if (shotRows.length === 0) return [];

  const drinkRows = await db
    .select({
      shotId: drinks.shotId,
      id: drinks.id,
      overallRating: drinks.overallRating,
      detectedDrinkName: drinks.detectedDrinkName,
    })
    .from(drinks)
    .where(
      sql`${drinks.shotId} IN (${sql.join(
        shotRows.map((s) => sql`${s.id}`),
        sql`, `
      )})`
    );

  const drinkMap = new Map(drinkRows.map((d) => [d.shotId, d]));

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
      springWeightLbs: shots.springWeightLbs,
      wdtUsed: shots.wdtUsed,
      grinderRetentionG: shots.grinderRetentionG,
      acidity: shots.acidity,
      sweetness: shots.sweetness,
      bitterness: shots.bitterness,
      body: shots.body,
      aroma: shots.aroma,
      tasteBalance: shots.tasteBalance,
      shotRating: shots.shotRating,
      notes: shots.notes,
      bagId: shots.bagId,
      bagName: bags.name,
      roasterName: bags.roaster,
      bagRoastDate: bags.roastDate,
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
      overallRating: drinks.overallRating,
      notes: drinks.notes,
      detectedDrinkName: drinks.detectedDrinkName,
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
          overallRating: drink.overallRating ?? null,
          notes: drink.notes ?? null,
          detectedDrinkName: drink.detectedDrinkName ?? null,
        }
      : null,
  };
}
