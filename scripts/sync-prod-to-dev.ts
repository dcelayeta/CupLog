/**
 * Syncs all data from the production Turso DB into the dev Turso DB.
 * Run with: npx tsx scripts/sync-prod-to-dev.ts
 *
 * Reads credentials from environment variables:
 *   PROD: TURSO_PROD_DATABASE_URL + TURSO_PROD_AUTH_TOKEN (or fall back to .env.production.local)
 *   DEV:  TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
 */

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv(file: string): Record<string, string> {
  try {
    const text = readFileSync(resolve(process.cwd(), file), "utf8");
    const result: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
    return result;
  } catch {
    return {};
  }
}

const envLocal = loadEnv(".env.local");
const envProd = loadEnv(".env.production.local");

const PROD_URL = process.env.TURSO_PROD_DATABASE_URL ?? envLocal.TURSO_PROD_DATABASE_URL ?? envProd.TURSO_DATABASE_URL;
const PROD_TOKEN = process.env.TURSO_PROD_AUTH_TOKEN ?? envLocal.TURSO_PROD_AUTH_TOKEN ?? envProd.TURSO_AUTH_TOKEN;
const DEV_URL = process.env.TURSO_DATABASE_URL ?? envLocal.TURSO_DATABASE_URL;
const DEV_TOKEN = process.env.TURSO_AUTH_TOKEN ?? envLocal.TURSO_AUTH_TOKEN;

if (!PROD_URL || !PROD_TOKEN || !DEV_URL || !DEV_TOKEN) {
  console.error("Missing DB credentials. Check .env.local and .env.production.local");
  process.exit(1);
}

const prod = createClient({ url: PROD_URL, authToken: PROD_TOKEN });
const dev = createClient({ url: DEV_URL, authToken: DEV_TOKEN });

// Tables in insert order (parents before children)
const TABLES = [
  "equipment_profiles",
  "extraction_thresholds",
  "coffee_faqs",
  "bags",
  "bag_origins",
  "shots",
  "drinks",
  "coaching_state",
  "shot_analyses",
  "bag_analyses",
];

async function fetchAll(client: ReturnType<typeof createClient>, table: string) {
  const result = await client.execute(`SELECT * FROM ${table}`);
  return result.rows;
}

async function main() {
  console.log(`Source: ${PROD_URL}`);
  console.log(`Target: ${DEV_URL}\n`);

  // Read all prod data first
  const data: Record<string, typeof prod extends { execute: unknown } ? Awaited<ReturnType<typeof fetchAll>> : never> = {};
  for (const table of TABLES) {
    const rows = await fetchAll(prod, table);
    data[table] = rows;
    console.log(`  prod ${table}: ${rows.length} rows`);
  }

  console.log("\nClearing dev tables (reverse order)...");
  await dev.execute("PRAGMA foreign_keys = OFF");
  for (const table of [...TABLES].reverse()) {
    await dev.execute(`DELETE FROM ${table}`);
    console.log(`  cleared ${table}`);
  }

  console.log("\nInserting into dev...");
  for (const table of TABLES) {
    const rows = data[table];
    if (rows.length === 0) {
      console.log(`  ${table}: (empty)`);
      continue;
    }

    // Build column list from first row
    const cols = Object.keys(rows[0] as Record<string, unknown>);
    const placeholders = cols.map(() => "?").join(", ");
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;

    let count = 0;
    for (const row of rows) {
      const values = cols.map((c) => (row as Record<string, unknown>)[c] ?? null);
      await dev.execute({ sql, args: values as import("@libsql/client").InArgs });
      count++;
    }
    console.log(`  ${table}: inserted ${count} rows`);
  }

  await dev.execute("PRAGMA foreign_keys = ON");
  console.log("\nDone. Dev DB is now a copy of prod.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
