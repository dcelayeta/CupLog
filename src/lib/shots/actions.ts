"use server";

import { db } from "@/db/client";
import { shots, drinks, type NewDrink, type NewShot } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { classifyTime, classifyRatio, type Classification } from "./classification";
import { detectDrink } from "./drinkDetection";
import { getDaysSinceRoast, getFreshnessLabel } from "@/lib/bags/freshness";

export type ShotSaveResult = {
  shotId: number;
  brewRatio: number;
  timeClassification: Classification;
  ratioClassification: Classification;
  daysSinceRoast: number;
  freshnessLabel: string;
  bagRoastDate: string;
  detectedDrinkName: string | null;
};

type LogShotResult =
  | { success: true; shot: ShotSaveResult }
  | { error: string };

export async function logShot(
  _prev: unknown,
  formData: FormData
): Promise<LogShotResult> {
  const bagId = Number(formData.get("bagId"));
  const doseG = parseFloat(formData.get("doseG") as string);
  const bagRoastDate = formData.get("bagRoastDate") as string;
  const isFailed = formData.get("isFailed") === "true";
  const failReason = (formData.get("failReason") as string) || null;

  // Basic validation
  if (!bagId) return { error: "Please select a bag." };
  if (isNaN(doseG) || doseG < 5 || doseG > 30)
    return { error: "Dose must be between 5g and 30g." };

  const yieldRaw = formData.get("yieldG") as string;
  const yieldG = yieldRaw ? parseFloat(yieldRaw) : NaN;
  const shotTimeRaw = formData.get("shotTimeSeconds") as string;
  const shotTimeSeconds = shotTimeRaw ? parseInt(shotTimeRaw, 10) : NaN;

  if (!isFailed) {
    if (isNaN(yieldG) || yieldG < 10 || yieldG > 100)
      return { error: "Yield must be between 10g and 100g." };
    if (yieldG <= doseG) return { error: "Yield must be greater than dose." };
    if (isNaN(shotTimeSeconds) || shotTimeSeconds < 5 || shotTimeSeconds > 120)
      return { error: "Shot time must be between 5 and 120 seconds." };
  }

  const grindSetting = formData.get("grindSetting")
    ? parseFloat(formData.get("grindSetting") as string)
    : null;
  const lagG = formData.get("lagG")
    ? parseFloat(formData.get("lagG") as string)
    : null;
  const preinfusionSeconds = formData.get("preinfusionSeconds")
    ? parseInt(formData.get("preinfusionSeconds") as string, 10)
    : null;
  const springWeightLbs = formData.get("springWeightLbs")
    ? parseInt(formData.get("springWeightLbs") as string, 10)
    : null;
  const wdtUsed = formData.get("wdtUsed") === "true";
  const distributionToolUsed = formData.get("distributionToolUsed") === "true";
  const grinderRetentionG = formData.get("grinderRetentionG")
    ? parseFloat(formData.get("grinderRetentionG") as string)
    : null;
  const equipmentProfileId = formData.get("equipmentProfileId")
    ? Number(formData.get("equipmentProfileId"))
    : null;

  const tasteFields = {
    tasteBalance: formData.get("tasteBalance") ? parseInt(formData.get("tasteBalance") as string) : null,
    shotRating: formData.get("shotRating") ? parseInt(formData.get("shotRating") as string) : null,
    flowCharacteristics: ((formData.get("flowCharacteristics") as string) || null) as NewShot["flowCharacteristics"],
  };

  const pulledAtRaw = (formData.get("pulledAt") as string) || "";
  const pulledAt = pulledAtRaw ? new Date(pulledAtRaw).toISOString() : new Date().toISOString();

  const [shot] = await db
    .insert(shots)
    .values([{
      bagId,
      equipmentProfileId,
      pulledAt,
      grindSetting,
      doseG,
      yieldG: isFailed ? (isNaN(yieldG) ? null : yieldG) : yieldG,
      shotTimeSeconds: isFailed ? (isNaN(shotTimeSeconds) ? null : shotTimeSeconds) : shotTimeSeconds,
      lagG,
      preinfusionSeconds,
      springWeightLbs,
      wdtUsed,
      distributionToolUsed,
      grinderRetentionG,
      ...(isFailed ? {} : tasteFields),
      isFailed,
      failReason: isFailed ? (failReason as NewShot["failReason"]) : null,
      notes: (formData.get("notes") as string) || null,
    }])
    .returning();

  // Optional drink — skipped for failed shots
  let detectedDrinkName: string | null = null;
  const includeDrink = !isFailed && formData.get("includeDrink") === "true";

  if (includeDrink) {
    const milkQuantityMl = formData.get("milkQuantityMl")
      ? parseInt(formData.get("milkQuantityMl") as string, 10)
      : null;
    const foamMl = formData.get("foamMl")
      ? parseInt(formData.get("foamMl") as string, 10)
      : null;
    const hotWaterMl = formData.get("hotWaterMl")
      ? parseInt(formData.get("hotWaterMl") as string, 10)
      : null;
    const hasChocolate = formData.get("hasChocolate") === "true";
    const hasIceCream = formData.get("hasIceCream") === "true";
    const hasChai = formData.get("hasChai") === "true";
    const isIced = formData.get("isIced") === "true";

    detectedDrinkName = detectDrink({
      doseG,
      yieldG,
      milkMl: milkQuantityMl,
      foamMl,
      hotWaterMl,
      hasChocolate,
      hasIceCream,
      hasChai,
    });

    const drinkValues: NewDrink = {
      shotId: shot.id,
      milkType: ((formData.get("milkType") as string) || null) as NewDrink["milkType"],
      milkQuantityMl,
      foamMl,
      hotWaterMl,
      isIced,
      detectedDrinkName,
      overallRating: formData.get("overallRating")
        ? parseInt(formData.get("overallRating") as string)
        : null,
      notes: (formData.get("drinkNotes") as string) || null,
      latteArtRating: ((formData.get("latteArtRating") as string) || null) as NewDrink["latteArtRating"],
    };

    await db
      .insert(drinks)
      .values(drinkValues);
  }

  revalidatePath("/home");
  revalidatePath("/history");
  revalidatePath("/log");

  const brewRatio = yieldG / doseG;
  const daysSinceRoast = getDaysSinceRoast(bagRoastDate);

  return {
    success: true,
    shot: {
      shotId: shot.id,
      brewRatio,
      timeClassification: classifyTime(shotTimeSeconds),
      ratioClassification: classifyRatio(brewRatio),
      daysSinceRoast,
      freshnessLabel: getFreshnessLabel(daysSinceRoast),
      bagRoastDate,
      detectedDrinkName,
    },
  };
}

