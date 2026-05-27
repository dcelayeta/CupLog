import { db } from "@/db/client";
import { bags, bagOrigins, shots } from "@/db/schema";
import { eq, sql, and, or, like, ne, asc, desc } from "drizzle-orm";
import type { Bag, BagOrigin } from "@/db/schema";

export type GrindRange = { min: number; max: number };

export type BagWithOrigins = Bag & {
  origins: BagOrigin[];
  shotCount?: number;
  totalDoseG?: number;
  bagIndex?: number;
  bagTotal?: number;
  avgTasteBalance?: number | null;
  avgRetentionG?: number | null;
  bestGrindRange?: GrindRange | null;
  referenceGrindRange?: GrindRange | null;
  avgShotRating?: number | null;
};

async function fetchShotCountsAndCounters(bagIds: number[]) {
  const idList = sql.join(bagIds.map((id) => sql`${id}`), sql`, `);

  const [ratingRows, shotCountRows, bagCounterRows] = await Promise.all([
    db.all(sql`
      SELECT bag_id, ROUND(AVG(shot_rating), 1) as avg_shot_rating
      FROM shots WHERE bag_id IN (${idList}) GROUP BY bag_id
    `) as Promise<{ bag_id: number; avg_shot_rating: number | null }[]>,
    db.all(sql`
      SELECT bag_id, COUNT(*) as shot_count, COALESCE(SUM(dose_g), 0) as total_dose_g
      FROM shots WHERE bag_id IN (${idList}) GROUP BY bag_id
    `) as Promise<{ bag_id: number; shot_count: number; total_dose_g: number }[]>,
    db.all(sql`
      SELECT
        id,
        CAST(ROW_NUMBER() OVER (PARTITION BY lower(roaster), lower(name) ORDER BY roast_date, id) AS INTEGER) AS bag_index,
        CAST(COUNT(*) OVER (PARTITION BY lower(roaster), lower(name)) AS INTEGER) AS bag_total
      FROM bags WHERE status != 'removed'
    `) as Promise<{ id: number; bag_index: number; bag_total: number }[]>,
  ]);

  const ratingMap = Object.fromEntries(ratingRows.map((r) => [r.bag_id, r.avg_shot_rating]));
  const shotCountMap = Object.fromEntries(shotCountRows.map((r) => [r.bag_id, r.shot_count]));
  const totalDoseMap = Object.fromEntries(shotCountRows.map((r) => [r.bag_id, r.total_dose_g]));
  const bagCounterMap = Object.fromEntries(bagCounterRows.map((r) => [r.id, { bagIndex: r.bag_index, bagTotal: r.bag_total }]));

  return { ratingMap, shotCountMap, totalDoseMap, bagCounterMap };
}

function attachStats<T extends { id: number }>(
  bag: T,
  ratingMap: Record<number, number | null>,
  shotCountMap: Record<number, number>,
  totalDoseMap: Record<number, number>,
  bagCounterMap: Record<number, { bagIndex: number; bagTotal: number }>
) {
  return {
    ...bag,
    avgShotRating: ratingMap[bag.id] ?? null,
    shotCount: shotCountMap[bag.id] ?? 0,
    totalDoseG: totalDoseMap[bag.id] ?? 0,
    bagIndex: bagCounterMap[bag.id]?.bagIndex ?? 1,
    bagTotal: bagCounterMap[bag.id]?.bagTotal ?? 1,
  };
}

export async function getBags(
  status: "active" | "finished" | "all" = "active"
): Promise<BagWithOrigins[]> {
  const whereClause = status === "all"
    ? sql`${bags.status} != ${"removed"}`
    : eq(bags.status, status);

  const orderClause = status === "finished"
    ? desc(bags.finishedDate)
    : status === "all"
    ? desc(bags.roastDate)
    : asc(bags.roastDate);

  const bagRows = await db
    .select()
    .from(bags)
    .where(whereClause)
    .orderBy(orderClause);

  if (bagRows.length === 0) return [];

  const [originRows, { ratingMap, shotCountMap, totalDoseMap, bagCounterMap }] = await Promise.all([
    db.select().from(bagOrigins).where(
      sql`${bagOrigins.bagId} IN (${sql.join(bagRows.map((b) => sql`${b.id}`), sql`, `)})`
    ),
    fetchShotCountsAndCounters(bagRows.map((b) => b.id)),
  ]);

  const result = bagRows.map((bag) => ({
    ...attachStats(bag, ratingMap, shotCountMap, totalDoseMap, bagCounterMap),
    origins: originRows.filter((o) => o.bagId === bag.id),
  }));

  if (status === "all") {
    result.sort((a, b) => {
      if (a.avgShotRating == null && b.avgShotRating == null) return 0;
      if (a.avgShotRating == null) return 1;
      if (b.avgShotRating == null) return -1;
      return b.avgShotRating - a.avgShotRating;
    });
  }

  return result;
}

