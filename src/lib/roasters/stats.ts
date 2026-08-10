import { db } from "@/db/client";
import { sql } from "drizzle-orm";

// Roaster-scoped equivalents of a handful of the global Stats tab's charts —
// same shape/labels, filtered to shots pulled from this roaster's bags.

export async function getRoasterShotRatingDist(roasterId: number): Promise<Record<number, number>> {
  const rows = await db.all(sql`
    SELECT shot_rating, COUNT(*) as count
    FROM shots
    WHERE shot_rating IS NOT NULL AND is_failed = 0
      AND bag_id IN (SELECT id FROM bags WHERE roaster_id = ${roasterId} AND status != 'removed')
    GROUP BY shot_rating
  `) as { shot_rating: number; count: number }[];
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) dist[Number(row.shot_rating)] = Number(row.count);
  return dist;
}

export async function getRoasterTasteDist(roasterId: number): Promise<Record<number, number>> {
  const rows = await db.all(sql`
    SELECT
      CASE
        WHEN taste_balance <= 1.4 THEN 1
        WHEN taste_balance <= 2.4 THEN 2
        WHEN taste_balance <= 3.4 THEN 3
        WHEN taste_balance <= 4.4 THEN 4
        WHEN taste_balance <= 5.4 THEN 5
        WHEN taste_balance <= 6.4 THEN 6
        ELSE 7
      END as bucket,
      COUNT(*) as count
    FROM shots
    WHERE taste_balance IS NOT NULL AND is_failed = 0
      AND bag_id IN (SELECT id FROM bags WHERE roaster_id = ${roasterId} AND status != 'removed')
    GROUP BY bucket
  `) as { bucket: number; count: number }[];
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const row of rows) dist[Number(row.bucket)] = Number(row.count);
  return dist;
}

export async function getRoasterRoastLevelDist(roasterId: number): Promise<{ roastLevel: string; count: number }[]> {
  const rows = await db.all(sql`
    SELECT b.roast_level as roastLevel, COUNT(s.id) as count
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    WHERE b.roaster_id = ${roasterId} AND b.status != 'removed'
    GROUP BY b.roast_level
    ORDER BY count DESC
  `) as { roastLevel: string; count: number }[];
  return rows.map(r => ({ roastLevel: String(r.roastLevel), count: Number(r.count) }));
}

export async function getRoasterProcessDist(roasterId: number): Promise<{ method: string; count: number }[]> {
  const rows = await db.all(sql`
    SELECT b.processing_method as method, COUNT(s.id) as count
    FROM shots s
    JOIN bags b ON s.bag_id = b.id
    WHERE b.roaster_id = ${roasterId} AND b.status != 'removed'
    GROUP BY b.processing_method
    ORDER BY count DESC
  `) as { method: string; count: number }[];
  return rows.map(r => ({ method: String(r.method), count: Number(r.count) }));
}
