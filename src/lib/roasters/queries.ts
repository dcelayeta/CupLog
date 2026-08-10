import { db } from "@/db/client";
import { roasters, bags } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import type { Roaster } from "@/db/schema";

export type RoasterWithBagCount = Roaster & { bagCount: number };

const bagCountSelect = {
  id: roasters.id,
  name: roasters.name,
  website: roasters.website,
  location: roasters.location,
  notes: roasters.notes,
  createdAt: roasters.createdAt,
  updatedAt: roasters.updatedAt,
  bagCount: sql<number>`COUNT(${bags.id})`,
};

export async function getRoasters(): Promise<RoasterWithBagCount[]> {
  const rows = await db
    .select(bagCountSelect)
    .from(roasters)
    .leftJoin(bags, eq(bags.roasterId, roasters.id))
    .groupBy(roasters.id)
    .orderBy(asc(roasters.name));
  return rows.map((r) => ({ ...r, bagCount: Number(r.bagCount) }));
}

export async function getRoasterById(id: number): Promise<RoasterWithBagCount | null> {
  const [row] = await db
    .select(bagCountSelect)
    .from(roasters)
    .leftJoin(bags, eq(bags.roasterId, roasters.id))
    .where(eq(roasters.id, id))
    .groupBy(roasters.id)
    .limit(1);
  if (!row) return null;
  return { ...row, bagCount: Number(row.bagCount) };
}

export type RoasterOption = { id: number; name: string };

export async function getRoasterOptions(): Promise<RoasterOption[]> {
  return db.select({ id: roasters.id, name: roasters.name }).from(roasters).orderBy(asc(roasters.name));
}
