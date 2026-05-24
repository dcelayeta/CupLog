"use server";

import { db } from "@/db/client";
import { bags, bagOrigins } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findDuplicateBag } from "./queries";
import type { Bag, NewBag } from "@/db/schema";

type OriginInput = {
  country: string;
  region?: string;
  farm?: string;
  variety?: string;
  blendPercentage?: number;
};

type CreateBagResult =
  | { success: true; id: number }
  | { duplicate: Bag };

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

  const bagData: NewBag = {
    roaster,
    name,
    isBlend: formData.get("isBlend") === "true",
    isDecaf: formData.get("isDecaf") === "true",
    roastLevel: ((formData.get("roastLevel") as string) ||
      "unspecified") as NewBag["roastLevel"],
    processingMethod: ((formData.get("processingMethod") as string) ||
      "unspecified") as NewBag["processingMethod"],
    roastDate: formData.get("roastDate") as string,
    purchaseDate: (formData.get("purchaseDate") as string) || null,
    purchaseShop: (formData.get("purchaseShop") as string) || null,
    price: formData.get("price") ? Number(formData.get("price")) : null,
    weightG: formData.get("weightG") ? Number(formData.get("weightG")) : null,
    notes: (formData.get("notes") as string) || null,
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

  await db
    .update(bags)
    .set({
      roaster: (formData.get("roaster") as string).trim(),
      name: (formData.get("name") as string).trim(),
      isBlend: formData.get("isBlend") === "true",
      isDecaf: formData.get("isDecaf") === "true",
      roastLevel: ((formData.get("roastLevel") as string) ||
        "unspecified") as NewBag["roastLevel"],
      processingMethod: ((formData.get("processingMethod") as string) ||
        "unspecified") as NewBag["processingMethod"],
      roastDate: formData.get("roastDate") as string,
      purchaseDate: (formData.get("purchaseDate") as string) || null,
      purchaseShop: (formData.get("purchaseShop") as string) || null,
      price: formData.get("price") ? Number(formData.get("price")) : null,
      weightG: formData.get("weightG") ? Number(formData.get("weightG")) : null,
      notes: (formData.get("notes") as string) || null,
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
  await db
    .update(bags)
    .set({
      status: "finished",
      finishedDate: new Date().toISOString().split("T")[0],
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
