"use server";

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db/client";
import { shots, bags, equipmentProfiles } from "@/db/schema";
import { eq, desc, sql, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ParsedBagData = {
  roaster?: string;
  name?: string;
  isBlend?: boolean;
  isDecaf?: boolean;
  roastLevel?: string;
  processingMethod?: string;
  roastDate?: string;
  purchaseDate?: string;
  purchaseShop?: string;
  price?: number;
  weightG?: number;
  notes?: string;
  origins?: Array<{
    country: string;
    region?: string;
    farm?: string;
    variety?: string;
    blendPercentage?: number;
  }>;
};

type ParseResult =
  | { success: true; data: ParsedBagData }
  | { success: false; error: string };

const SYSTEM_PROMPT = `You are a coffee bag data extractor. Extract structured data from coffee bag descriptions, photos, or any text about a coffee bag.

Return ONLY a valid JSON object with these fields (omit fields you cannot confidently determine):
{
  "roaster": string,           // roaster/company name
  "name": string,              // coffee name/blend name
  "isBlend": boolean,          // true if it's a blend of multiple origins
  "isDecaf": boolean,          // true if decaffeinated
  "roastLevel": string,        // one of: light, medium_light, medium, medium_dark, dark, unspecified
  "processingMethod": string,  // one of: washed, natural, honey, anaerobic, ea_washed, swiss_water, other, unspecified
  "roastDate": string,         // ISO date YYYY-MM-DD if mentioned, otherwise omit
  "purchaseDate": string,      // ISO date YYYY-MM-DD when it was bought — resolve relative dates like "today", "yesterday", "a few days ago" using today's date
  "purchaseShop": string,      // where it was bought if mentioned
  "price": number,             // price paid if mentioned
  "weightG": number,           // bag weight in grams if shown
  "notes": string,             // tasting notes, flavor descriptors, any other details worth saving
  "origins": [                 // one entry per origin country
    {
      "country": string,
      "region": string,        // growing region if known
      "farm": string,          // farm name if known
      "variety": string,       // cultivar/variety e.g. Pink Bourbon, Geisha, Typica
      "blendPercentage": number // 0-100, only if explicitly stated
    }
  ]
}

For roastLevel, map common terms: "light roast" → light, "medium roast" → medium, "dark roast" → dark, etc.
For processingMethod: "washed"/"fully washed" → washed, "natural"/"dry process" → natural, "honey" → honey, "EA"/"sugarcane" decaf → ea_washed, "Swiss Water" decaf → swiss_water.
If the coffee is clearly from one country/region, set isBlend to false and include one origin.
If multiple countries are mentioned, set isBlend to true and include one origin per country.
Do not guess — only include fields you can reasonably extract from the input.`;

function isUrl(text: string): boolean {
  const t = text.trim();
  return /^https?:\/\/\S+$/.test(t);
}

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CupLog/1.0)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`);
  const html = await res.text();

  // Strip <script> and <style> blocks with their content
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  // Strip remaining HTML tags
  const noTags = noScripts.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  const decoded = noTags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Collapse whitespace and trim
  return decoded.replace(/\s+/g, " ").trim().slice(0, 8000); // cap at 8k chars
}

export async function parseBagWithAI(input: {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<ParseResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "ANTHROPIC_API_KEY is not configured." };
  }

  if (!input.text && !input.imageBase64) {
    return { success: false, error: "Provide text or an image." };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // If the text input is a URL, fetch and use the page content instead
  let resolvedText = input.text;
  if (input.text && isUrl(input.text)) {
    try {
      resolvedText = await fetchPageText(input.text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: `Could not fetch URL: ${msg}` };
    }
  }

  try {
    const content: Anthropic.MessageParam["content"] = [];

    if (input.imageBase64 && input.imageMimeType) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: input.imageMimeType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: input.imageBase64,
        },
      });
    }

    if (resolvedText) {
      content.push({ type: "text", text: resolvedText });
    } else {
      content.push({
        type: "text",
        text: "Extract the coffee bag data from this image.",
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\nToday's date is ${today}. When a year is not specified for a date, assume the most recent plausible year (i.e. if the month/day has already passed this year, use this year; if it hasn't occurred yet this year, still use this year unless context suggests otherwise).`,
      messages: [{ role: "user", content }],
    });

    const raw = message.content[0];
    if (raw.type !== "text") {
      return { success: false, error: "Unexpected response from Claude." };
    }

    // Extract JSON object — find outermost { } regardless of surrounding text
    const start = raw.text.indexOf("{");
    const end = raw.text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return { success: false, error: "No JSON found in Claude response." };
    }
    const jsonText = raw.text.slice(start, end + 1);

    const data: ParsedBagData = JSON.parse(jsonText);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Parse failed: ${message}` };
  }
}

export async function getDialInRecommendation(
  bagData: ParsedBagData
): Promise<{ tip: string } | { error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY is not configured." };
  }

  const [equipment] = await db
    .select()
    .from(equipmentProfiles)
    .where(eq(equipmentProfiles.isActive, true))
    .limit(1);

  // Recent shots from bags with the same roast level for grind reference
  const similarShotsQuery = db
    .select({
      doseG: shots.doseG,
      yieldG: shots.yieldG,
      shotTimeSeconds: shots.shotTimeSeconds,
      grindSetting: shots.grindSetting,
      shotRating: shots.shotRating,
      tasteBalance: shots.tasteBalance,
      notes: shots.notes,
      bagName: bags.name,
      roaster: bags.roaster,
      roastLevel: bags.roastLevel,
      processingMethod: bags.processingMethod,
    })
    .from(shots)
    .innerJoin(bags, eq(shots.bagId, bags.id))
    .orderBy(desc(shots.pulledAt))
    .limit(12);

  const similarShots = await similarShotsQuery;

  // Filter client-side for same roast level / process (avoids complex conditional drizzle where)
  const relevant = similarShots.filter((s) => {
    const sameRoast = bagData.roastLevel && bagData.roastLevel !== "unspecified"
      ? s.roastLevel === bagData.roastLevel
      : true;
    const sameProcess = bagData.processingMethod && bagData.processingMethod !== "unspecified"
      ? s.processingMethod === bagData.processingMethod
      : true;
    return sameRoast || sameProcess;
  });

  const shotsForContext = relevant.length >= 3 ? relevant : similarShots.slice(0, 8);

  const equipmentStr = equipment
    ? [
        equipment.machine ? `Machine: ${equipment.machine}` : null,
        equipment.grinder ? `Grinder: ${equipment.grinder} (lower number = finer, higher number = coarser)` : null,
      ].filter(Boolean).join(", ")
    : "Equipment: not specified";

  const bagLines = [
    [bagData.roaster, bagData.name].filter(Boolean).join(" — ") || "New bag",
    bagData.roastLevel && bagData.roastLevel !== "unspecified"
      ? `Roast: ${bagData.roastLevel.replace("_", " ")}`
      : null,
    bagData.processingMethod && bagData.processingMethod !== "unspecified"
      ? `Process: ${bagData.processingMethod.replace(/_/g, " ")}`
      : null,
    bagData.origins?.length
      ? `Origin: ${bagData.origins.map((o) => [o.country, o.region, o.variety].filter(Boolean).join(", ")).join(" / ")}`
      : null,
    bagData.notes ? `Flavor notes: ${bagData.notes}` : null,
  ].filter(Boolean).join("\n");

  const TASTE_LABELS = ["", "Very Sour", "Sour", "Slightly Sour", "Balanced", "Slightly Bitter", "Bitter", "Very Bitter"];
  const shotLines = shotsForContext.map((s) => {
    const ratio = s.yieldG && s.doseG ? (s.yieldG / s.doseG).toFixed(2) : "?";
    const taste = s.tasteBalance != null ? (TASTE_LABELS[Math.round(s.tasteBalance)] ?? null) : null;
    return [
      `${s.roaster} ${s.bagName} (${s.roastLevel?.replace("_", " ") ?? "?"})`,
      `${s.doseG}g→${s.yieldG ?? "?"}g (1:${ratio})`,
      s.shotTimeSeconds ? `${s.shotTimeSeconds}s` : null,
      s.grindSetting ? `grind ${s.grindSetting}` : null,
      s.shotRating ? `${s.shotRating}/5★` : null,
      taste,
      s.notes ? `"${s.notes}"` : null,
    ].filter(Boolean).join(" · ");
  });

  const context = `New bag:\n${bagLines}\n\n${equipmentStr}\n\nRecent shots for context:\n${shotLines.length ? shotLines.map((l) => `  ${l}`).join("\n") : "  (no similar shots yet)"}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: `You are an expert espresso coach. Given a new bag of coffee and the user's recent shot history, give a concise starting point for dialing in this specific bean.

Respond ONLY with valid JSON: {"tip": "2-3 sentence actionable recommendation"}

Critical rules:
- GRIND DIRECTION: lower number = finer grind, higher number = coarser grind. To go finer, decrease the number. To go coarser, increase the number. Never flip this.
- GRINDER KNOWLEDGE: If the grinder model is specified, use your knowledge of its scale and typical espresso range to suggest a realistic starting range (give a range, not a single number).
- REFERENCE SHOTS: If reference shots are provided, anchor your suggestion to those actual logged grind numbers.
- NO DATA: When the grinder model is unknown and no reference shots exist, do NOT give a specific number. Suggest starting on the coarser end of the espresso range and stepping 3-5 settings finer per try until the shot flows in 25-35 seconds.
- Suggest a starting dose/ratio and a systematic adjustment approach (3-5 settings per step while dialing in).
- Do not repeat the bag name or ask questions.`,
      messages: [{ role: "user", content: context }],
    });

    const raw = msg.content[0];
    if (raw.type !== "text") return { error: "Unexpected response." };

    const start = raw.text.indexOf("{");
    const end = raw.text.lastIndexOf("}");
    if (start === -1 || end === -1) return { error: "Could not parse response." };

    const parsed = JSON.parse(raw.text.slice(start, end + 1));
    if (!parsed.tip) return { error: "No tip in response." };

    return { tip: parsed.tip as string };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Failed: ${message}` };
  }
}

const FAIL_REASON_DESCRIPTIONS: Record<string, string> = {
  channeling: "channeling (water bypassed the puck)",
  choking: "choking — shot too restricted, grind is already too fine",
  puck_collapse: "puck collapse",
  grind_error: "grind error",
  equipment_issue: "equipment issue",
  other: "other",
};

export async function getBagRecommendation(
  bagId: number
): Promise<{ tip: string } | { error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY is not configured." };
  }

  const [bag, equipment] = await Promise.all([
    db.select().from(bags).where(eq(bags.id, bagId)).limit(1).then((r) => r[0] ?? null),
    db.select().from(equipmentProfiles).where(eq(equipmentProfiles.isActive, true)).limit(1).then((r) => r[0] ?? null),
  ]);

  if (!bag) return { error: "Bag not found." };

  // All shots from this bag (including failed) — needed to understand direction
  const bagShots = await db
    .select({
      doseG: shots.doseG,
      yieldG: shots.yieldG,
      shotTimeSeconds: shots.shotTimeSeconds,
      grindSetting: shots.grindSetting,
      shotRating: shots.shotRating,
      tasteBalance: shots.tasteBalance,
      notes: shots.notes,
      pulledAt: shots.pulledAt,
      isFailed: shots.isFailed,
      failReason: shots.failReason,
    })
    .from(shots)
    .where(eq(shots.bagId, bagId))
    .orderBy(desc(shots.pulledAt))
    .limit(15);

  // Previous bags of the SAME coffee — highest-quality grind reference
  const prevSameCoffeeShots = await db
    .select({
      doseG: shots.doseG,
      yieldG: shots.yieldG,
      grindSetting: shots.grindSetting,
      shotRating: shots.shotRating,
      bagName: bags.name,
      roaster: bags.roaster,
    })
    .from(shots)
    .innerJoin(bags, eq(shots.bagId, bags.id))
    .where(and(
      sql`lower(${bags.roaster}) = lower(${bag.roaster})`,
      sql`lower(${bags.name}) = lower(${bag.name})`,
      ne(bags.id, bagId),
      eq(shots.isFailed, false),
    ))
    .orderBy(desc(shots.pulledAt))
    .limit(6);

  // Other bags of same roast level — broader context
  const roastLevelShots = await db
    .select({
      doseG: shots.doseG,
      yieldG: shots.yieldG,
      grindSetting: shots.grindSetting,
      shotRating: shots.shotRating,
      bagName: bags.name,
      roaster: bags.roaster,
    })
    .from(shots)
    .innerJoin(bags, eq(shots.bagId, bags.id))
    .where(and(
      eq(bags.roastLevel, bag.roastLevel),
      ne(bags.id, bagId),
      sql`NOT (lower(${bags.roaster}) = lower(${bag.roaster}) AND lower(${bags.name}) = lower(${bag.name}))`,
      eq(shots.isFailed, false),
    ))
    .orderBy(desc(shots.pulledAt))
    .limit(4);

  const TASTE_LABELS = ["", "Very Sour", "Sour", "Slightly Sour", "Balanced", "Slightly Bitter", "Bitter", "Very Bitter"];

  const bagLines = [
    [bag.roaster, bag.name].filter(Boolean).join(" — "),
    bag.roastLevel && bag.roastLevel !== "unspecified" ? `Roast: ${bag.roastLevel.replace("_", " ")}` : null,
    bag.processingMethod && bag.processingMethod !== "unspecified" ? `Process: ${bag.processingMethod.replace(/_/g, " ")}` : null,
    bag.notes ? `Flavor notes: ${bag.notes}` : null,
  ].filter(Boolean).join("\n");

  const equipmentStr = equipment
    ? [
        equipment.machine ? `Machine: ${equipment.machine}` : null,
        equipment.grinder ? `Grinder: ${equipment.grinder} (lower number = finer, higher number = coarser)` : null,
      ].filter(Boolean).join(", ")
    : "Equipment: not specified";

  const hasShotHistory = bagShots.length > 0;

  const bagShotLines = bagShots.map((s, i) => {
    if (s.isFailed) {
      return [
        `Shot ${bagShots.length - i} [FAILED: ${FAIL_REASON_DESCRIPTIONS[s.failReason ?? ""] ?? (s.failReason ?? "unknown reason")}]`,
        `${s.doseG}g`,
        s.grindSetting ? `grind ${s.grindSetting}` : null,
        s.notes ? `"${s.notes}"` : null,
      ].filter(Boolean).join(" · ");
    }
    const ratio = s.yieldG && s.doseG ? (s.yieldG / s.doseG).toFixed(2) : "?";
    const taste = s.tasteBalance != null ? (TASTE_LABELS[Math.round(s.tasteBalance)] ?? null) : null;
    return [
      `Shot ${bagShots.length - i}`,
      `${s.doseG}g→${s.yieldG ?? "?"}g (1:${ratio})`,
      s.shotTimeSeconds ? `${s.shotTimeSeconds}s` : null,
      s.grindSetting ? `grind ${s.grindSetting}` : null,
      s.shotRating ? `${s.shotRating}/5★` : null,
      taste,
      s.notes ? `"${s.notes}"` : null,
    ].filter(Boolean).join(" · ");
  });

  const fmtRefShot = (s: { doseG: number; yieldG: number | null; grindSetting: number | null; shotRating: number | null; roaster: string; bagName: string }) => {
    const ratio = s.yieldG && s.doseG ? (s.yieldG / s.doseG).toFixed(2) : "?";
    return [
      `${s.roaster} ${s.bagName}`,
      `${s.doseG}g→${s.yieldG ?? "?"}g (1:${ratio})`,
      s.grindSetting ? `grind ${s.grindSetting}` : null,
      s.shotRating ? `${s.shotRating}/5★` : null,
    ].filter(Boolean).join(" · ");
  };

  const prevCoffeeSection = prevSameCoffeeShots.length > 0
    ? `\n\nPrevious bags of same coffee — USE THESE GRIND NUMBERS AS PRIMARY REFERENCE:\n${prevSameCoffeeShots.map((s) => `  ${fmtRefShot(s)}`).join("\n")}`
    : "";

  const roastSection = roastLevelShots.length > 0
    ? `\n\nOther ${bag.roastLevel?.replace("_", " ")} roast bags for context:\n${roastLevelShots.map((s) => `  ${fmtRefShot(s)}`).join("\n")}`
    : "";

  const hasOnlyFailedShots = hasShotHistory && bagShots.every((s) => s.isFailed);
  const hasAnyChokingFailure = bagShots.some((s) => s.isFailed && s.failReason === "choking");
  const chokingNote = hasOnlyFailedShots && hasAnyChokingFailure
    ? "\n\n⚠️ ALL shots on this bag have failed due to choking — grind is significantly too fine. A large jump coarser (8-15 settings) is likely needed, not a minor tweak."
    : hasAnyChokingFailure
    ? "\n\n⚠�� Some shots have failed due to choking — avoid suggesting finer (lower) adjustments."
    : "";

  const context = hasShotHistory
    ? `Bag:\n${bagLines}\n\n${equipmentStr}\n\nShots from this bag (newest first):\n${bagShotLines.map((l) => `  ${l}`).join("\n")}${prevCoffeeSection}${roastSection}${chokingNote}`
    : `Bag:\n${bagLines}\n\n${equipmentStr}${prevCoffeeSection}${roastSection}`;

  const system = hasShotHistory
    ? `You are an expert espresso coach. The user has been dialing in this bag and wants specific improvement advice based on their shot history.

