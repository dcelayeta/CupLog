import { db } from "@/db/client";
import { roasters } from "@/db/schema";
import { sql } from "drizzle-orm";
import type { Roaster } from "@/db/schema";

export type RoasterWithStats = Roaster & {
  bagCount: number;
  activeBagCount: number;
  shotCount: number;
  avgShotRating: number | null;
  avgDrinkRating: number | null;
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

// Aggregates each table once (GROUP BY) instead of running correlated
// subqueries per roaster. The correlated version rescanned shots and drinks
// for every roaster row, which was the main source of Turso rows-read usage.
// Removed bags are excluded everywhere, so a soft-deleted bag never inflates
// a roaster's counts.
async function queryRoasterStats(roasterId?: number): Promise<StatsRow[]> {
  const roasterFilter = roasterId != null ? sql`WHERE r.id = ${roasterId}` : sql``;
  return (await db.all(sql`
    WITH live_bags AS (
      SELECT id, roaster_id, status FROM bags
      WHERE roaster_id IS NOT NULL AND status != 'removed'
    ),
    bag_stats AS (
      SELECT roaster_id,
        COUNT(*) AS bagCount,
        SUM(CASE WHEN status IN ('active', 'reserve') THEN 1 ELSE 0 END) AS activeBagCount
      FROM live_bags GROUP BY roaster_id
    ),
    shot_stats AS (
      SELECT lb.roaster_id,
        COUNT(s.id) AS shotCount,
        AVG(CASE WHEN s.is_failed = 0 THEN s.shot_rating END) AS avgShotRating
      FROM shots s JOIN live_bags lb ON s.bag_id = lb.id
      GROUP BY lb.roaster_id
    ),
    drink_stats AS (
      SELECT lb.roaster_id, AVG(d.overall_rating) AS avgDrinkRating
      FROM drinks d
      JOIN shots s ON d.shot_id = s.id
      JOIN live_bags lb ON s.bag_id = lb.id
      GROUP BY lb.roaster_id
    )
    SELECT
      r.id AS id, r.name AS name, r.alias AS alias, r.website AS website,
      r.location AS location, r.notes AS notes,
      r.created_at AS createdAt, r.updated_at AS updatedAt,
      COALESCE(bs.bagCount, 0) AS bagCount,
      COALESCE(bs.activeBagCount, 0) AS activeBagCount,
      COALESCE(ss.shotCount, 0) AS shotCount,
      ss.avgShotRating AS avgShotRating,
      ds.avgDrinkRating AS avgDrinkRating
    FROM roasters r
    LEFT JOIN bag_stats bs ON bs.roaster_id = r.id
    LEFT JOIN shot_stats ss ON ss.roaster_id = r.id
    LEFT JOIN drink_stats ds ON ds.roaster_id = r.id
    ${roasterFilter}
    ORDER BY avgShotRating DESC NULLS LAST, bagCount DESC
  `)) as StatsRow[];
}

// Ordered by overall shot rating (best first, unrated roasters last), then
// by bag count as a tiebreaker.
export async function getRoasters(): Promise<RoasterWithStats[]> {
  const rows = await queryRoasterStats();
  return rows.map(toStats);
}

export async function getRoasterById(id: number): Promise<RoasterWithStats | null> {
  const [row] = await queryRoasterStats(id);
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
