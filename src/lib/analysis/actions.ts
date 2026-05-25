"use server";

import { upsertCoachingState } from "./queries";
import { revalidatePath } from "next/cache";

export async function saveCoachingStateAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const raw = formData.get("json") as string;
  try {
    const parsed = JSON.parse(raw);
    // Basic validation
    if (typeof parsed.experience_level !== "string") {
      return { error: "Invalid JSON: missing experience_level" };
    }
    await upsertCoachingState(parsed);
    revalidatePath("/more/coaching-state");
    return { success: true };
  } catch {
    return { error: "Invalid JSON — could not parse" };
  }
}
