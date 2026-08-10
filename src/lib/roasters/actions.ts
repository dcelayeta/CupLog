"use server";

import { db } from "@/db/client";
import { roasters, bags } from "@/db/schema";
import { eq, ne, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function readFields(formData: FormData) {
  return {
    name: (formData.get("name") as string)?.trim() ?? "",
    website: (formData.get("website") as string)?.trim() || null,
    location: (formData.get("location") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
  };
}

export async function addRoaster(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string }> {
  const { name, website, location, notes } = readFields(formData);
  if (!name) return { error: "Name is required." };

  const [existing] = await db
    .select({ id: roasters.id })
    .from(roasters)
    .where(sql`lower(${roasters.name}) = lower(${name})`)
    .limit(1);
  if (existing) return { error: `A roaster named "${name}" already exists.` };

  await db.insert(roasters).values({ name, website, location, notes });

  revalidatePath("/more/roasters");
  revalidatePath("/bags/new");
  redirect("/more/roasters");
}

export async function updateRoaster(
  id: number,
  _prev: unknown,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const { name, website, location, notes } = readFields(formData);
  if (!name) return { error: "Name is required." };

  const [existing] = await db
    .select({ id: roasters.id })
    .from(roasters)
    .where(and(sql`lower(${roasters.name}) = lower(${name})`, ne(roasters.id, id)))
    .limit(1);
  if (existing) return { error: `A roaster named "${name}" already exists.` };

  await db
    .update(roasters)
    .set({ name, website, location, notes, updatedAt: sql`(datetime('now'))` })
    .where(eq(roasters.id, id));

  // Bags store the roaster name denormalized (every read path — BagCard,
  // history, home, exports — reads bags.roaster directly rather than
  // joining roasters), so a rename has to cascade to every linked bag.
  await db.update(bags).set({ roaster: name }).where(eq(bags.roasterId, id));

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteRoaster(id: number): Promise<void> {
  // Unlink rather than touch bag data — a bag's own roaster text is untouched.
  await db.update(bags).set({ roasterId: null }).where(eq(bags.roasterId, id));
  await db.delete(roasters).where(eq(roasters.id, id));

  revalidatePath("/", "layout");
  redirect("/more/roasters");
}
