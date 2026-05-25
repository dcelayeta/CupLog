# CupLog

Personal espresso shot logging and bean inventory PWA for home baristas. Tracks bean bags, espresso pulls, and finished drinks with automatic extraction classification, recipe detection, and AI-powered shot analysis.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Server Actions) |
| Database | libSQL / SQLite locally → Turso in production |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel (planned) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Language | TypeScript |

---

## Running Locally

```bash
npm install

# create .env.local:
# TURSO_DATABASE_URL=file:local.db
# TURSO_AUTH_TOKEN=
# ANTHROPIC_API_KEY=sk-ant-...

npx drizzle-kit push    # apply schema to local SQLite
npx tsx src/db/seed.ts  # load seed data
npm run dev
```

---

## Navigation

| Tab | Route | Description |
|---|---|---|
| Log | `/log` | New shot form |
| Bags | `/bags` | Bean inventory |
| History | `/history` | Shot list + detail |
| More | `/more` | Equipment, Drinks, Recipes, AI settings |

Shot detail: `/history/[id]` — Shot edit: `/history/[id]/edit`

---

## What Has Been Built

### Infrastructure
- [x] Next.js App Router with TypeScript and Tailwind CSS v4
- [x] Drizzle ORM with libSQL (local SQLite) and Turso (production) support
- [x] Full database schema — 12 tables (including `coaching_state` and `shot_analyses`)
- [x] Seed data: 3 bags (Metric Ándale Market, Luckycat Maomi Blend, Metric Decaf Huila Pink Bourbon), equipment profile, additions, recipes, extraction thresholds
- [x] PWA configuration — `manifest.json`, service worker, iOS meta tags, home screen icon support
- [x] PWA icons — `icon-192.png` and `icon-512.png` generated (espresso cup graphic)
- [x] iOS-native design system: CSS tokens, light + dark mode, typography scale, spacing
- [x] 480px max-width centered column — app stays phone-width on wide monitors
- [x] Fixed bottom tab bar with safe-area insets, always on top
- [x] Fixed-position save buttons constrained to the 480px column (`.fixed-col` CSS class)

### Bags (Bean Inventory)
- [x] Bag list — active bags by default, toggle to show finished
- [x] Bag cards: roaster, name, roast level, days since roast + freshness label, decaf/blend badges, origin countries
- [x] Bag detail — all fields, origins, freshness badge, shot history stats (shot count, avg taste balance, avg retention)
- [x] Add bag form — all fields, origins section (supports blends with multiple origins)
- [x] Edit bag form
- [x] Mark as finished / remove (soft delete)
- [x] Duplicate bag detection — modal with Replace (auto-sets `finished_date` on replaced bag) / Add as new / Cancel
- [x] AI bag entry — paste text from a bag label, Claude extracts structured fields automatically
- [x] "New bag of same coffee" shortcut — button on bag detail pre-fills the add form

### Shots (Log + History)
- [x] Log form — bag selector, dose, yield, shot time, lag (g), grind setting, pre-infusion, spring weight, WDT toggle, grinder retention
- [x] Defaults from last shot: dose, grind setting, spring weight, WDT on
- [x] Live ratio + classification badge preview while filling the form
- [x] Live adjusted dose display (`dose - retention`) in the preview strip
- [x] Live "stopped at Xg" display when lag is set (Bambino drip-through helper)
- [x] Taste section: sour↔bitter balance spectrum (1=very sour, 3=balanced, 5=very bitter) + 5-star shot rating
- [x] Shot notes
- [x] Drink section embedded in log form: milk type/quantity/temperature, additions multi-select, drink rating, drink notes
- [x] Live recipe detection badge in drink section before saving
- [x] After save: navigates directly to shot detail in history
- [x] History list — newest first; each card: bag, date/time, dose→yield, ratio, time, classification badges, freshness badge, recipe badge, star rating
- [x] History filters: bag chips, text search (roaster/bag/notes/recipe), date range, time classification chips, ratio classification chips
- [x] Archived bag label — `[Archived]` prefix on shots from removed bags
- [x] Shot detail page — all fields, classifications, freshness, taste balance display, star ratings, drink details
- [x] Edit shot — full re-edit including drink section with manual recipe select
- [x] Delete shot — confirm step, cascades drink_additions → drinks → shots
- [x] AI shot analysis — "✦ Analyze with AI" button on detail page; structured coaching response (Summary / What the Numbers Say / The One Thing to Change / Bean Context / Progress); verdict badge; cached to DB, shown immediately on return visits

### More → Equipment
- [x] Equipment profiles list — multiple profiles supported
- [x] Add new profile, switch active profile
- [x] Edit any profile: machine, grinder, tamper, default spring weight, cleaning intervals, notes
- [x] Cleaning tracking — "Mark machine/grinder cleaned today" buttons, days-since-cleaning display, overdue warnings in red
- [x] Overdue cleaning warning banner on More page Equipment row

