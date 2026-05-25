import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import {
  bags,
  bagOrigins,
  equipmentProfiles,
  extractionThresholds,
  shots,
} from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding database...");

  // ── Extraction thresholds ──────────────────────────────────────────────────

  await db.insert(extractionThresholds).values([
    // Time thresholds (seconds)
    { metric: "time", minValue: 0, maxValue: 20, label: "Very Fast", description: "Severely under-extracted — grind much finer", sortOrder: 1 },
    { metric: "time", minValue: 20, maxValue: 25, label: "Fast", description: "Under-extracted — grind finer", sortOrder: 2 },
    { metric: "time", minValue: 25, maxValue: 35, label: "Normal", description: "Good extraction range", sortOrder: 3 },
    { metric: "time", minValue: 35, maxValue: 45, label: "Slow", description: "Slightly over-extracted — grind coarser", sortOrder: 4 },
    { metric: "time", minValue: 45, maxValue: null, label: "Very Slow", description: "Severely over-extracted — grind much coarser", sortOrder: 5 },
    // Ratio thresholds
    { metric: "ratio", minValue: 0, maxValue: 1.5, label: "Ristretto", description: "Very concentrated, short pull", sortOrder: 1 },
    { metric: "ratio", minValue: 1.5, maxValue: 2.0, label: "Short", description: "Slightly under target ratio", sortOrder: 2 },
    { metric: "ratio", minValue: 2.0, maxValue: 2.5, label: "Normal", description: "Standard espresso ratio", sortOrder: 3 },
    { metric: "ratio", minValue: 2.5, maxValue: 3.0, label: "Long", description: "Extended pull, less concentrated", sortOrder: 4 },
    { metric: "ratio", minValue: 3.0, maxValue: null, label: "Lungo", description: "Very long pull, highly diluted", sortOrder: 5 },
  ]);
  console.log("✓ Extraction thresholds");

  // ── Equipment profile ─────────────────────────────────────────────────────

  const [equipmentProfile] = await db.insert(equipmentProfiles).values({
    name: "Home Setup",
    machine: "Breville Bambino",
    grinder: "Baratza Encore ESP Pro",
    tamper: "Normcore Self-Leveling",
    defaultSpringWeightLbs: 30,
    machineCleaningIntervalDays: 30,
    grinderCleaningIntervalDays: 14,
    isActive: true,
    notes: "No 3-way solenoid valve — expect 6-8g drip lag after pump stop. Always stop pump before target yield to account for lag. 10 min warmup + blank flush before pulling shots.",
  }).returning();
  console.log("✓ Equipment profile");

  // ── Seed bags ─────────────────────────────────────────────────────────────

  const bagRows = await db.insert(bags).values([
    {
      roaster: "Metric",
      name: "Ándale Market",
      isBlend: true,
      isDecaf: false,
      roastLevel: "medium",
      processingMethod: "unspecified",
      roastDate: "2026-04-27",
      purchaseShop: "Metric Coffee Chicago",
      status: "active",
      notes: 'Cherry, Nougat, Wildflower Honey. Bright, acidic Latin American blend. Coordinates on bag: 41°53\'12"N 87°40\'39"W — Metric roastery location.',
    },
    {
      roaster: "Luckycat",
      name: "Maomi Blend",
      isBlend: true,
      isDecaf: false,
      roastLevel: "unspecified",
      processingMethod: "unspecified",
      roastDate: "2026-05-04",
      purchaseShop: "Luckycat Coffee",
      status: "active",
      notes: "Caramel, Cocoa, Nuts. Full-bodied, low acidity blend. Good milk drink bean.",
    },
    {
      roaster: "Metric",
      name: "Decaf Huila Pink Bourbon",
      isBlend: false,
      isDecaf: true,
      roastLevel: "unspecified",
      processingMethod: "ea_washed",
      roastDate: "2026-05-18",
      purchaseShop: "Metric Coffee Chicago",
      status: "active",
      notes: "Luxardo, Ganache, Orange Peel. EA Washed (sugarcane ethyl acetate) decaf process. Pink Bourbon variety. High elevation 1700-1900 MASL. Do not use until May 25 2026 — too fresh.",
    },
  ]).returning();
  console.log("✓ Bags");

  const [bag1, bag2, bag3] = bagRows;

  await db.insert(bagOrigins).values([
    // Ándale Market
    { bagId: bag1.id, country: "Mexico" },
    { bagId: bag1.id, country: "Guatemala" },
    // Maomi Blend
    { bagId: bag2.id, country: "Papua New Guinea" },
    { bagId: bag2.id, country: "Guatemala" },
    { bagId: bag2.id, country: "Mexico" },
    // Decaf Huila Pink Bourbon
    { bagId: bag3.id, country: "Colombia", region: "Huila", variety: "Pink Bourbon" },
  ]);
  console.log("✓ Bag origins");

  // ── Seed shots ────────────────────────────────────────────────────────────

  await db.insert(shots).values([
    // Shot 1 — Bag 1 (Ándale), 15lb spring, no WDT, sour
    {
      bagId: bag1.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-07T08:00:00", grindSetting: 37.0,
      doseG: 18.0, yieldG: 36.0, shotTimeSeconds: 36,
      springWeightLbs: 15, wdtUsed: false, preinfusionSeconds: 10,
      acidity: 4, sweetness: 2, bitterness: 1, body: 2, aroma: 2, tasteBalance: 2, shotRating: 1,
      notes: "Sour. Early shot, still learning workflow. Using 15lb spring, no WDT yet. Extended manual preinfusion ~10 seconds.",
    },
    // Shot 2 — uneven flow, drip lag
    {
      bagId: bag1.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-08T08:00:00", grindSetting: 36.5,
      doseG: 18.0, yieldG: 38.0, shotTimeSeconds: 25,
      springWeightLbs: 15, wdtUsed: false, preinfusionSeconds: 10,
      acidity: 4, sweetness: 2, bitterness: 1, body: 2, aroma: 2, tasteBalance: 2, shotRating: 1,
      notes: "Still sour. Flow all over the place, more on one spout than the other. Stopped machine at ~30g, significant drip lag to 38g.",
    },
    // Shot 3 — WDT introduced, over-extracted
    {
      bagId: bag1.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-09T08:00:00", grindSetting: 34.5,
      doseG: 18.1, yieldG: 43.3, shotTimeSeconds: 43,
      springWeightLbs: 15, wdtUsed: true, preinfusionSeconds: 10,
      acidity: 4, sweetness: 2, bitterness: 2, body: 2, aroma: 2, tasteBalance: 2, shotRating: 1,
      notes: "Went finer to address sourness. Flow restricted at first, just dripping. Over-extracted. Still sour. WDT introduced this session. Extended preinfusion still in use.",
    },
    // Shot 4 — 30lb spring, no preinfusion, best so far
    {
      bagId: bag1.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-10T08:00:00", grindSetting: 35.5,
      doseG: 18.0, yieldG: 37.5, shotTimeSeconds: 35,
      springWeightLbs: 30, wdtUsed: true, preinfusionSeconds: 0,
      acidity: 3, sweetness: 3, bitterness: 2, body: 2, aroma: 3, tasteBalance: 2, shotRating: 2,
      notes: "Switched to 30lb spring. No manual preinfusion. Flow even from both spouts. Slightly sour but noticeably more balanced than previous shots. Best shot so far.",
    },
    // Shot 5 — getting closer
    {
      bagId: bag1.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-11T08:00:00", grindSetting: 34.5,
      doseG: 18.1, yieldG: 39.6, shotTimeSeconds: 31,
      springWeightLbs: 30, wdtUsed: true, preinfusionSeconds: 0,
      acidity: 3, sweetness: 3, bitterness: 2, body: 3, aroma: 3, tasteBalance: 2, shotRating: 3,
      notes: "Slightly sour but really good with milk. Both spouts but concentrated in one for a while mid-shot. Puck intact. Getting closer.",
    },
    // Shot 6 — possibly best on this bean
    {
      bagId: bag1.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-12T08:00:00", grindSetting: 33.0,
      doseG: 18.1, yieldG: 39.6, shotTimeSeconds: 31,
      springWeightLbs: 30, wdtUsed: true, preinfusionSeconds: 0,
      acidity: 3, sweetness: 3, bitterness: 2, body: 3, aroma: 3, tasteBalance: 2, shotRating: 3,
      notes: "Slightly sour, less than other shots. Came through both spouts but not the whole time — concentrated in one for a while. Really good with milk. Possibly best shot yet on this bean.",
    },
    // Shot 7 — aging bean, fast shot
    {
      bagId: bag1.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-13T08:00:00", grindSetting: 34.0,
      doseG: 18.1, yieldG: 38.0, shotTimeSeconds: 23,
      springWeightLbs: 30, wdtUsed: true, preinfusionSeconds: 0,
      acidity: 4, sweetness: 2, bitterness: 1, body: 2, aroma: 2, tasteBalance: 2, shotRating: 2,
      notes: "Sour. Fast shot at 23 seconds. Stopped at ~30g. Bean getting older at 16 days — may need finer grind as it ages.",
    },
    // Shot 8 — Gaby's affogato (single, coarse, no time logged)
    {
      bagId: bag1.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-14T15:00:00", grindSetting: 39.5,
      doseG: 9.0, yieldG: 40.0, shotTimeSeconds: null,
      springWeightLbs: 30, wdtUsed: false, preinfusionSeconds: 0,
      acidity: 2, sweetness: 3, bitterness: 3, body: 2, aroma: 2, tasteBalance: 3, shotRating: 3,
      notes: "Gaby's shot. Single 9g dose for affogato. Much more balanced — likely due to very long ratio (1:4.4) diluting acidity. Coarse grind 39.5.",
    },
    // Shot 9 — Diego single shot test, fast and bitter
    {
      bagId: bag1.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-14T15:30:00", grindSetting: null,
      doseG: 8.0, yieldG: 21.0, shotTimeSeconds: 16,
      springWeightLbs: 30, wdtUsed: true, preinfusionSeconds: 0,
      acidity: 2, sweetness: 2, bitterness: 4, body: 2, aroma: 2, tasteBalance: 4, shotRating: 2,
      notes: "8g single shot test for affogato. 21g in 16 seconds — very fast, slightly bitter. Small dose + no 3-way solenoid made drip lag proportionally huge. Difficult on the Bambino.",
    },
    // Shot 10 — overextraction test, no yield/time logged
    {
      bagId: bag1.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-15T08:00:00", grindSetting: 31.5,
      doseG: 18.0, yieldG: null, shotTimeSeconds: null,
      springWeightLbs: 30, wdtUsed: true, preinfusionSeconds: 0,
      acidity: 2, sweetness: 2, bitterness: 4, body: 3, aroma: 2, tasteBalance: 4, shotRating: 2,
      notes: "Went very fine (31-32 range) to test limits. Over-extracted and slightly bitter. Flow uneven. Useful to identify the over-extraction end of the spectrum on this bean.",
    },
    // Shot 11 — first Maomi, no scale
    {
      bagId: bag2.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-16T08:00:00", grindSetting: 34.0,
      doseG: 18.0, yieldG: null, shotTimeSeconds: null,
      springWeightLbs: 30, wdtUsed: true, preinfusionSeconds: 0,
      acidity: 2, sweetness: 3, bitterness: 4, body: 3, aroma: 3, tasteBalance: 4, shotRating: 2,
      notes: "First shot on Maomi. Purged ~20g first to clear Ándale from burrs. Slightly bitter but not too bad. Did not log scale — no yield or time recorded.",
    },
    // Shot 12 — Maomi, accidental preinfusion, no yield
    {
      bagId: bag2.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-16T08:30:00", grindSetting: 35.0,
      doseG: 18.0, yieldG: null, shotTimeSeconds: 40,
      springWeightLbs: 30, wdtUsed: true, preinfusionSeconds: 10,
      acidity: 4, sweetness: 2, bitterness: 2, body: 2, aroma: 2, tasteBalance: 2, shotRating: 1,
      notes: "Went coarser to 35. Accidentally used 10 second manual preinfusion — old habit. Over-extracted at 40 seconds. Flow restricted. Sour. Identified preinfusion as ongoing variable causing inconsistency.",
    },
    // Shot 13 — Maomi best shot
    {
      bagId: bag2.id, equipmentProfileId: equipmentProfile.id,
      pulledAt: "2026-05-16T09:00:00", grindSetting: 35.0,
      doseG: 18.1, yieldG: 37.4, shotTimeSeconds: 33,
      springWeightLbs: 30, wdtUsed: true, preinfusionSeconds: 0,
      grinderRetentionG: 0.1,
      acidity: 3, sweetness: 3, bitterness: 2, body: 3, aroma: 3, tasteBalance: 2, shotRating: 3,
      notes: "Best shot yet. No manual preinfusion. Flow came out more on right spout then started on left halfway through — mild channeling. Acid taste that does not linger much. Really good with milk. Grinder retention 0.1g.",
    },
  ]);
  console.log("✓ Shots (13)");

  console.log("\nSeed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
