"use server";

import { db } from "@/db/client";
import { appConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const DEFAULT_CONFIG = { id: 1, lowInventoryWarningCups: 14 };

export async function getAppConfig() {
  const [row] = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
  return row ?? DEFAULT_CONFIG;
}

export async function saveAppConfig(data: { lowInventoryWarningCups: number }): Promise<void> {
  await db
    .insert(appConfig)
    .values({ id: 1, ...data })
    .onConflictDoUpdate({ target: appConfig.id, set: data });
  revalidatePath("/home");
  revalidatePath("/more/thresholds");
}
