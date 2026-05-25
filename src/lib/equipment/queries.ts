import { db } from "@/db/client";
import { equipmentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { EquipmentProfile } from "@/db/schema";

export async function getEquipmentProfiles(): Promise<EquipmentProfile[]> {
  return db.select().from(equipmentProfiles).orderBy(equipmentProfiles.name);
}

export async function getEquipmentProfileById(id: number): Promise<EquipmentProfile | null> {
  const [row] = await db.select().from(equipmentProfiles).where(eq(equipmentProfiles.id, id)).limit(1);
  return row ?? null;
}

export async function getActiveEquipmentProfile(): Promise<EquipmentProfile | null> {
  const [profile] = await db
    .select()
    .from(equipmentProfiles)
    .where(eq(equipmentProfiles.isActive, true))
    .limit(1);
  return profile ?? null;
}