### More → Drinks
- [x] Standalone drink history at `/more/drinks` — all logged drinks newest-first
- [x] Recipe filter chips — filter to drinks matching a specific recipe
- [x] Min rating filter (Any / 3★+ / 4★+ / 5★)
- [x] Each card links through to the shot detail

### More → Additions
- [x] List all additions grouped by category (syrup, spice, supplement, flavor, other)
- [x] Add new addition inline
- [x] Toggle active/inactive per addition

### More → Recipes
- [x] Recipe list with active/inactive toggles
- [x] Recipe detail page — components list, matched drinks count
- [x] Add/edit recipe form — name, description, components (milk, addition, or plain type; min/max quantity range; unit)
- [x] Recipe detection engine — pure synchronous `detectRecipe()` runs client-side (live preview) and server-side (on save)
- [x] Manual recipe override in shot edit form (select from active recipes)

### More → Extraction Thresholds
- [x] Inline editor for all time and ratio threshold ranges
- [x] DB-driven classification — `classifyTime()` / `classifyRatio()` read thresholds from DB at runtime
- [x] Restore defaults — two-step confirm, resets to hardcoded standard ranges
- [x] Live preview in log form uses DB thresholds

### More → AI Coaching State
- [x] Manual editor for the AI coach's rolling context (experience level, known patterns, bean contexts, last recommendation)
- [x] Changes take effect on the next shot analysis

---

## Database Schema

12 tables:

| Table | Status |
|---|---|
| `bags` | ✅ full CRUD |
| `bag_origins` | ✅ schema + seed + bag add/edit form |
| `equipment_profiles` | ✅ full CRUD, multi-profile, active switching |
| `extraction_thresholds` | ✅ DB-driven classification + inline editor |
| `shots` | ✅ full CRUD |
| `additions` | ✅ full CRUD |
| `recipes` | ✅ full CRUD + detail page |
| `recipe_components` | ✅ via recipe form |
| `drinks` | ✅ embedded in shot log/edit + standalone list |
| `drink_additions` | ✅ embedded in shot log/edit |
| `coaching_state` | ✅ single row, upserted after each recent shot analysis |
| `shot_analyses` | ✅ persists every AI analysis result |

**Schema additions vs original spec:**
- `shots.lag_g` — grams of drip-through after pump stop (Bambino has no 3-way solenoid valve)
- `shots.taste_balance` — replaces the 5 individual taste columns (acidity/sweetness/bitterness/body/aroma) with a single sour↔bitter spectrum (1–5). The old columns remain in the DB but are unused in the UI.
- `shots.shot_rating` — 1–5 star rating of the shot itself (separate from drink's `overall_rating`)
- `recipe_components.min_quantity / max_quantity` — range instead of single quantity, for flexible recipe matching
- `recipe_components.is_milk_component / required_addition_id` — detection logic fields
- `coaching_state` — AI coach rolling context (experience level, current focus, known patterns, per-bean dialing-in state)
- `shot_analyses` — persisted AI analysis results (avoids re-calling API on return visits)

---

## What Is Not Yet Built

- [ ] **Deployment** — Turso production database and Vercel deployment not yet configured

---

## Key Technical Decisions

- **Server Actions over API routes** — all mutations are `"use server"` functions returning `{ success } | { error }` typed unions
- **`useActionState` for form state** — pairs naturally with server actions; no extra client state management library needed
- **DB-driven classification** — `classifyTime()` / `classifyRatio()` accept optional `ExtractionThreshold[]`, read from DB at runtime with hardcoded fallback
- **Drinks embedded in shots** — simplifies the log flow; standalone `/more/drinks` provides browse access
- **`lagG` field** — Breville Bambino has no 3-way solenoid valve, so 6–8g drip-through after pump stop is normal. Stop the machine before target yield; record final resting weight in Yield.
- **`tasteBalance` replaces 5 sliders** — 1 = Very Sour · 3 = Balanced · 5 = Very Bitter. The old DB columns are retained in case data migration is needed.
- **Live recipe detection** — `detectRecipe()` is synchronous and pure; runs on client for live badge preview, and again server-side on save.
- **AI analysis** — uses `claude-sonnet-4-6` with a full structured system prompt. Response is JSON with 5 sections + overall verdict + updated coaching state. Cached in `shot_analyses` table — re-reading never triggers an API call.
- **Coaching state** — single-row table, upserted after every *recent* shot analysis (within 48h). Historical shot analyses never overwrite it. Manually editable at `/more/coaching-state`.
- **AI bag entry** — uses a higher-capability model to parse free-text bag label into structured fields before the user saves.
