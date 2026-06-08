import { db } from "@/db/client";
import { drinks, shots, bags } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export type DrinkRow = {
  id: number;
  shotId: number;
  pulledAt: string;
  bagId: number;
  roasterName: string;
  bagName: string;
  milkType: string | null;
  milkQuantityMl: number | null;
  foamMl: number | null;
  hotWaterMl: number | null;
  yieldG: number | null;
  overallRating: number | null;
  notes: string | null;
  detectedDrinkName: string | null;
  latteArtRating: string | null;
};

export async function getDrinksForList(): Promise<DrinkRow[]> {
  const drinkRows = await db
    .select({
      id: drinks.id,
      shotId: drinks.shotId,
      pulledAt: shots.pulledAt,
      bagId: bags.id,
      roasterName: bags.roaster,
      bagName: bags.name,
      milkType: drinks.milkType,
      milkQuantityMl: drinks.milkQuantityMl,
      foamMl: drinks.foamMl,
      hotWaterMl: drinks.hotWaterMl,
      yieldG: shots.yieldG,
      overallRating: drinks.overallRating,
      notes: drinks.notes,
      detectedDrinkName: drinks.detectedDrinkName,
      latteArtRating: drinks.latteArtRating,
    })
    .from(drinks)
    .innerJoin(shots, eq(drinks.shotId, shots.id))
    .innerJoin(bags, eq(shots.bagId, bags.id))
    .orderBy(desc(shots.pulledAt));

  return drinkRows.map((d) => ({
    ...d,
    detectedDrinkName: d.detectedDrinkName ?? null,
    latteArtRating: d.latteArtRating ?? null,
  }));
}
