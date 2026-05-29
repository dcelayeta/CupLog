"use server";

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db/client";
import { bagAnalyses, bags, shots, bagOrigins } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { BagAnalysis } from "@/db/schema";

export type BagAnalysisResult = {
  summary: string;
  recommendation: "buy_again" | "try_with_adjustments" | "avoid";
  recommendationReason: string;
  grindNotes: string | null;
  tasteNotes: string | null;
};

export async function getBagAnalysis(bagId: number): Promise<BagAnalysis | null> {
  const [row] = await db
    .select()
    .from(bagAnalyses)
    .where(eq(bagAnalyses.bagId, bagId))
    .orderBy(desc(bagAnalyses.createdAt))
    .limit(1);
  return row ?? null;
}

export async function analyzeBag(
  bagId: number
): Promise<BagAnalysisResult | { error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY is not configured." };
  }

  const [bag] = await db.select().from(bags).where(eq(bags.id, bagId));
  if (!bag) return { error: "Bag not found." };

  const [originRows, shotRows] = await Promise.all([
    db.select().from(bagOrigins).where(eq(bagOrigins.bagId, bagId)),
    db
      .select({
        pulledAt: shots.pulledAt,
        doseG: shots.doseG,
        yieldG: shots.yieldG,
        shotTimeSeconds: shots.shotTimeSeconds,
        shotRating: shots.shotRating,
        grindSetting: shots.grindSetting,
        tasteBalance: shots.tasteBalance,
        notes: shots.notes,
      })
      .from(shots)
      .where(eq(shots.bagId, bagId))
      .orderBy(desc(shots.pulledAt)),
  ]);

  if (shotRows.length === 0) {
    return { error: "No shots logged for this bag — nothing to analyze." };
  }

  // Build context
  const originStr = originRows.map((o) => [o.country, o.region, o.variety, o.farm].filter(Boolean).join(", ")).join(" / ");
  const roastLevel = bag.roastLevel !== "unspecified" ? bag.roastLevel.replace("_", " ") : null;
  const processingStr = bag.processingMethod !== "unspecified" ? bag.processingMethod.replace("_", " ") : null;

  const bagMeta = [
    `Bag: ${bag.roaster} — ${bag.name}`,
    roastLevel ? `Roast: ${roastLevel}` : null,
    processingStr ? `Process: ${processingStr}` : null,
    originStr ? `Origin: ${originStr}` : null,
    bag.peakStartDay && bag.peakEndDay ? `Peak freshness window: days ${bag.peakStartDay}–${bag.peakEndDay}` : null,
    `Total shots: ${shotRows.length}`,
  ].filter(Boolean).join("\n");

  const TASTE_LABELS = ["", "Very Sour", "Sour", "Slightly Sour", "Balanced", "Slightly Bitter", "Bitter", "Very Bitter"];
  const shotLines = shotRows.map((s, i) => {
    const ratio = s.yieldG && s.doseG ? (s.yieldG / s.doseG).toFixed(2) : "?";
    const taste = s.tasteBalance != null ? (TASTE_LABELS[Math.round(s.tasteBalance)] ?? s.tasteBalance.toFixed(1)) : null;
    const parts = [
      `#${shotRows.length - i}`,
      `${s.doseG}g→${s.yieldG ?? "?"}g (1:${ratio})`,
      s.shotTimeSeconds ? `${s.shotTimeSeconds}s` : null,
      s.grindSetting ? `grind ${s.grindSetting}` : null,
      s.shotRating ? `${s.shotRating}/5★` : null,
      taste,
      s.notes ? `"${s.notes}"` : null,
    ].filter(Boolean);
    return `  ${parts.join(" · ")}`;
  });

  const context = `${bagMeta}\n\nShots (newest first):\n${shotLines.join("\n")}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: `You are an expert espresso coach reviewing a finished bag of coffee. Analyze the shot data and notes to write a useful retrospective for the user.

Respond ONLY with valid JSON:
{
  "summary": "2-3 sentence overall experience summary",
  "recommendation": "buy_again" | "try_with_adjustments" | "avoid",
  "recommendationReason": "1-2 sentence reason for the recommendation",
  "grindNotes": "specific grind guidance for next time, or null if insufficient data",
  "tasteNotes": "key taste observations and what drove them, or null if insufficient data"
}

Be direct and specific. Reference actual numbers from the data. Recommendation criteria:
- buy_again: consistently good shots, high average rating, clear sweet spot found
- try_with_adjustments: mixed results but potential, or only tried in a narrow range
- avoid: consistently poor results despite adjustments, or fundamentally difficult bean`,
      messages: [{ role: "user", content: context }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: "Could not parse AI response." };

    const parsed = JSON.parse(jsonMatch[0]);
    const result: BagAnalysisResult = {
      summary: parsed.summary ?? "",
      recommendation: ["buy_again", "try_with_adjustments", "avoid"].includes(parsed.recommendation)
        ? parsed.recommendation
        : "try_with_adjustments",
      recommendationReason: parsed.recommendationReason ?? "",
      grindNotes: parsed.grindNotes ?? null,
      tasteNotes: parsed.tasteNotes ?? null,
    };

    // Upsert: delete old analysis for this bag, insert new one
    await db.delete(bagAnalyses).where(eq(bagAnalyses.bagId, bagId));
    await db.insert(bagAnalyses).values({ bagId, ...result });
    revalidatePath(`/bags/${bagId}`);

    return result;
  } catch {
    return { error: "Analysis failed. Please try again." };
  }
}
