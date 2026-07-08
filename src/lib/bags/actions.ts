"use server";

import { db } from "@/db/client";
import { bags, bagOrigins, shots } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findDuplicateBag } from "./queries";
import type { Bag, NewBag } from "@/db/schema";
import { estimatePeakWindow, type RoastLevel, type ProcessingMethod } from "./freshness";
import { getDialInRecommendation } from "./parseWithAI";
import type { ParsedBagData } from "./parseWithAI";

function nameSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().split(/[\s\-\/,]+/).filter((w) => w.length >= 3));
  const A = tokenize(a);
  const B = tokenize(b);
  const intersection = [...A].filter((w) => B.has(w)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : intersection / union;
}

type OriginInput = {
  country: string;
  region?: string;
  farm?: string;
  variety?: string;
  blendPercentage?: number;
};

type CreateBagResult =
  | { success: true; id: number }
  | { duplicate: Bag }
  | { potentialMatch: { id: number; name: string } };

export async function createBag(
  _prev: unknown,
  formData: FormData
): Promise<CreateBagResult> {
  const roaster = (formData.get("roaster") as string).trim();
  const name = (formData.get("name") as string).trim();
  const force = formData.get("force") === "true";
  const replaceId = formData.get("replaceId")
    ? Number(formData.get("replaceId"))
    : null;

  if (!force) {
    const dup = await findDuplicateBag(roaster, name);
    if (dup) return { duplicate: dup };

    // Fuzzy name match — same roaster, similar name (Jaccard word overlap ≥ 0.35)
    const sameBags = await db
      .select({ id: bags.id, name: bags.name })
      .from(bags)
      .where(sql`lower(${bags.roaster}) = lower(${roaster})`);
    let bestScore = 0;
    let bestBag: { id: number; name: string } | undefined;
    for (const bag of sameBags) {
      if (!bag.name) continue;
      const score = nameSimilarity(name, bag.name);
      if (score > bestScore) { bestScore = score; bestBag = { id: bag.id, name: bag.name }; }
    }
    if (bestScore >= 0.35 && bestBag) return { potentialMatch: bestBag };
  }

  // If replacing, mark old bag as finished
  if (replaceId) {
    await db
      .update(bags)
      .set({
        status: "finished",
        finishedDate: new Date().toISOString().split("T")[0],
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(bags.id, replaceId));
  }

  const origins: OriginInput[] = JSON.parse(
    (formData.get("origins") as string) || "[]"
  );

  const isDecaf = formData.get("isDecaf") === "true";
  const roastLevel = (((formData.get("roastLevel") as string) || "unspecified") as RoastLevel);
  const processingMethod = (((formData.get("processingMethod") as string) || "unspecified") as ProcessingMethod);

  // Use user-provided peak window if present, otherwise auto-estimate
  const estimated = estimatePeakWindow(roastLevel, processingMethod, isDecaf);
  const peakStartDay = formData.get("peakStartDay")
    ? Math.max(1, Number(formData.get("peakStartDay")))
    : estimated.peakStartDay;
  const rawPeakEndDay = formData.get("peakEndDay")
    ? Math.max(1, Number(formData.get("peakEndDay")))
    : estimated.peakEndDay;
  const peakEndDay = rawPeakEndDay <= peakStartDay ? peakStartDay + 7 : rawPeakEndDay;

  const status = (formData.get("status") as "active" | "reserve") === "reserve" ? "reserve" : "active";

  const priorBagId = formData.get("priorBagId") ? Number(formData.get("priorBagId")) : undefined;

  // If user confirmed a fuzzy match and no AI tip was provided, generate one now
  let dialInTip: string | null = (formData.get("dialInTip") as string) || null;
  if (priorBagId && !dialInTip) {
    const parsedData: ParsedBagData = {
      roaster,
      name,
      roastLevel,
      processingMethod,
      origins: origins
        .filter((o) => o.country?.trim())
        .map((o) => ({ country: o.country, region: o.region || undefined, farm: o.farm || undefined, variety: o.variety || undefined })),
      notes: (formData.get("notes") as string) || undefined,
    };
    const tipResult = await getDialInRecommendation(parsedData, priorBagId);
    if ("tip" in tipResult) dialInTip = tipResult.tip;
  }

  const bagData: NewBag = {
    roaster,
    name,
    isBlend: formData.get("isBlend") === "true",
    isDecaf,
    roastLevel,
    processingMethod,
    roastDate: formData.get("roastDate") as string,
    purchaseDate: (formData.get("purchaseDate") as string) || null,
    purchaseShop: (formData.get("purchaseShop") as string) || null,
    price: formData.get("price") ? Number(formData.get("price")) : null,
    weightG: formData.get("weightG") ? Number(formData.get("weightG")) : null,
    weightCorrectionG: formData.get("weightCorrectionG") ? Number(formData.get("weightCorrectionG")) : 0,
    dialInTip,
    notes: (formData.get("notes") as string) || null,
    peakStartDay,
    peakEndDay,
    status,
  };

  const [bag] = await db.insert(bags).values(bagData).returning();

  if (origins.length > 0) {
    await db.insert(bagOrigins).values(
      origins
        .filter((o) => o.country.trim())
        .map((o) => ({
          bagId: bag.id,
          country: o.country.trim(),
          region: o.region?.trim() || null,
          farm: o.farm?.trim() || null,
          variety: o.variety?.trim() || null,
          blendPercentage: o.blendPercentage ?? null,
        }))
    );
  }

  revalidatePath("/bags");
  return { success: true, id: bag.id };
}

export async function updateBag(
  id: number,
  _prev: unknown,
  formData: FormData
): Promise<void> {
  const origins: OriginInput[] = JSON.parse(
    (formData.get("origins") as string) || "[]"
  );

  const isDecaf = formData.get("isDecaf") === "true";
  const roastLevel = (((formData.get("roastLevel") as string) || "unspecified") as RoastLevel);
  const processingMethod = (((formData.get("processingMethod") as string) || "unspecified") as ProcessingMethod);

  const estimated = estimatePeakWindow(roastLevel, processingMethod, isDecaf);
  const peakStartDay = formData.get("peakStartDay")
    ? Math.max(1, Number(formData.get("peakStartDay")))
    : estimated.peakStartDay;
  const rawPeakEndDay = formData.get("peakEndDay")
    ? Math.max(1, Number(formData.get("peakEndDay")))
    : estimated.peakEndDay;
  const peakEndDay = rawPeakEndDay <= peakStartDay ? peakStartDay + 7 : rawPeakEndDay;

  await db
    .update(bags)
    .set({
      roaster: (formData.get("roaster") as string).trim(),
      name: (formData.get("name") as string).trim(),
      isBlend: formData.get("isBlend") === "true",
      isDecaf,
      roastLevel,
      processingMethod,
      roastDate: formData.get("roastDate") as string,
      purchaseDate: (formData.get("purchaseDate") as string) || null,
      purchaseShop: (formData.get("purchaseShop") as string) || null,
      price: formData.get("price") ? Number(formData.get("price")) : null,
      weightG: formData.get("weightG") ? Number(formData.get("weightG")) : null,
      weightCorrectionG: formData.get("weightCorrectionG") ? Number(formData.get("weightCorrectionG")) : 0,
      notes: (formData.get("notes") as string) || null,
      peakStartDay,
      peakEndDay,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(bags.id, id));

  // Replace all origins
  await db.delete(bagOrigins).where(eq(bagOrigins.bagId, id));
  if (origins.length > 0) {
    await db.insert(bagOrigins).values(
      origins
        .filter((o) => o.country.trim())
        .map((o) => ({
          bagId: id,
          country: o.country.trim(),
          region: o.region?.trim() || null,
          farm: o.farm?.trim() || null,
          variety: o.variety?.trim() || null,
          blendPercentage: o.blendPercentage ?? null,
        }))
    );
  }

  revalidatePath("/bags");
  revalidatePath(`/bags/${id}`);
  redirect(`/bags/${id}`);
}

export async function markBagFinished(id: number): Promise<void> {
  const [bag] = await db.select({ weightG: bags.weightG }).from(bags).where(eq(bags.id, id)).limit(1);
  const [shotRow] = await db.all(sql`
    SELECT COALESCE(SUM(dose_g), 0) AS total_dose FROM shots WHERE bag_id = ${id}
  `) as { total_dose: number }[];

  const weightG = bag?.weightG ?? 0;
  const totalDoseG = shotRow?.total_dose ?? 0;
  const zeroingCorrection = totalDoseG - weightG;

  await db
    .update(bags)
    .set({
      status: "finished",
      finishedDate: new Date().toISOString().split("T")[0],
      weightCorrectionG: zeroingCorrection,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(bags.id, id));

  revalidatePath("/bags");
  revalidatePath(`/bags/${id}`);
  redirect("/bags");
}

export async function removeBag(id: number): Promise<void> {
  await db
    .update(bags)
    .set({ status: "removed", updatedAt: sql`(datetime('now'))` })
    .where(eq(bags.id, id));

  revalidatePath("/bags");
  redirect("/bags");
}

export async function reactivateBag(id: number): Promise<void> {
  await db
    .update(bags)
    .set({
      status: "active",
      finishedDate: null,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(bags.id, id));

  revalidatePath("/bags");
  revalidatePath(`/bags/${id}`);
  redirect(`/bags/${id}`);
}
