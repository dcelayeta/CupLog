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
  additions,
  recipes,
  recipeComponents,
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

  // ── Additions ─────────────────────────────────────────────────────────────

  const additionRows = await db.insert(additions).values([
    // Syrups
    { name: "Vanilla Syrup", category: "syrup" },
    { name: "Caramel Syrup", category: "syrup" },
    { name: "Hazelnut Syrup", category: "syrup" },
    { name: "Brown Sugar Syrup", category: "syrup" },
    { name: "Lavender Syrup", category: "syrup" },
    // Spices
    { name: "Cinnamon", category: "spice" },
    { name: "Nutmeg", category: "spice" },
    { name: "Cardamom", category: "spice" },
    { name: "Cocoa Powder", category: "spice" },
    // Supplements
    { name: "Collagen", category: "supplement" },
    { name: "Protein Powder", category: "supplement" },
    { name: "Ashwagandha", category: "supplement" },
    // Flavors
    { name: "Chai Concentrate", category: "flavor" },
    { name: "Matcha", category: "flavor" },
    { name: "Pumpkin Spice", category: "flavor" },
    { name: "Peppermint", category: "flavor" },
  ]).returning();
  console.log("✓ Additions");

  const chaiId = additionRows.find((a) => a.name === "Chai Concentrate")!.id;

  // ── Recipes ───────────────────────────────────────────────────────────────

  const recipeRows = await db.insert(recipes).values([
    { name: "Espresso", description: "Single shot", totalVolumeMl: 30 },
    { name: "Doppio", description: "Double shot", totalVolumeMl: 60 },
    { name: "Americano", description: "Espresso with hot water", totalVolumeMl: 150 },
    { name: "Cortado", description: "Equal parts espresso and steamed milk", totalVolumeMl: 60 },
    { name: "Flat White", description: "Espresso with velvety steamed milk, smaller than a latte", totalVolumeMl: 150 },
    { name: "Latte", description: "Espresso with a large pour of steamed milk", totalVolumeMl: 270 },
    { name: "Cappuccino", description: "Equal parts espresso, steamed milk, and foam", totalVolumeMl: 150 },
    { name: "Macchiato", description: "Espresso with a small amount of milk foam", totalVolumeMl: 45 },
    { name: "Iced Latte", description: "Espresso over ice with cold milk", totalVolumeMl: 270 },
    { name: "Dirty Chai", description: "Espresso with chai concentrate and steamed milk", totalVolumeMl: 210 },
  ]).returning();
  console.log("✓ Recipes");

  const r = (name: string) => recipeRows.find((rec) => rec.name === name)!.id;

  await db.insert(recipeComponents).values([
    // Espresso
    { recipeId: r("Espresso"), name: "Espresso", sortOrder: 1 },
    // Doppio
    { recipeId: r("Doppio"), name: "Espresso", sortOrder: 1 },
    // Americano
    { recipeId: r("Americano"), name: "Espresso", sortOrder: 1 },
    { recipeId: r("Americano"), name: "Hot Water", minQuantity: 100, maxQuantity: 150, unit: "ml", sortOrder: 2 },
    // Cortado — 1:1 to 1:2 espresso:milk, ~20–60ml milk
    { recipeId: r("Cortado"), name: "Espresso", sortOrder: 1 },
    { recipeId: r("Cortado"), name: "Steamed Milk", minQuantity: 20, maxQuantity: 60, unit: "ml", isMilkComponent: true, sortOrder: 2 },
    // Flat White — 80–150ml steamed milk
    { recipeId: r("Flat White"), name: "Espresso", sortOrder: 1 },
    { recipeId: r("Flat White"), name: "Steamed Milk", minQuantity: 80, maxQuantity: 150, unit: "ml", isMilkComponent: true, sortOrder: 2 },
    // Latte — 180–300ml steamed milk
    { recipeId: r("Latte"), name: "Espresso", sortOrder: 1 },
    { recipeId: r("Latte"), name: "Steamed Milk", minQuantity: 180, maxQuantity: 300, unit: "ml", isMilkComponent: true, sortOrder: 2 },
    // Cappuccino — 40–80ml steamed milk, hot
    { recipeId: r("Cappuccino"), name: "Espresso", sortOrder: 1 },
    { recipeId: r("Cappuccino"), name: "Steamed Milk", minQuantity: 40, maxQuantity: 80, unit: "ml", isMilkComponent: true, sortOrder: 2 },
    // Macchiato — up to 30ml milk foam
    { recipeId: r("Macchiato"), name: "Espresso", sortOrder: 1 },
    { recipeId: r("Macchiato"), name: "Milk Foam", minQuantity: 5, maxQuantity: 30, unit: "ml", isMilkComponent: true, sortOrder: 2 },
    // Iced Latte — cold milk 180–300ml
    { recipeId: r("Iced Latte"), name: "Espresso", sortOrder: 1 },
    { recipeId: r("Iced Latte"), name: "Cold Milk", minQuantity: 180, maxQuantity: 300, unit: "ml", isMilkComponent: true, sortOrder: 2 },
    // Dirty Chai — requires chai addition + milk 120–240ml
    { recipeId: r("Dirty Chai"), name: "Espresso", sortOrder: 1 },
    { recipeId: r("Dirty Chai"), name: "Steamed Milk", minQuantity: 100, maxQuantity: 200, unit: "ml", isMilkComponent: true, sortOrder: 2 },
    { recipeId: r("Dirty Chai"), name: "Chai Concentrate", requiredAdditionId: chaiId, sortOrder: 3 },
  ]);
  console.log("✓ Recipe components");

  // ── Equipment profile ─────────────────────────────────────────────────────

  await db.insert(equipmentProfiles).values({
    name: "Home Setup",
    machine: "Breville Bambino",
    grinder: "Baratza Encore ESP Pro",
    tamper: "Normcore Self-Leveling",
    defaultSpringWeightLbs: 30,
    machineCleaningIntervalDays: 30,
    grinderCleaningIntervalDays: 14,
    isActive: true,
    notes: "No 3-way solenoid valve — expect 6-8g drip lag after pump stop. Always stop pump before target yield to account for lag. 10 min warmup + blank flush before pulling shots.",
  });
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

  console.log("\nSeed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
