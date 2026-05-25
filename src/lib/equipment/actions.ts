"use server";

import { db } from "@/db/client";
import { equipmentProfiles } from "@/db/schema";
import { eq, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateEquipmentProfile(
  id: number,
  _prev: unknown,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required." };

  await db.update(equipmentProfiles).set({
    name,
    machine: (formData.get("machine") as string) || null,
    grinder: (formData.get("grinder") as string) || null,
    tamper: (formData.get("tamper") as string) || null,
    defaultSpringWeightLbs: formData.get("defaultSpringWeightLbs")
      ? parseInt(formData.get("defaultSpringWeightLbs") as string, 10)
      : null,
    machineCleaningIntervalDays: formData.get("machineCleaningIntervalDays")
      ? parseInt(formData.get("machineCleaningIntervalDays") as string, 10)
      : 30,
    grinderCleaningIntervalDays: formData.get("grinderCleaningIntervalDays")
      ? parseInt(formData.get("grinderCleaningIntervalDays") as string, 10)
      : 14,
    notes: (formData.get("notes") as string) || null,
  }).where(eq(equipmentProfiles.id, id));

  revalidatePath("/more/equipment");
  return { success: true };
}

export async function addEquipmentProfile(
  _prev: unknown,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required." };

  await db.insert(equipmentProfiles).values({
    name,
    machine: (formData.get("machine") as string) || null,
    grinder: (formData.get("grinder") as string) || null,
    tamper: (formData.get("tamper") as string) || null,
    defaultSpringWeightLbs: formData.get("defaultSpringWeightLbs")
      ? parseInt(formData.get("defaultSpringWeightLbs") as string, 10)
      : null,
    machineCleaningIntervalDays: formData.get("machineCleaningIntervalDays")
      ? parseInt(formData.get("machineCleaningIntervalDays") as string, 10)
      : 30,
    grinderCleaningIntervalDays: formData.get("grinderCleaningIntervalDays")
      ? parseInt(formData.get("grinderCleaningIntervalDays") as string, 10)
      : 14,
    notes: (formData.get("notes") as string) || null,
    isActive: false,
  });

  revalidatePath("/more/equipment");
  revalidatePath("/more");
  redirect("/more/equipment");
}

export async function setActiveEquipmentProfile(id: number): Promise<void> {
  await db.update(equipmentProfiles).set({ isActive: false }).where(not(eq(equipmentProfiles.id, id)));
  await db.update(equipmentProfiles).set({ isActive: true }).where(eq(equipmentProfiles.id, id));
  revalidatePath("/more/equipment");
  revalidatePath("/more");
}

export async function markEquipmentCleaned(
  profileId: number,
  type: "machine" | "grinder"
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  if (type === "machine") {
    await db.update(equipmentProfiles).set({ machineLastCleanedAt: today }).where(eq(equipmentProfiles.id, profileId));
  } else {
    await db.update(equipmentProfiles).set({ grinderLastCleanedAt: today }).where(eq(equipmentProfiles.id, profileId));
  }
  revalidatePath("/more/equipment");
  revalidatePath("/more");
}
