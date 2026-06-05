import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ─── bags ────────────────────────────────────────────────────────────────────

export const bags = sqliteTable("bags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roaster: text("roaster").notNull(),
  name: text("name").notNull(),
  isBlend: integer("is_blend", { mode: "boolean" }).notNull().default(false),
  isDecaf: integer("is_decaf", { mode: "boolean" }).notNull().default(false),
  roastLevel: text("roast_level", {
    enum: ["light", "medium_light", "medium", "medium_dark", "dark", "unspecified"],
  })
    .notNull()
    .default("unspecified"),
  processingMethod: text("processing_method", {
    enum: ["washed", "natural", "honey", "anaerobic", "ea_washed", "swiss_water", "other", "unspecified"],
  })
    .notNull()
    .default("unspecified"),
  roastDate: text("roast_date").notNull(), // ISO date string YYYY-MM-DD
  purchaseDate: text("purchase_date"),
  purchaseShop: text("purchase_shop"),
  price: real("price"),
  weightG: integer("weight_g"),
  weightCorrectionG: integer("weight_correction_g").default(0),
  dialInTip: text("dial_in_tip"),
  status: text("status", { enum: ["active", "reserve", "finished", "removed"] })
    .notNull()
    .default("active"),
  finishedDate: text("finished_date"),
  peakStartDay: integer("peak_start_day"),
  peakEndDay: integer("peak_end_day"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── bag_origins ─────────────────────────────────────────────────────────────

export const bagOrigins = sqliteTable("bag_origins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bagId: integer("bag_id")
    .notNull()
    .references(() => bags.id),
  country: text("country").notNull(),
  region: text("region"),
  farm: text("farm"),
  variety: text("variety"),
  blendPercentage: integer("blend_percentage"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── equipment_profiles ──────────────────────────────────────────────────────

export const equipmentProfiles = sqliteTable("equipment_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  machine: text("machine"),
  grinder: text("grinder"),
  tamper: text("tamper"),
  portafilter: text("portafilter"),
  basket: text("basket"),
  scale: text("scale"),
  wdtTool: text("wdt_tool"),
  distributionTool: text("distribution_tool"),
  defaultSpringWeightLbs: integer("default_spring_weight_lbs"),
  machineLastCleanedAt: text("machine_last_cleaned_at"),
  grinderLastCleanedAt: text("grinder_last_cleaned_at"),
  machineCleaningIntervalDays: integer("machine_cleaning_interval_days").default(30),
  grinderCleaningIntervalDays: integer("grinder_cleaning_interval_days").default(14),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── extraction_thresholds ───────────────────────────────────────────────────

export const extractionThresholds = sqliteTable("extraction_thresholds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  metric: text("metric", { enum: ["time", "ratio"] }).notNull(),
  minValue: real("min_value").notNull(),
  maxValue: real("max_value"), // null = no upper bound
  label: text("label").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── shots ───────────────────────────────────────────────────────────────────

export const shots = sqliteTable("shots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bagId: integer("bag_id")
    .notNull()
    .references(() => bags.id),
  equipmentProfileId: integer("equipment_profile_id").references(
    () => equipmentProfiles.id
  ),
  pulledAt: text("pulled_at").notNull(), // ISO datetime
  grindSetting: real("grind_setting"),
  doseG: real("dose_g").notNull(),
  yieldG: real("yield_g"),
  shotTimeSeconds: integer("shot_time_seconds"),
  lagG: real("lag_g"), // grams that drip through after pressing stop (no 3-way valve)
  preinfusionSeconds: integer("preinfusion_seconds"),
  temperatureC: real("temperature_c").default(93),
  pressureBar: real("pressure_bar").default(9),
  springWeightLbs: integer("spring_weight_lbs"),
  wdtUsed: integer("wdt_used", { mode: "boolean" }).notNull().default(false),
  distributionToolUsed: integer("distribution_tool_used", { mode: "boolean" }).notNull().default(false),
  grinderRetentionG: real("grinder_retention_g"),
  tasteBalance: integer("taste_balance"), // 1=very sour … 4=balanced … 7=very bitter
  shotRating: integer("shot_rating"), // 1–5 stars
  flowCharacteristics: text("flow_characteristics", {
    enum: ["normal", "one_spout_dominant", "both_spouts_uneven", "spraying", "dripping_restricted", "very_fast"],
  }),
  isFailed: integer("is_failed", { mode: "boolean" }).notNull().default(false),
  failReason: text("fail_reason", {
    enum: ["channeling", "choking", "puck_collapse", "grind_error", "equipment_issue", "other"],
  }),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── drinks ──────────────────────────────────────────────────────────────────

export const drinks = sqliteTable("drinks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shotId: integer("shot_id")
    .notNull()
    .references(() => shots.id),
  milkType: text("milk_type", {
    enum: ["whole", "oat", "almond", "soy", "coconut", "skim", "half_and_half", "none"],
  }),
  milkQuantityMl: integer("milk_quantity_ml"),
  foamMl: integer("foam_ml"),
  hotWaterMl: integer("hot_water_ml"),
  detectedDrinkName: text("detected_drink_name"),
  isIced: integer("is_iced", { mode: "boolean" }).notNull().default(false),
  overallRating: integer("overall_rating"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── coaching_state ──────────────────────────────────────────────────────────
// Single row, always id=1. Upserted after every recent shot analysis.

export const coachingState = sqliteTable("coaching_state", {
  id: integer("id").primaryKey(),
  experienceLevel: text("experience_level").notNull().default("beginner"),
  currentFocus: text("current_focus"),
  knownPatterns: text("known_patterns"),
  lastRecommendation: text("last_recommendation"),
  lastAnalysisDate: text("last_analysis_date"),
  lastAnalyzedShotId: integer("last_analyzed_shot_id").references(() => shots.id),
  beanContexts: text("bean_contexts"), // JSON array stored as text
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── shot_analyses ────────────────────────────────────────────────────────────
// Persists every analysis result so it can be re-read without re-calling the API.

export const shotAnalyses = sqliteTable("shot_analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shotId: integer("shot_id")
    .notNull()
    .references(() => shots.id),
  analysisMode: text("analysis_mode", { enum: ["recent", "historical"] }).notNull(),
  summary: text("summary"),
  numbers: text("numbers"),
  recommendationAction: text("recommendation_action"),
  recommendationReason: text("recommendation_reason"),
  beanContext: text("bean_context"),
  progressNote: text("progress_note"),
  overallVerdict: text("overall_verdict"),
  isStable: integer("is_stable", { mode: "boolean" }).notNull().default(false),
  rawResponse: text("raw_response"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── bag_analyses ────────────────────────────────────────────────────────────

export const bagAnalyses = sqliteTable("bag_analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bagId: integer("bag_id").notNull().references(() => bags.id),
  summary: text("summary").notNull(),
  recommendation: text("recommendation").notNull(), // "buy_again" | "try_with_adjustments" | "avoid"
  recommendationReason: text("recommendation_reason").notNull(),
  grindNotes: text("grind_notes"),
  tasteNotes: text("taste_notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── coffee_faqs ─────────────────────────────────────────────────────────────

export const coffeeFaqs = sqliteTable("coffee_faqs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull().default("General"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── app_config ──────────────────────────────────────────────────────────────

export const appConfig = sqliteTable("app_config", {
  id: integer("id").primaryKey(),
  lowInventoryWarningCups: integer("low_inventory_warning_cups").notNull().default(14),
  recentShotWindow: integer("recent_shot_window").notNull().default(10),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type Bag = typeof bags.$inferSelect;
export type NewBag = typeof bags.$inferInsert;
export type BagOrigin = typeof bagOrigins.$inferSelect;
export type NewBagOrigin = typeof bagOrigins.$inferInsert;
export type EquipmentProfile = typeof equipmentProfiles.$inferSelect;
export type NewEquipmentProfile = typeof equipmentProfiles.$inferInsert;
export type ExtractionThreshold = typeof extractionThresholds.$inferSelect;
export type Shot = typeof shots.$inferSelect;
export type NewShot = typeof shots.$inferInsert;
export type Drink = typeof drinks.$inferSelect;
export type NewDrink = typeof drinks.$inferInsert;
export type CoachingState = typeof coachingState.$inferSelect;
export type ShotAnalysis = typeof shotAnalyses.$inferSelect;
export type AppConfig = typeof appConfig.$inferSelect;
export type CoffeeFaq = typeof coffeeFaqs.$inferSelect;
export type BagAnalysis = typeof bagAnalyses.$inferSelect;