Respond ONLY with valid JSON: {"tip": "2-4 sentence actionable advice"}

Critical rules:
- GRIND DIRECTION: lower number = finer grind, higher number = coarser grind. To go finer, decrease the number. To go coarser, increase the number. Never flip this.
- ADJUSTMENT MAGNITUDE — match the size of the problem:
  * All shots so far are FAILED (especially choking): grind is drastically off. Recommend jumping 8-15 settings coarser (higher number), not 2-3.
  * Severely fast / sour or channeling with no flow: jump 5-10 settings.
  * Moderate issue (slightly sour, slightly fast): adjust 3-5 settings.
  * Fine-tuning near the sweet spot: 1-2 settings.
- "Choking" = shot barely flows or stops completely — grind is ALREADY TOO FINE. Do NOT suggest going finer (lower). Recommend a significant jump coarser (higher).
- GRINDER KNOWLEDGE: Use your knowledge of the grinder model (if specified) to validate that suggested numbers fall within a realistic espresso range for that grinder. State the range explicitly when helpful.
- NEVER invent a grind number that isn't in the history or derivable from known grinder ranges. If you are estimating from grinder knowledge, say so.
- Do not repeat the bag name or ask questions.`
    : `You are an expert espresso coach. Give a concise starting point for dialing in this specific bean.

