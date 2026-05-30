#!/usr/bin/env node
/**
 * Usage:
 *   npm run db:pull   — copy production data into the dev database (seeds dev)
 *
 * Reads from TURSO_PROD_DATABASE_URL + TURSO_PROD_AUTH_TOKEN
 * Writes to  TURSO_DATABASE_URL      + TURSO_AUTH_TOKEN
 *
 * Requires both sets of credentials in .env.local
 */

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (dotenv not guaranteed available as a dep)
const envPath = resolve(__dirname, "../.env.local");
const envLines = readFileSync(envPath, "utf8").split("\n");
for (const line of envLines) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const TABLES = [
  "equipment_profiles",
  "bags",
  "bag_origins",
  "extraction_thresholds",
  "coaching_state",
  "shots",
  "drinks",
  "shot_analyses",
  "bag_analyses",
  "coffee_faqs",
];

async function pull() {
  const prodUrl = process.env.TURSO_PROD_DATABASE_URL;
  const prodToken = process.env.TURSO_PROD_AUTH_TOKEN;
  const devUrl = process.env.TURSO_DATABASE_URL;
  const devToken = process.env.TURSO_AUTH_TOKEN;

  if (!prodUrl || !prodToken) {
    console.error("Missing TURSO_PROD_DATABASE_URL or TURSO_PROD_AUTH_TOKEN in .env.local");
    process.exit(1);
  }
  if (!devUrl || !devToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local");
    process.exit(1);
  }

  const prod = createClient({ url: prodUrl, authToken: prodToken });
  const dev = createClient({ url: devUrl, authToken: devToken });

  console.log("Pulling production data into dev...\n");

  await dev.execute("PRAGMA foreign_keys=OFF");

  for (const table of [...TABLES].reverse()) {
    await dev.execute(`DELETE FROM ${table}`);
  }
  console.log("Cleared dev database.");

  for (const table of TABLES) {
    const { rows, columns } = await prod.execute(`SELECT * FROM ${table}`);
    if (rows.length === 0) {
      console.log(`  ${table}: 0 rows (skipped)`);
      continue;
    }
    const cols = columns.join(", ");
    for (const row of rows) {
      const vals = columns.map((col) => {
        const v = row[col];
        if (v === null || v === undefined) return "NULL";
        if (typeof v === "number") return String(v);
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      await dev.execute(
        `INSERT INTO ${table} (${cols}) VALUES (${vals.join(", ")})`
      );
    }
    console.log(`  ${table}: ${rows.length} rows`);
  }

  await dev.execute("PRAGMA foreign_keys=ON");
  console.log("\nDone — dev is now seeded with production data.");
  prod.close();
  dev.close();
}

pull().catch((err) => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
