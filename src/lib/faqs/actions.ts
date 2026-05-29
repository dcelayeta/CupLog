"use server";

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db/client";
import { coffeeFaqs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBags } from "@/lib/bags/queries";
import { getActiveEquipmentProfile } from "@/lib/equipment/queries";
import { getDaysSinceRoast } from "@/lib/bags/freshness";
import { shots, bags } from "@/db/schema";
import { desc } from "drizzle-orm";

const VALID_CATEGORIES = [
  "Extraction", "Beans", "Equipment", "Technique",
  "Drinks", "Science", "Troubleshooting", "General",
] as const;

type AskResult =
  | { answer: string; category: string; question: string }
  | { error: string };

async function buildContext(): Promise<string> {
  const [activeBags, profile] = await Promise.all([
    getBags("active"),
    getActiveEquipmentProfile(),
  ]);

  const recentShots = await db
    .select({
      doseG: shots.doseG,
      yieldG: shots.yieldG,
      shotTimeSeconds: shots.shotTimeSeconds,
      shotRating: shots.shotRating,
      grindSetting: shots.grindSetting,
      tasteBalance: shots.tasteBalance,
      bagName: bags.name,
      roaster: bags.roaster,
    })
    .from(shots)
    .innerJoin(bags, eq(shots.bagId, bags.id))
    .orderBy(desc(shots.pulledAt))
    .limit(10);

  const lines: string[] = [];

  if (activeBags.length > 0) {
    lines.push("Active beans:");
    for (const bag of activeBags) {
      const days = getDaysSinceRoast(bag.roastDate);
      const parts = [bag.roastLevel !== "unspecified" ? bag.roastLevel : null, bag.processingMethod !== "unspecified" ? bag.processingMethod : null].filter(Boolean);
      lines.push(`  - ${bag.roaster} ${bag.name}${parts.length ? ` (${parts.join(", ")})` : ""}, ${days}d since roast`);
    }
  }

  if (recentShots.length > 0) {
    lines.push("Recent shots:");
    for (const s of recentShots.slice(0, 5)) {
      const ratio = s.yieldG && s.doseG ? (s.yieldG / s.doseG).toFixed(1) : "?";
      lines.push(
        `  - ${s.roaster} ${s.bagName}: ${s.doseG}g→${s.yieldG ?? "?"}g (1:${ratio}) ${s.shotTimeSeconds ?? "?"}s grind:${s.grindSetting ?? "?"} rating:${s.shotRating ?? "?"}/5`
      );
    }
  }

  if (profile) {
    const gear = [
      profile.machine ? `machine: ${profile.machine}` : null,
      profile.grinder ? `grinder: ${profile.grinder}` : null,
    ].filter(Boolean);
    if (gear.length) lines.push(`Equipment: ${gear.join(", ")}`);
  }

  return lines.join("\n");
}

export async function askCoffeeQuestion(
  _prev: unknown,
  formData: FormData
): Promise<AskResult> {
  const question = (formData.get("question") as string)?.trim();
  if (!question) return { error: "Please enter a question." };

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY is not configured." };
  }

  const context = await buildContext();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: `You are a coffee expert assistant for a personal espresso tracking app. Answer coffee questions concisely in 2–4 sentences. When the user's brewing context is relevant, reference it specifically.

Respond ONLY with valid JSON in this exact format:
{"answer": "...", "category": "..."}

Category must be exactly one of: Extraction, Beans, Equipment, Technique, Drinks, Science, Troubleshooting, General`,
      messages: [
        {
          role: "user",
          content: `${context ? `My setup:\n${context}\n\n` : ""}Question: ${question}`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    const answer: string = parsed.answer || "Sorry, I couldn't generate an answer.";
    const category: string = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "General";

    await db.insert(coffeeFaqs).values({ question, answer, category });
    revalidatePath("/more/faqs");

    return { answer, category, question };
  } catch {
    return { error: "Failed to get an answer. Please try again." };
  }
}

export async function deleteFaq(id: number): Promise<void> {
  await db.delete(coffeeFaqs).where(eq(coffeeFaqs.id, id));
  revalidatePath("/more/faqs");
}