// ─── Parse shared shot fields ─────────────────────────────────────────────────

function parseShotFields(formData: FormData) {
  return {
    bagId: Number(formData.get("bagId")),
    doseG: parseFloat(formData.get("doseG") as string),
    yieldG: parseFloat(formData.get("yieldG") as string),
    shotTimeSeconds: parseInt(formData.get("shotTimeSeconds") as string, 10),
    grindSetting: formData.get("grindSetting") ? parseFloat(formData.get("grindSetting") as string) : null,
    lagG: formData.get("lagG") ? parseFloat(formData.get("lagG") as string) : null,
    preinfusionSeconds: formData.get("preinfusionSeconds") ? parseInt(formData.get("preinfusionSeconds") as string, 10) : null,
    springWeightLbs: formData.get("springWeightLbs") ? parseInt(formData.get("springWeightLbs") as string, 10) : null,
    wdtUsed: formData.get("wdtUsed") === "true",
    distributionToolUsed: formData.get("distributionToolUsed") === "true",
    grinderRetentionG: formData.get("grinderRetentionG") ? parseFloat(formData.get("grinderRetentionG") as string) : null,
    tasteBalance: formData.get("tasteBalance") ? parseInt(formData.get("tasteBalance") as string) : null,
    shotRating: formData.get("shotRating") ? parseInt(formData.get("shotRating") as string) : null,
    flowCharacteristics: ((formData.get("flowCharacteristics") as string) || null) as NewShot["flowCharacteristics"],
    isLocked: formData.get("isLocked") === "true",
    isFailed: formData.get("isFailed") === "true",
    failReason: ((formData.get("failReason") as string) || null) as NewShot["failReason"],
    notes: (formData.get("notes") as string) || null,
    pulledAt: (() => {
      const raw = (formData.get("pulledAt") as string) || "";
      return raw ? new Date(raw).toISOString() : new Date().toISOString();
    })(),
  };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateShot(
  id: number,
  _prev: unknown,
  formData: FormData
): Promise<{ error: string } | null> {
  const f = parseShotFields(formData);

  if (!f.bagId) return { error: "Please select a bag." };
  if (isNaN(f.doseG) || f.doseG < 5 || f.doseG > 30) return { error: "Dose must be between 5g and 30g." };
  if (!f.isFailed) {
    if (isNaN(f.yieldG) || f.yieldG < 10 || f.yieldG > 100) return { error: "Yield must be between 10g and 100g." };
    if (f.yieldG <= f.doseG) return { error: "Yield must be greater than dose." };
    if (isNaN(f.shotTimeSeconds) || f.shotTimeSeconds < 5 || f.shotTimeSeconds > 120) return { error: "Shot time must be between 5 and 120 seconds." };
  }

  await db.update(shots).set({
    bagId: f.bagId,
    pulledAt: f.pulledAt,
    grindSetting: f.grindSetting,
    doseG: f.doseG,
    yieldG: f.isFailed ? (isNaN(f.yieldG) ? null : f.yieldG) : f.yieldG,
    shotTimeSeconds: f.isFailed ? (isNaN(f.shotTimeSeconds) ? null : f.shotTimeSeconds) : f.shotTimeSeconds,
    lagG: f.lagG,
    preinfusionSeconds: f.preinfusionSeconds,
    springWeightLbs: f.springWeightLbs,
    wdtUsed: f.wdtUsed,
    distributionToolUsed: f.distributionToolUsed,
    grinderRetentionG: f.grinderRetentionG,
    tasteBalance: f.isFailed ? null : f.tasteBalance,
    shotRating: f.isFailed ? null : f.shotRating,
    flowCharacteristics: f.flowCharacteristics,
    isLocked: f.isLocked,
    isFailed: f.isFailed,
    failReason: f.isFailed ? f.failReason : null,
    notes: f.notes,
  }).where(eq(shots.id, id));

  const includeDrink = !f.isFailed && formData.get("includeDrink") === "true";

  // Get existing drink if any
  const [existingDrink] = await db.select({ id: drinks.id }).from(drinks).where(eq(drinks.shotId, id)).limit(1);

  if (!includeDrink) {
    // Remove drink if it existed
    if (existingDrink) {
      await db.delete(drinks).where(eq(drinks.id, existingDrink.id));
    }
  } else {
    const milkQuantityMl = formData.get("milkQuantityMl") ? parseInt(formData.get("milkQuantityMl") as string, 10) : null;
    const foamMl = formData.get("foamMl") ? parseInt(formData.get("foamMl") as string, 10) : null;
    const hotWaterMl = formData.get("hotWaterMl") ? parseInt(formData.get("hotWaterMl") as string, 10) : null;
    const hasChocolate = formData.get("hasChocolate") === "true";
    const hasIceCream = formData.get("hasIceCream") === "true";
    const hasChai = formData.get("hasChai") === "true";
    const isIced = formData.get("isIced") === "true";

    const { doseG: updateDoseG, yieldG: updateYieldG } = f;
    const detectedDrinkName = detectDrink({
      doseG: updateDoseG,
      yieldG: updateYieldG,
      milkMl: milkQuantityMl,
      foamMl,
      hotWaterMl,
      hasChocolate,
      hasIceCream,
      hasChai,
    });

    const drinkData = {
      milkType: ((formData.get("milkType") as string) || null) as NewDrink["milkType"],
      milkQuantityMl,
      foamMl,
      hotWaterMl,
      isIced,
      detectedDrinkName,
      overallRating: formData.get("overallRating") ? parseInt(formData.get("overallRating") as string) : null,
      notes: (formData.get("drinkNotes") as string) || null,
      latteArtRating: ((formData.get("latteArtRating") as string) || null) as NewDrink["latteArtRating"],
    };

    if (existingDrink) {
      await db.update(drinks).set(drinkData).where(eq(drinks.id, existingDrink.id));
    } else {
      await db.insert(drinks).values({ shotId: id, ...drinkData });
    }
  }

  revalidatePath("/history");
  revalidatePath(`/history/${id}`);
  redirect(`/history/${id}`);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteShot(id: number): Promise<void> {
  const [drink] = await db.select({ id: drinks.id }).from(drinks).where(eq(drinks.shotId, id)).limit(1);
  if (drink) {
    await db.delete(drinks).where(eq(drinks.id, drink.id));
  }
  await db.delete(shots).where(eq(shots.id, id));
  revalidatePath("/home");
  revalidatePath("/history");
  redirect("/history");
}
