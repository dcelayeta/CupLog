"use server";

import { db } from "@/db/client";
import { extractionThresholds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DEFAULT_TIME_THRESHOLDS, DEFAULT_RATIO_THRESHOLDS } from "@/lib/shots/classification";

export async function getExtractionThresholds() {
  return db.select().from(extractionThresholds).orderBy(extractionThresholds.metric, extractionThresholds.sortOrder);
}

export async function saveThreshold(
  id: number,
  data: { label: string; minValue: number; maxValue: number | null }
): Promise<void> {
  await db.update(extractionThresholds).set(data).where(eq(extractionThresholds.id, id));
  revalidatePath("/more/thresholds");
  revalidatePath("/history");
  revalidatePath("/log");
}

export async function restoreDefaultThresholds(): Promise<void> {
  await db.delete(extractionThresholds);
  const now = new Date().toISOString();
  await db.insert(extractionThresholds).values([
    ...DEFAULT_TIME_THRESHOLDS.map((t) => ({ ...t, metric: "time" as const, createdAt: now, updatedAt: now })),
    ...DEFAULT_RATIO_THRESHOLDS.map((t) => ({ ...t, metric: "ratio" as const, createdAt: now, updatedAt: now })),
  ]);
  revalidatePath("/more/thresholds");
  revalidatePath("/history");
  revalidatePath("/log");
}
