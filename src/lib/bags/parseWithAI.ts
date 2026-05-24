"use server";

import Anthropic from "@anthropic-ai/sdk";

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
