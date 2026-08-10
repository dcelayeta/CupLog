import { db } from "@/db/client";
import { roasters } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { Roaster } from "@/db/schema";

export type RoasterWithStats = Roaster & {
  bagCount: number;
  shotCount: number;
  avgShotRating: number | null;
  avgDrinkRating: number | null;
};

// Scalar correlated subqueries — written as literal SQL text (not drizzle
// column refs) so "roasters.id" stays table-qualified in the generated SQL.
// Interpolating `${roasters.id}` here renders as a bare "id", which a nested
// subquery resolves to its own innermost table instead of the outer row
// (this bit us once already — see the bag-count bug this replaced).
const statsSelect = {
  id: roasters.id,
  name: roasters.name,
  alias: roasters.alias,
  website: roasters.website,
  location: roasters.location,
  notes: roasters.notes,
  createdAt: roasters.createdAt,
  updatedAt: roasters.updatedAt,
  bagCount: sql<number>`(SELECT COUNT(*) FROM bags WHERE roaster_id = roasters.id)`.as("bagCount"),
  shotCount: sql<number>`(SELECT COUNT(*) FROM shots WHERE bag_id IN (SELECT id FROM bags WHERE roaster_id = roasters.id))`.as("shotCount"),
  avgShotRating: sql<number | null>`(SELECT AVG(shot_rating) FROM shots WHERE is_failed = 0 AND bag_id IN (SELECT id FROM bags WHERE roaster_id = roasters.id))`.as("avgShotRating"),
  avgDrinkRating: sql<number | null>`(SELECT AVG(overall_rating) FROM drinks WHERE shot_id IN (SELECT id FROM shots WHERE bag_id IN (SELECT id FROM bags WHERE roaster_id = roasters.id)))`.as("avgDrinkRating"),
};

type StatsRow = Roaster & {
  bagCount: number;
  shotCount: number;
  avgShotRating: number | null;
  avgDrinkRating: number | null;
};

function toStats(row: StatsRow): RoasterWithStats {
  return {
    ...row,
    bagCount: Number(row.bagCount),
    shotCount: Number(row.shotCount),
    avgShotRating: row.avgShotRating != null ? Number(row.avgShotRating) : null,
    avgDrinkRating: row.avgDrinkRating != null ? Number(row.avgDrinkRating) : null,
  };
}

// Ordered by overall shot rating (best first, unrated roasters last), then
// by bag count as a tiebreaker.
export async function getRoasters(): Promise<RoasterWithStats[]> {
  const rows = await db
    .select(statsSelect)
    .from(roasters)
    .orderBy(sql`avgShotRating DESC NULLS LAST, bagCount DESC`);
  return rows.map(toStats);
}

export async function getRoasterById(id: number): Promise<RoasterWithStats | null> {
  const [row] = await db.select(statsSelect).from(roasters).where(eq(roasters.id, id)).limit(1);
  if (!row) return null;
  return toStats(row);
}

export type RoasterOption = { id: number; name: string; alias: string | null };

export async function getRoasterOptions(): Promise<RoasterOption[]> {
  return db
    .select({ id: roasters.id, name: roasters.name, alias: roasters.alias })
    .from(roasters)
    .orderBy(roasters.name);
}
