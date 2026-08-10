"use server";

import { db } from "@/db/client";
import { roasters, bags } from "@/db/schema";
import { eq, ne, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function readFields(formData: FormData) {
  return {
    name: (formData.get("name") as string)?.trim() ?? "",
    alias: (formData.get("alias") as string)?.trim() || null,
    website: (formData.get("website") as string)?.trim() || null,
    location: (formData.get("location") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
  };
}

// A roaster's name/alias must be unique against every OTHER roaster's
// name/alias — resolveRoasterLink (bags/actions.ts) matches on either field,
// so a collision would make linking ambiguous.
async function findNameConflict(name: string, alias: string | null, excludeId?: number): Promise<string | null> {
  const conditions = [
    sql`lower(${roasters.name}) = lower(${name})`,
    sql`lower(${roasters.alias}) = lower(${name})`,
  ];
  if (alias) {
    conditions.push(sql`lower(${roasters.name}) = lower(${alias})`);
    conditions.push(sql`lower(${roasters.alias}) = lower(${alias})`);
  }
  const orClause = sql`(${sql.join(conditions, sql` OR `)})`;
  const where = excludeId != null ? and(orClause, ne(roasters.id, excludeId)) : orClause;

  const [existing] = await db.select({ name: roasters.name }).from(roasters).where(where).limit(1);
  return existing?.name ?? null;
}

export async function addRoaster(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string }> {
  const { name, alias, website, location, notes } = readFields(formData);
  if (!name) return { error: "Name is required." };

  const conflict = await findNameConflict(name, alias);
  if (conflict) return { error: `"${conflict}" already uses that name or alias.` };

  await db.insert(roasters).values({ name, alias, website, location, notes });

  revalidatePath("/more/roasters");
  revalidatePath("/bags/new");
  redirect("/more/roasters");
}

export async function updateRoaster(
  id: number,
  _prev: unknown,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const { name, alias, website, location, notes } = readFields(formData);
  if (!name) return { error: "Name is required." };

  const conflict = await findNameConflict(name, alias, id);
  if (conflict) return { error: `"${conflict}" already uses that name or alias.` };

  await db
    .update(roasters)
    .set({ name, alias, website, location, notes, updatedAt: sql`(datetime('now'))` })
    .where(eq(roasters.id, id));

  // Bags store the roaster name denormalized (every read path — BagCard,
  // history, home, exports — reads bags.roaster directly rather than
  // joining roasters), so a rename/alias change has to cascade to every
  // linked bag. The alias, when set, is what should show up everywhere.
  await db.update(bags).set({ roaster: alias || name }).where(eq(bags.roasterId, id));

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
