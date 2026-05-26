# CupLog

Personal espresso shot logging and bean inventory PWA for home baristas. Tracks bean bags, espresso pulls, and finished drinks with automatic drink detection, bean freshness windows, and AI-powered shot analysis.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
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
npx tsx src/db/seed.ts  # optional: load seed data
npm run dev
```

---

## Navigation

| Tab | Route | Description |
|---|---|---|
| Log | `/log` | New shot form |
| Bags | `/bags` | Bean inventory |
| History | `/history` | Shot list + detail |
| More | `/more` | Equipment, Drinks, Stats, AI settings |

**More sub-pages:**

| Route | Description |
|---|---|
| `/more/stats` | Rating histograms, scatter plots, trend charts |
| `/more/drinks` | Standalone drink history |
| `/more/recipes` | Static espresso drink reference |
| `/more/equipment` | Equipment profile + cleaning tracking |
| `/more/thresholds` | Extraction time/ratio classification ranges |
| `/more/coaching-state` | AI coach rolling context editor |

---

## What Has Been Built

### Infrastructure
- [x] Next.js App Router with TypeScript and Tailwind CSS v4
- [x] Drizzle ORM with libSQL (local SQLite) and Turso (production) support
- [x] Full database schema — 8 tables
- [x] Seed data: 3 bags, equipment profile, extraction thresholds
- [x] PWA configuration — `manifest.json`, service worker, iOS meta tags, home screen icons
- [x] iOS-native design system: CSS tokens, light + dark mode, typography scale, spacing
- [x] 480px max-width centered column — app stays phone-width on wide monitors
- [x] Fixed bottom tab bar with safe-area insets
- [x] Fixed-position save buttons constrained to the 480px column (`.fixed-col`)

### Home Page
- [x] All-time averages grid: rating, taste balance, dose, yield, time, ratio
- [x] Active beans freshness card — mini 5-zone timeline bar per bag with today marker; taps to bag detail
- [x] Equipment cleaning overdue warning — red banner when machine or grinder is past cleaning interval
- [x] Last shot card — roaster/bag, detected drink, stats, taste, notes

### Bags (Bean Inventory)
- [x] Bag list — active bags by default, toggle to show finished
- [x] Bag cards: roaster, name, roast level, days since roast + freshness label, decaf/blend badges, origin countries
- [x] Per-bag freshness windows — auto-estimated from roast level + processing method (15 combinations); user-overridable
- [x] Bag detail — 5-zone freshness timeline with today marker; context-specific writeup per roast+process combination; shot history stats
- [x] Add / edit bag — all fields, multi-origin support, peak freshness override
- [x] Mark as finished / remove (soft delete)
- [x] Duplicate bag detection — Replace / Add as new / Cancel modal
- [x] AI bag entry — paste bag label text, Claude extracts structured fields
- [x] "New bag of same coffee" shortcut on bag detail

### Shots (Log + History)
- [x] Log form — bag selector, dose, yield, shot time, lag (g), grind setting, pre-infusion, spring weight, WDT toggle, grinder retention
- [x] Defaults from last shot: dose, grind setting, spring weight, WDT
- [x] Live ratio + classification badge preview
- [x] Live adjusted dose display (`dose − retention`) and "stopped at Xg" lag helper
- [x] Taste section: sour↔bitter spectrum (1=Very Sour · 4=Balanced · 7=Very Bitter) + 5-star shot rating
- [x] Drink section: milk type/quantity, foam, hot water, live drink detection badge
- [x] Shot history — filters: bag chips, text search, date range, time/ratio classification chips
- [x] Archived bag label (`[Archived]`) on shots from removed bags
- [x] Shot detail — all fields, classifications, freshness badge, taste display, drink composition bar
- [x] Edit shot (including drink), delete shot (confirm step)
- [x] AI shot analysis — structured coaching response; verdict badge; cached in DB; never re-calls API on return visits

### More → Stats
- [x] Rating distribution histogram (colored bars 1★–5★)
- [x] Taste balance distribution histogram (7 buckets, sour→bitter)
- [x] Ratio vs taste scatter — dots colored by rating; balanced zone highlighted
- [x] Time vs taste scatter — same format
- [x] Rating over time trend — dots colored by taste balance; rolling average overlay
- [x] Roast age vs taste scatter — validates freshness window effectiveness
- [x] Grinder retention trend — connected dots to surface drift/cleaning need

### More → Equipment
- [x] Multiple equipment profiles, switch active profile
- [x] Add / edit profile: machine, grinder, tamper, default spring weight, cleaning intervals, notes
- [x] Cleaning tracking — mark cleaned today, days-since display, overdue warnings on home + More

### More → Drinks
- [x] All logged drinks newest-first; min rating filter
- [x] Drink composition bars (dark-mode aware)
- [x] Links to parent shot detail

### More → Recipes (Static Reference)
- [x] Visual espresso drink guide — 20+ drinks with composition bars and proportions

### More → Extraction Thresholds
- [x] Inline editor for time and ratio classification ranges
- [x] DB-driven — thresholds read at runtime, not hardcoded
- [x] Restore defaults with confirm step

### More → AI Coaching State
- [x] Manual editor for AI coach rolling context (experience level, patterns, bean notes)

---

## Database Schema (8 tables)

| Table | Purpose |
|---|---|
| `bags` | Bean inventory — roaster, name, roast level, processing method, freshness window |
| `bag_origins` | Per-bean origin data; supports blends with multiple origins |
| `equipment_profiles` | Machine + grinder config, cleaning intervals, last-cleaned dates |
| `extraction_thresholds` | DB-driven time/ratio classification ranges |
| `shots` | Every espresso pull — dose, yield, time, grind, taste, rating, notes |
| `drinks` | Drink built on a shot — milk, foam, hot water, detected name, rating |
| `coaching_state` | Single-row AI coach context — experience level, patterns, bean notes |
| `shot_analyses` | Cached AI analysis results per shot |

---

## Key Technical Decisions

- **Server Actions over API routes** — all mutations are `"use server"` functions returning `{ success } | { error }` typed unions
- **`useActionState` for form state** — pairs naturally with server actions; no client state management library
- **DB-driven classification** — `classifyTime()` / `classifyRatio()` read thresholds from DB at runtime with hardcoded fallback
- **`drizzle-kit push` for deployment** — schema applied directly to Turso; migration files are gitignored
- **Per-bag freshness windows** — `estimatePeakWindow(roastLevel, processingMethod, isDecaf)` covers 15 roast/process combinations; stored on the bag so the user can override
- **Hardcoded drink detection** — `detectDrink()` in `drinkDetection.ts` is a pure synchronous function; runs client-side for live preview and server-side on save
- **`lagG` field** — Breville Bambino has no 3-way solenoid valve; 6–8g drip-through after pump stop is normal; stop before target yield and record resting weight
- **`tasteBalance` single control** — 1=Very Sour · 4=Balanced · 7=Very Bitter. Individual taste columns (acidity, sweetness, bitterness, body, aroma) remain in the schema but are unused in the UI
- **AI analysis caching** — results stored in `shot_analyses`; return visits never trigger an API call. Only *recent* shots (within 48h) update `coaching_state`
- **SVG server components for charts** — all stat charts render server-side as inline SVG; no charting library

---

## Deployment Checklist

- [ ] Create Turso database
- [ ] Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel environment
- [ ] Set `ANTHROPIC_API_KEY` in Vercel environment
- [ ] Run `npx drizzle-kit push` against Turso to apply schema
- [ ] Deploy to Vercel