Respond ONLY with valid JSON: {"tip": "2-3 sentence actionable recommendation"}

Critical rules:
- GRIND DIRECTION: lower number = finer grind, higher number = coarser grind. To go finer, decrease the number. To go coarser, increase the number. Never flip this.
- GRINDER KNOWLEDGE: If the grinder model is specified, use your knowledge of its scale and typical espresso range to give a realistic starting range (e.g., Niche Zero espresso is typically 18-32). State the range, not a single number.
- REFERENCE SHOTS: If reference shots are provided, anchor your suggestion to those actual grind numbers.
- NO DATA: When no grind reference exists and the grinder model is unknown, do NOT give a specific number. Instead give a direction and a step size: e.g., "start on the coarser end of your espresso range, then move 3-5 settings finer at a time until the shot flows in 25-35 seconds."
- Suggest a starting dose/ratio and how to step through the adjustment systematically (3-5 settings per try is a good increment while dialing in).
- Do not repeat the bag name or ask questions.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system,
      messages: [{ role: "user", content: context }],
    });

    const raw = msg.content[0];
    if (raw.type !== "text") return { error: "Unexpected response." };

    const start = raw.text.indexOf("{");
    const end = raw.text.lastIndexOf("}");
    if (start === -1 || end === -1) return { error: "Could not parse response." };

    const parsed = JSON.parse(raw.text.slice(start, end + 1));
    if (!parsed.tip) return { error: "No tip in response." };

    const tip = parsed.tip as string;
    await db.update(bags).set({ dialInTip: tip, updatedAt: sql`(datetime('now'))` }).where(eq(bags.id, bagId));
    revalidatePath(`/bags/${bagId}`);

    return { tip };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Failed: ${message}` };
  }
}
