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
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "");
  const tokenize = (s: string): string[] =>
    normalize(s).split(/\s+/).filter((w) => w.length >= 3);

  const charDice = (x: string, y: string): number => {
    if (x === y) return 1;
    const bg = (s: string) => {
      const set = new Set<string>();
      for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
      return set;
    };
    const X = bg(x); const Y = bg(y);
    if (!X.size || !Y.size) return 0;
    const inter = [...X].filter((g) => Y.has(g)).length;
    return (2 * inter) / (X.size + Y.size);
  };

  const A = tokenize(a);
  const B = tokenize(b);
  if (!A.length || !B.length) return 0;

  const setA = new Set(A); const setB = new Set(B);
  const wordInter = [...setA].filter((w) => setB.has(w)).length;
  const wordUnion = new Set([...setA, ...setB]).size;
  const wordJaccard = wordUnion === 0 ? 0 : wordInter / wordUnion;

  const [shorter, longer] = A.length <= B.length ? [A, B] : [B, A];
  let charTotal = 0;
  for (const token of shorter) {
    charTotal += Math.max(...longer.map((t) => charDice(token, t)));
  }
  const charScore = 0.8 * (charTotal / shorter.length);

  return Math.max(wordJaccard, charScore);
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
  let roaster = (formData.get("roaster") as string).trim();
  let name = (formData.get("name") as string).trim();
  const force = formData.get("force") === "true";
  const replaceId = formData.get("replaceId")
    ? Number(formData.get("replaceId"))
    : null;

  if (!force) {
    const dup = await findDuplicateBag(roaster, name);
    if (dup) return { duplicate: dup };

    // Fuzzy name match — same roaster, similar name (score ≥ 0.45)
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
    if (bestScore >= 0.45 && bestBag) return { potentialMatch: bestBag };
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

  // Parse as mutable so prior-bag backfill can override unspecified values
  let origins: OriginInput[] = JSON.parse((formData.get("origins") as string) || "[]");
  let isBlend = formData.get("isBlend") === "true";
  let isDecaf = formData.get("isDecaf") === "true";
  let roastLevel = ((formData.get("roastLevel") as string) || "unspecified") as RoastLevel;
  let processingMethod = ((formData.get("processingMethod") as string) || "unspecified") as ProcessingMethod;

  const priorBagId = formData.get("priorBagId") ? Number(formData.get("priorBagId")) : undefined;

  // If user confirmed a fuzzy or exact match, backfill any unspecified fields from prior bag
  if (priorBagId) {
    const [prior] = await db
      .select({ roaster: bags.roaster, name: bags.name, roastLevel: bags.roastLevel, processingMethod: bags.processingMethod, isBlend: bags.isBlend, isDecaf: bags.isDecaf })
      .from(bags)
      .where(eq(bags.id, priorBagId))
      .limit(1);
    if (prior) {
      // Always correct to the canonical roaster + name so the bag counter groups correctly
      roaster = prior.roaster;
      name = prior.name;
      if (roastLevel === "unspecified" && prior.roastLevel) roastLevel = prior.roastLevel as RoastLevel;
      if (processingMethod === "unspecified" && prior.processingMethod) processingMethod = prior.processingMethod as ProcessingMethod;
      if (!isBlend) isBlend = prior.isBlend ?? false;
      if (!isDecaf) isDecaf = prior.isDecaf ?? false;

      const hasOrigins = origins.some((o) => o.country?.trim());
      if (!hasOrigins) {
        const priorOrigins = await db
          .select({ country: bagOrigins.country, region: bagOrigins.region, farm: bagOrigins.farm, variety: bagOrigins.variety })
          .from(bagOrigins)
          .where(eq(bagOrigins.bagId, priorBagId));
        if (priorOrigins.length) {
          origins = priorOrigins.map((o) => ({
            country: o.country,
            region: o.region ?? undefined,
            farm: o.farm ?? undefined,
            variety: o.variety ?? undefined,
          }));
        }
      }
    }
  }

  // Use user-provided peak window if present, otherwise auto-estimate from (backfilled) values
  const estimated = estimatePeakWindow(roastLevel, processingMethod, isDecaf);
  const peakStartDay = formData.get("peakStartDay")
    ? Math.max(1, Number(formData.get("peakStartDay")))
    : estimated.peakStartDay;
  const rawPeakEndDay = formData.get("peakEndDay")
    ? Math.max(1, Number(formData.get("peakEndDay")))
    : estimated.peakEndDay;
  const peakEndDay = rawPeakEndDay <= peakStartDay ? peakStartDay + 7 : rawPeakEndDay;

  const status = (formData.get("status") as "active" | "reserve") === "reserve" ? "reserve" : "active";

  // Generate dial-in tip if user confirmed prior bag and no AI tip already provided
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
    isBlend,
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
