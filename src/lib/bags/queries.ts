import { db } from "@/db/client";
import { bags, bagOrigins, shots } from "@/db/schema";
import { eq, sql, and, or, like, ne } from "drizzle-orm";
import type { Bag, BagOrigin } from "@/db/schema";

export type BagWithOrigins = Bag & {
  origins: BagOrigin[];
  shotCount?: number;
  avgTasteBalance?: number | null;
  avgRetentionG?: number | null;
  avgShotRating?: number | null;
};

export async function getBags(
  status: "active" | "finished" | "all" = "active"
): Promise<BagWithOrigins[]> {
  const whereClause = status === "all"
    ? sql`${bags.status} != ${"removed"}`
    : eq(bags.status, status);

  const orderClause = status === "finished"
    ? sql`${bags.finishedDate} DESC`
    : status === "all"
    ? sql`${bags.roastDate} DESC`
    : sql`${bags.roastDate} ASC`;

  const bagRows = await db
    .select()
    .from(bags)
    .where(whereClause)
    .orderBy(orderClause);

  if (bagRows.length === 0) return [];

  const originRows = await db
    .select()
    .from(bagOrigins)
    .where(
      sql`${bagOrigins.bagId} IN (${sql.join(
        bagRows.map((b) => sql`${b.id}`),
        sql`, `
      )})`
    );

  const ratingRows = await db.all(sql`
    SELECT bag_id, ROUND(AVG(shot_rating), 1) as avg_shot_rating
    FROM shots
    WHERE bag_id IN (${sql.join(bagRows.map((b) => sql`${b.id}`), sql`, `)})
    GROUP BY bag_id
  `) as { bag_id: number; avg_shot_rating: number | null }[];

  const ratingMap = Object.fromEntries(ratingRows.map((r) => [r.bag_id, r.avg_shot_rating]));

  const result = bagRows.map((bag) => ({
    ...bag,
    origins: originRows.filter((o) => o.bagId === bag.id),
    avgShotRating: ratingMap[bag.id] ?? null,
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

  return { ...bag, origins, shotCount: Number(count), avgTasteBalance: avgTasteBalance ?? null, avgRetentionG: avgRetentionG != null ? Math.round(avgRetentionG * 100) / 100 : null, avgShotRating: avgShotRating != null ? Math.round(avgShotRating * 10) / 10 : null };
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

  // Match on bag fields OR any origin (country, variety)
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
    .orderBy(status === "finished" ? sql`${bags.finishedDate} DESC` : sql`${bags.roastDate} ASC`);

  if (bagRows.length === 0) return [];

  const originRows = await db
    .select()
    .from(bagOrigins)
    .where(
      sql`${bagOrigins.bagId} IN (${sql.join(
        bagRows.map((b) => sql`${b.id}`),
        sql`, `
      )})`
    );

  const ratingRows = await db.all(sql`
    SELECT bag_id, ROUND(AVG(shot_rating), 1) as avg_shot_rating
    FROM shots
    WHERE bag_id IN (${sql.join(bagRows.map((b) => sql`${b.id}`), sql`, `)})
    GROUP BY bag_id
  `) as { bag_id: number; avg_shot_rating: number | null }[];

  const ratingMap = Object.fromEntries(ratingRows.map((r) => [r.bag_id, r.avg_shot_rating]));

  const result = bagRows.map((bag) => ({
    ...bag,
    origins: originRows.filter((o) => o.bagId === bag.id),
    avgShotRating: ratingMap[bag.id] ?? null,
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
