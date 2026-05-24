import { db } from "@/db/client";
import { bags, bagOrigins, shots } from "@/db/schema";
import { eq, sql, and, or, like, ne } from "drizzle-orm";
import type { Bag, BagOrigin } from "@/db/schema";

export type BagWithOrigins = Bag & {
  origins: BagOrigin[];
  shotCount?: number;
};

export async function getBags(
  status: "active" | "finished" = "active"
): Promise<BagWithOrigins[]> {
  const bagRows = await db
    .select()
    .from(bags)
    .where(eq(bags.status, status))
    .orderBy(sql`${bags.roastDate} DESC`);

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

  return bagRows.map((bag) => ({
    ...bag,
    origins: originRows.filter((o) => o.bagId === bag.id),
  }));
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

  return { ...bag, origins, shotCount: Number(count) };
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
  status: "active" | "finished" = "active"
): Promise<BagWithOrigins[]> {
  const q = `%${query.toLowerCase()}%`;
  const bagRows = await db
    .select()
    .from(bags)
    .where(
      and(
        eq(bags.status, status),
        or(
          like(sql`lower(${bags.roaster})`, q),
          like(sql`lower(${bags.name})`, q)
        )
      )
    )
    .orderBy(sql`${bags.roastDate} DESC`);

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

  return bagRows.map((bag) => ({
    ...bag,
    origins: originRows.filter((o) => o.bagId === bag.id),
  }));
}