export async function getBagById(id: number): Promise<BagWithOrigins | null> {
  const [bag] = await db.select().from(bags).where(eq(bags.id, id)).limit(1);
  if (!bag) return null;

  const origins = await db
    .select()
    .from(bagOrigins)
    .where(eq(bagOrigins.bagId, id));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(shots)
    .where(eq(shots.bagId, id));

  const [{ avgTasteBalance }] = await db
    .select({ avgTasteBalance: sql<number | null>`avg(${shots.tasteBalance})` })
    .from(shots)
    .where(eq(shots.bagId, id));

  const [{ avgRetentionG }] = await db
    .select({ avgRetentionG: sql<number | null>`avg(${shots.grinderRetentionG})` })
    .from(shots)
    .where(eq(shots.bagId, id));

  const [{ avgShotRating }] = await db
    .select({ avgShotRating: sql<number | null>`avg(${shots.shotRating})` })
    .from(shots)
    .where(eq(shots.bagId, id));

  // Best grind range: from shots rated 4+ on this bag; fallback to highest-rated shots
  const [grindRow] = await db.all(sql`
    SELECT MIN(grind_setting) as min_grind, MAX(grind_setting) as max_grind
    FROM shots
    WHERE bag_id = ${id}
      AND grind_setting IS NOT NULL
      AND shot_rating >= COALESCE(
        NULLIF((SELECT MAX(shot_rating) FROM shots WHERE bag_id = ${id} AND shot_rating >= 4), 0),
        (SELECT MAX(shot_rating) FROM shots WHERE bag_id = ${id})
      )
  `) as { min_grind: number | null; max_grind: number | null }[];

  const bestGrindRange: GrindRange | null =
    grindRow?.min_grind != null && grindRow?.max_grind != null
      ? { min: grindRow.min_grind, max: grindRow.max_grind }
      : null;

  // Reference grind range from previous bags of same coffee (only useful when shotCount === 0)
  let referenceGrindRange: GrindRange | null = null;
  if (Number(count) === 0) {
    const [refRow] = await db.all(sql`
      SELECT MIN(s.grind_setting) as min_grind, MAX(s.grind_setting) as max_grind
      FROM shots s
      JOIN bags b ON s.bag_id = b.id
      WHERE lower(b.roaster) = lower(${bag.roaster})
        AND lower(b.name) = lower(${bag.name})
        AND b.id != ${id}
        AND s.grind_setting IS NOT NULL
        AND s.shot_rating >= COALESCE(
          NULLIF((
            SELECT MAX(s2.shot_rating) FROM shots s2
            JOIN bags b2 ON s2.bag_id = b2.id
            WHERE lower(b2.roaster) = lower(${bag.roaster})
              AND lower(b2.name) = lower(${bag.name})
              AND b2.id != ${id}
              AND s2.shot_rating >= 4
          ), 0),
          (
            SELECT MAX(s2.shot_rating) FROM shots s2
            JOIN bags b2 ON s2.bag_id = b2.id
            WHERE lower(b2.roaster) = lower(${bag.roaster})
              AND lower(b2.name) = lower(${bag.name})
              AND b2.id != ${id}
          )
        )
    `) as { min_grind: number | null; max_grind: number | null }[];
    if (refRow?.min_grind != null && refRow?.max_grind != null) {
      referenceGrindRange = { min: refRow.min_grind, max: refRow.max_grind };
    }
  }

  const [{ totalDoseG }] = await db
    .select({ totalDoseG: sql<number>`COALESCE(SUM(${shots.doseG}), 0)` })
    .from(shots)
    .where(eq(shots.bagId, id));

  return { ...bag, origins, shotCount: Number(count), totalDoseG: totalDoseG ?? 0, avgTasteBalance: avgTasteBalance ?? null, avgRetentionG: avgRetentionG != null ? Math.round(avgRetentionG * 100) / 100 : null, avgShotRating: avgShotRating != null ? Math.round(avgShotRating * 10) / 10 : null, bestGrindRange, referenceGrindRange };
}

export async function findDuplicateBag(
  roaster: string,
  name: string,
  excludeId?: number
): Promise<Bag | null> {
  const conditions = [
    sql`lower(${bags.roaster}) = lower(${roaster})`,
    sql`lower(${bags.name}) = lower(${name})`,
    or(eq(bags.status, "active"), eq(bags.status, "finished")),
  ];
  if (excludeId) conditions.push(ne(bags.id, excludeId));

  const [match] = await db
    .select()
    .from(bags)
    .where(and(...conditions))
    .limit(1);

  return match ?? null;
}

export async function searchBags(
  query: string,
  status: "active" | "finished" | "all" = "active"
): Promise<BagWithOrigins[]> {
  const q = `%${query.toLowerCase()}%`;

  const statusClause = status === "all"
    ? sql`${bags.status} != ${"removed"}`
    : eq(bags.status, status);

  const bagRows = await db
    .select()
    .from(bags)
    .where(
      and(
        statusClause,
        or(
          like(sql`lower(${bags.roaster})`, q),
          like(sql`lower(${bags.name})`, q),
          like(sql`lower(${bags.roastLevel})`, q),
          sql`EXISTS (
            SELECT 1 FROM ${bagOrigins}
            WHERE ${bagOrigins.bagId} = ${bags.id}
            AND (
              lower(${bagOrigins.country}) LIKE ${q}
              OR lower(coalesce(${bagOrigins.variety}, '')) LIKE ${q}
              OR lower(coalesce(${bagOrigins.region}, '')) LIKE ${q}
            )
          )`
        )
      )
    )
    .orderBy(status === "finished" ? desc(bags.finishedDate) : asc(bags.roastDate));

  if (bagRows.length === 0) return [];

  const [originRows, { ratingMap, shotCountMap, totalDoseMap, bagCounterMap }] = await Promise.all([
    db.select().from(bagOrigins).where(
      sql`${bagOrigins.bagId} IN (${sql.join(bagRows.map((b) => sql`${b.id}`), sql`, `)})`
    ),
    fetchShotCountsAndCounters(bagRows.map((b) => b.id)),
  ]);

  const result = bagRows.map((bag) => ({
    ...attachStats(bag, ratingMap, shotCountMap, totalDoseMap, bagCounterMap),
    origins: originRows.filter((o) => o.bagId === bag.id),
  }));

  if (status === "all") {
    result.sort((a, b) => {
      if (a.avgShotRating == null && b.avgShotRating == null) return 0;
      if (a.avgShotRating == null) return 1;
      if (b.avgShotRating == null) return -1;
      return b.avgShotRating - a.avgShotRating;
    });
  }

  return result;
}
