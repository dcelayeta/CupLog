import { db } from "@/db/client";
import { roasters } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { Roaster } from "@/db/schema";

export type RoasterWithStats = Roaster & {
  bagCount: number;
  activeBagCount: number;
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
  activeBagCount: sql<number>`(SELECT COUNT(*) FROM bags WHERE roaster_id = roasters.id AND status IN ('active', 'reserve'))`.as("activeBagCount"),
  shotCount: sql<number>`(SELECT COUNT(*) FROM shots WHERE bag_id IN (SELECT id FROM bags WHERE roaster_id = roasters.id))`.as("shotCount"),
  avgShotRating: sql<number | null>`(SELECT AVG(shot_rating) FROM shots WHERE is_failed = 0 AND bag_id IN (SELECT id FROM bags WHERE roaster_id = roasters.id))`.as("avgShotRating"),
  avgDrinkRating: sql<number | null>`(SELECT AVG(overall_rating) FROM drinks WHERE shot_id IN (SELECT id FROM shots WHERE bag_id IN (SELECT id FROM bags WHERE roaster_id = roasters.id)))`.as("avgDrinkRating"),
};

type StatsRow = Roaster & {
  bagCount: number;
  activeBagCount: number;
  shotCount: number;
  avgShotRating: number | null;
  avgDrinkRating: number | null;
};

function toStats(row: StatsRow): RoasterWithStats {
  return {
    ...row,
    bagCount: Number(row.bagCount),
    activeBagCount: Number(row.activeBagCount),
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

export type RoasterBag = {
  id: number;
  name: string;
  status: "active" | "reserve" | "finished" | "removed";
  roastDate: string;
  peakStartDay: number | null;
  peakEndDay: number | null;
  shotCount: number;
  avgShotRating: number | null;
  avgDrinkRating: number | null;
};

// Correlated on "b.id" (this query's own bag alias), not "roasters.id" —
// no nested-subquery ambiguity risk since "b" isn't a name any inner scope
// redeclares, unlike the roasters.id case above.
export async function getBagsForRoaster(roasterId: number): Promise<RoasterBag[]> {
  const rows = await db.all(sql`
    SELECT
      b.id as id,
      b.name as name,
      b.status as status,
      b.roast_date as roastDate,
      b.peak_start_day as peakStartDay,
      b.peak_end_day as peakEndDay,
      (SELECT COUNT(*) FROM shots WHERE bag_id = b.id) as shotCount,
      (SELECT AVG(shot_rating) FROM shots WHERE bag_id = b.id AND is_failed = 0) as avgShotRating,
      (SELECT AVG(d.overall_rating) FROM drinks d JOIN shots s ON d.shot_id = s.id WHERE s.bag_id = b.id) as avgDrinkRating
    FROM bags b
    WHERE b.roaster_id = ${roasterId} AND b.status != 'removed'
    ORDER BY b.roast_date DESC
  `) as {
    id: number; name: string; status: string; roastDate: string;
    peakStartDay: number | null; peakEndDay: number | null;
    shotCount: number; avgShotRating: number | null; avgDrinkRating: number | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status as RoasterBag["status"],
    roastDate: r.roastDate,
    peakStartDay: r.peakStartDay,
    peakEndDay: r.peakEndDay,
    shotCount: Number(r.shotCount),
    avgShotRating: r.avgShotRating != null ? Number(r.avgShotRating) : null,
    avgDrinkRating: r.avgDrinkRating != null ? Number(r.avgDrinkRating) : null,
  }));
}

export type RoasterOption = { id: number; name: string; alias: string | null };

export async function getRoasterOptions(): Promise<RoasterOption[]> {
  return db
    .select({ id: roasters.id, name: roasters.name, alias: roasters.alias })
    .from(roasters)
    .orderBy(roasters.name);
}
