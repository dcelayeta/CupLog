# Yield

Personal espresso shot logging and bean inventory PWA for home baristas. Tracks bean bags, espresso pulls, and finished drinks with automatic drink detection, bean freshness windows, and AI-powered shot analysis.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Database | libSQL / SQLite locally → Turso in production |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Language | TypeScript |

---

## Running Locally

```bash
npm install

# create .env.local:
# TURSO_DATABASE_URL=libsql://...
# TURSO_AUTH_TOKEN=
# ANTHROPIC_API_KEY=sk-ant-...

npx drizzle-kit push    # apply schema to Turso dev DB
npm run dev
```

To sync production data to your dev database:

```bash
# also requires .env.production.local with prod TURSO_DATABASE_URL / TURSO_AUTH_TOKEN
npx tsx scripts/sync-prod-to-dev.ts
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
| `/more/stats` | Rating histograms, scatter plots, trend charts, bean stats |
| `/more/drinks` | Standalone drink history |
| `/more/recipes` | Static espresso drink reference |
| `/more/equipment` | Equipment profile + cleaning tracking |
| `/more/thresholds` | Extraction time/ratio classification ranges |
| `/more/coaching-state` | AI coach rolling context editor |
| `/more/yield-calculator` | Dose → yield table for standard ratios (1:1–1:4) |
| `/api/export` | Download all data as JSON backup |

---

## What Has Been Built

### Infrastructure
- [x] Next.js App Router with TypeScript and Tailwind CSS v4
- [x] Drizzle ORM with libSQL (local SQLite) and Turso (production) support
- [x] Full database schema — 11 tables
- [x] PWA configuration — `manifest.json`, service worker, iOS meta tags, home screen icons
- [x] iOS-native design system: CSS tokens, light + dark + auto theme, typography scale, spacing
- [x] Theme stored in `localStorage` with inline script to apply before first paint (no flash)
- [x] 480px max-width centered column — app stays phone-width on wide monitors
- [x] Fixed bottom tab bar with safe-area insets
- [x] Fixed-position save buttons constrained to the 480px column (`.fixed-col`)
- [x] Prod → dev database sync script (`scripts/sync-prod-to-dev.ts`)

### Home Page
- [x] All-time averages grid: rating, taste balance, dose, yield, time, ratio
- [x] Active beans freshness card — mini 5-zone timeline bar per bag with today marker; taps to bag detail
- [x] Equipment cleaning overdue warning — red banner when machine or grinder is past cleaning interval
- [x] Almost empty warning — orange banner when estimated cups remaining drops below a configurable threshold (default 14 cups); cups calculated from rolling 10-shot avg dose per bag (fallback: all-time avg, then 18g); links to bag detail (single) or bag list (multiple); threshold adjustable in More → Thresholds
- [x] Entering peak notification — green banner on the day a bag reaches its estimated peak start; links to bag detail or bag list
- [x] Last shot card — roaster/bag, detected drink, stats, taste, notes
- [x] Shots-today counter — subtitle shows `xx shots (x today)` and failed count
- [x] Next shot recommendation — client-side card using browser time for timezone accuracy; caffeine-aware: hides if a caf shot was pulled today (before 2pm) or a decaf shot was pulled today; shows decaf-only after 2pm if caf was already had; hides entirely after 7pm; hides if no active beans of the appropriate variety; ranks by freshness priority (in peak > approaching > too fresh); skips past-peak beans; links to bag detail
- [x] AI recommendation on next shot card — shows last shot's AI coaching action with purple AI badge; falls back to most recent stable (`is_stable = true`) analysis if no analysis on the last shot; includes "View shot details →" link
- [x] Drink suggestion card — random drink from recipe library on load; ↺ Shuffle button; obeys same caffeine-aware visibility rules as next shot card; hides after 7pm

### Bags (Bean Inventory)
- [x] Bag list — active bags by default, toggle to show finished; count badges on Active/Finished/All tabs
- [x] Bag cards: roaster, name, roast level, days since roast + freshness label, decaf/blend badges, origin countries
- [x] Per-bag freshness windows — auto-estimated from roast level + processing method (15 combinations); user-overridable
- [x] Bag detail — 5-zone freshness timeline with today marker; context-specific writeup per roast+process combination; shot history stats
- [x] Add / edit bag — all fields, multi-origin support, peak freshness override; Roaster field is a type-ahead picker over the Roasters directory (see More → Roasters) — pick an existing roaster or type a new name to leave it unlinked until formalized later
- [x] Mark as finished / remove (soft delete)
- [x] Duplicate bag detection — Replace / Add as new / Cancel modal
- [x] AI bag entry — three independent inputs: bag photo, product URL (fetched server-side), and free-text notes; any combination works; Claude extracts and merges structured fields from all provided sources; graceful URL fetch fallback (shows warning, continues with remaining sources); strict anti-hallucination — never infers region/farm/variety from training knowledge; after parsing, DB lookup backfills missing coffee-level fields (roast level, process, origins) from any prior bag of same roaster+name; if name doesn't match exactly but is similar (Jaccard word overlap ≥ 0.35), prompts "Same coffee as [X]?" — confirm to backfill fields and use that bag's shot history as primary dial-in reference; dial-in tip uses shot history from previous bags of same coffee as primary grind reference
- [x] "New bag of same coffee" shortcut on bag detail
- [x] Per-bag shot analysis charts — Grind vs Taste scatter, Rating Trend (true bag-scoped shot number on X, not a filtered index — unrated shots leave a visible gap), Drink Rating Trend (same pattern, scoped to this bag's drinks joined through their shot, dot colored by the drink's own rating), Extraction Ratio bar, Yield vs. Time scatter with target-ratio reference zones at the bag's average dose (dot color: green on-target, orange off-target, gray no-target, red failed) (server-side SVG)
- [x] Avg Drink Rating — alongside Avg Shot Rating on the bag detail info list, as a blue ★ chip (shot rating stays orange) on bag cards and the home page's Active Beans list; averages `drinks.overall_rating` for drinks whose shot belongs to the bag
- [x] Drink rating shown after the drink name — history list badges, the home page's Last Shot card
- [x] Cups remaining per active bag — shown on bag card; calculated from rolling avg dose window (fallback: all-time avg, then 18g); highlights in orange below 5 cups
- [x] Auto-zero weight correction on finish — when marking a bag finished, `weightCorrectionG` is set to account for family/non-logged consumption; re-finishing after reactivation recomputes correctly
- [x] Buy Planner — candidate bag input (roast level, process, weight); phase-based cascade run-out for caf and decaf bags independently; three-state buy decision (Buy it / Caution / Pass) with past-peak stale detection; freshness timeline with bean-type visual hierarchy (non-matching type dimmed); per-bag phase-aware rate labels; rolling consumption window slider; daily rate includes apportioned bag weight corrections (family consumption + grinder purge)

### Shots (Log + History)
- [x] Log form — fields ordered by workflow: grind → dose → retention (adjusted dose inline) → WDT → distribution tool → spring weight → pre-infusion → shot time → flow → yield → lag (ratio + classification inline) → date & time; pre-infusion defaults from last shot of that bag
- [x] Defaults from last shot per bag: dose, grind setting, lag, spring weight, WDT, distribution tool, pre-infusion
- [x] Two-step log flow — step 1 bean picker: uniform 2-col grid cards, sorted by Recommended (peak freshness + right caffeine for time of day) → caffeine match → last used; cards show last shot date/time, star rating, Decaf + Last used badges; recommended card highlighted with light blue tint; freshness label + days-since-roast shown per card; "Use soon" badge (orange) on beans with ≤7 days left in their peak window; step 2 is full log form pre-selected but still editable; single-bag users skip step 1
- [x] Flow illustration — inline SVG in log form that updates live as the Flow pill changes; dark-mode aware via `currentColor` outlines and `var(--card)` fills; no separate image files
- [x] Spouted vs. naked (bottomless) portafilter support — equipment profile stores a default kit (portafilter/basket/type) plus an optional alternate kit; log form and edit-shot form show a kit toggle chip when an alt kit is configured, switching both the available Flow options and the illustration; each shot snapshots its own `portafilterType`/`portafilterName`/`basketName` so history stays accurate even if the equipment profile changes later. Spouted flow options: Normal / Very Fast / Restricted / Both Spouts Uneven / One Spout Dominant. Naked flow options: Normal / Very Fast / Restricted / Spraying / Uneven Streams (spouts can't spray, naked can't show a dominant spout)
- [x] Portafilter kit display simplified to type only — the log/edit-shot kit toggle chip and the shot history "Portafilter" row show just "Spouted" or "Bottomless" instead of the full configured name, which wrapped onto multiple lines; the "Basket" row was dropped from shot history entirely (low signal). The full `portafilter_name`/`basket_name` strings are still sent to the AI analysis prompt unchanged
- [x] Last portafilter kit remembered per coffee — the log form's Spouted/Bottomless toggle starts on the kit used for the last shot of the selected bag (matched by type, or by name when both kits share a type), using the same per-bag defaults as dose/grind/etc. and falling back to the most recent shot; switching bags switches the kit too
- [x] Rows-read reduction for Turso free tier — roaster list/detail stats are computed with one grouped query each instead of correlated subqueries per roaster (the list page was reading ~10M rows per load), and the foreign-key columns (`shots.bag_id`, `drinks.shot_id`, `shot_analyses.shot_id`, `bag_origins.bag_id`, `bags.roaster_id`) have indexes declared in `src/db/schema.ts`
- [x] `shots.pulled_at` indexed (`shots_pulled_at_idx`) — the "latest shot" and shot-number queries now read one row instead of scanning the whole table
- [x] Stats page — "Origin by country" rating breakdown added above the region chart, rolling up the per-origin rows by country
- [x] StepperInput (−/+ buttons) for dose, yield, grind, retention, milk, foam, hot water — avoids decimal keyboard on iOS
- [x] Live ratio + classification badge preview
- [x] Live adjusted dose display (`dose − retention`) and "stopped at Xg" lag helper
- [x] Target Ratio picker in log form — Turbo Ristretto/Ristretto/Espresso/Normale/Long Pull/Lungo presets (shared with Yield Calculator); selecting one live-fills yield + shot time from the adjusted dose and tracks dose/retention changes; defaults to the nearest preset for the bean's last shot; shows a "target Xg in Y–Zs (stop at ~Wg)" hint using that bean's average lag; clears if yield/time are edited manually; purely a pull guide — doesn't affect Fast/Normal/Slow classification, which stays calibrated to standard espresso ratios
- [x] Taste section: sour↔bitter spectrum (1=Very Sour · 4=Balanced · 7=Very Bitter) + 5-star shot rating
- [x] Drink section: milk type/quantity, foam (5ml steps), hot water, live drink detection badge
- [x] Flat White detection widened — accepts a Ristretto base (not just Doppio) and a 56–149ml milk floor (was 80ml), closing a gap where a 56–79ml pour matched nothing; backfilled 17 historical drinks that had silently gone unlabeled
- [x] Pressure and temperature stored as schema defaults (9 bar, 93°C) — not shown in UI
- [x] Shot history — filters: bag chips, text search, date range, time/ratio classification chips, AI badge toggle, Locked toggle, star rating filter (1–5★)
- [x] Time-based section dividers in history — Today / This Week / This Month / Older (rolling windows, browser-local time)
- [x] Per-shot freshness label uses the bag's own peak window (not global defaults)
- [x] Archived bag label (`[Archived]`) on shots from removed bags
- [x] Lock badge on history cards — purple pill with lock icon for locked shots
- [x] Shot detail — all fields, classifications, freshness badge, taste display, drink composition bar; flow illustration shown inline when flow was logged
- [x] `targetRatioLabel` persisted per shot (log + edit forms) — the intended pull style, independent of measured yield/time
- [x] Target vs. actual chart on shot detail — time × yield scatter zoomed to fit the target zone (and a "near-miss" zone if the shot landed closer to a different style), bordered colored bands (blue = target, orange = near-miss) sized to the real ±3g yield tolerance, dot color-coded hit/miss, actual `(time, yield)` labeled next to the dot in matching color; axes fixed to realistic bounds (60s machine auto-stop, 80g ceiling); shots with no recorded target still show the closest matching style as an orange reference zone; hit/miss classification lives in `src/lib/shots/targetHit.ts`, shared with the Stats page and AI analysis so all three can't drift apart
- [x] `ClientDateTime` uses a hand-rolled date/time formatter instead of `toLocaleString` — avoids SSR/hydration mismatches from Node ICU version differences in the en-US separator
- [x] Dialed In Recipe card on bag detail — shows grind, adjusted dose, target yield range (±2g) from most recent locked shot; "Edit locked shot" link
- [x] Log form shows locked parameters (grind, adjusted dose, target yield) and AI recommendation inline between Bean and Shot sections
- [x] Parameters locked banner on shot detail — purple banner above shot section when `isLocked = true`
- [x] Edit shot (including drink), delete shot (confirm step)
- [x] Parameters locked toggle in edit form — manually lock/unlock shot parameters
- [x] AI shot analysis — structured coaching response; verdict badge; cached in DB; never re-calls API on return visits
- [x] AI analysis includes the shot's target ratio intention (`current_shot.target`: intended style, target yield/time, hit/miss, what style it landed closer to if missed) plus `target_style` on recent context shots — lets the coach reason about intention vs. result instead of only the raw numbers; prompt tuned to mention it once briefly rather than re-deriving the hit/miss against the industry-standard label
- [x] AI analysis includes `flow_characteristics`, `portafilter_type`, `portafilter_name`, and `basket_name` on both `current_shot` and each `context_shots` entry — previously the structured flow tag and per-shot portafilter kit were fetched but never actually sent to Claude despite the system prompt telling it to use flow notes for channeling diagnosis; the hardcoded "54mm stock, non-pressurized single-wall basket" line was also removed from the system prompt in favor of the real per-shot value, since Diego now switches between a spouted and a naked/bottomless portafilter
- [x] AI analysis reliability — `max_tokens` raised from 3000 → 8000 → 16000 (a truncated response produces invalid JSON that used to get stored verbatim as a garbled "summary"); `stop_reason === "max_tokens"` is detected and discarded before parsing instead of persisting a broken record. `bean_contexts` in `updated_coaching_state` is now a **sparse update** — the model only returns bags it actually touched this turn (always including the current bag) instead of re-echoing every tracked bag on every call; the app merges the update into the stored state by `bag_id` (`mergeBeanContexts`) before trimming and saving. This was the real driver of intermittent truncation on the first analysis attempt: output size scaled with total bag count (26+ bags) rather than with what actually changed
- [x] `analyzeShotById` returns a typed `AnalyzeShotResult` (`{success: true, analysis}` or `{success: false, reason, message}`) instead of `AnalysisResult | null` — every failure path (rate limit, auth error, connection error, other API error, truncated response, empty response, JSON parse failure, shot not found) now carries a specific, user-facing reason via the SDK's typed exception chain (`RateLimitError` → `AuthenticationError`/`PermissionDeniedError` → `APIConnectionError` → `APIError`), shown in `ShotAnalysisClient` instead of a generic "Something went wrong" — including on Re-analyze failures, which previously had no visible error state at all since the component stays on the already-rendered analysis
- [x] `known_patterns` auto-compression — once the AI coach's accumulated notes exceed 2500 characters, a small dedicated call condenses them toward ~1500 characters (preserving specific actionable facts, dropping stale/superseded entries) instead of growing unbounded and eventually re-triggering the truncation above; fails open (keeps the original text) if the compression call itself fails
- [x] `is_stable` flag on AI analysis — set by Claude when recommendation is to hold all parameters unchanged; auto-locks the shot (`isLocked = true`); stable format: "Lock grind X, dose Yg, target Z1–Z2g yield."
- [x] Fixed AI shot-count hallucination on re-analysis — re-running "Analyze with AI" on the same shot was causing Claude to narrate an incrementing "Shot 1 → Shot 2 → Shot 3" count (in both prose and the structured `bean_contexts[].shots_pulled` field) instead of the real, unchanging `total_shots_on_bag`; `current_bean.bag_id` is now sent explicitly so Claude can match the right `bean_contexts` entry, and the prompt spells out that re-analyzing the same shot is not a new shot
- [x] AI analysis survives dropped connections — the analysis is one long non-streaming Claude call, so Safari could report "Load failed" while the server still finished and saved the result. When the request throws, `ShotAnalysisClient` polls `getLatestAnalysisForShot` every 3s (up to ~5 min) for an analysis with a new id and shows it, instead of the error
- [x] Latte art tracking — 5-level artist scale (Pollock → Calder → Picasso → Monet → Van Gogh) on eligible drinks; picker in log/edit forms; displayed on shot detail and drink list

### More → Stats

**Shots section**
- [x] Rating distribution histogram (colored bars 1★–5★)
- [x] Taste balance distribution histogram (7 buckets, sour→bitter)
- [x] Flow rate distribution histogram (g/s buckets, color-coded by target range)
- [x] Ratio vs taste scatter — dots colored by rating; balanced zone highlighted
- [x] Time vs taste scatter — same format
- [x] Rating over time trend — dots colored by taste balance; rolling average overlay
- [x] Failed shots section — failure reason horizontal bar chart

**Technique section**
- [x] Yield vs time scatter (all shots) — dots color-coded on-target/off-target/no-target/failed using the shared `classifyShotAgainstTarget` logic; y-axis auto-scaled to data; light-blue reference bands + labels for all six pull styles (Turbo Ristretto → Lungo) positioned at the average dose across logged shots
- [x] Target accuracy bar chart — On/Off counts (bars scaled to each other, not crushed by the much larger "no target" bucket) with a "X% on target" stat line; no-target count shown as a footnote
- [x] Grinder retention trend — connected dots to surface drift/cleaning need
- [x] Roast age vs taste scatter — validates freshness window effectiveness

**Beans section**
- [x] Roast level distribution — all 5 levels always shown; unspecified count as footnote
- [x] Process method distribution — abbreviated labels; unspecified count as footnote
- [x] Origin by macro region — stacked rating bar (1★–5★) per region (Latin America, East Africa, etc.)
- [x] Origin — stacked rating bar per region·country
- [x] Single origin vs blend — stacked rating bar
- [x] Shots per roaster — stacked rating bar grouped by `roaster_id` when a bag is linked (so a rename/alias/merge stays one bucket), falling back to raw roaster text for unlinked bags
- [x] Shots per coffee — stacked rating bar per bag

**Drinks section**
- [x] Drink rating distribution histogram (colored bars 1★–5★, same format as the Shots section's rating histogram) with average stat
- [x] Drink types — stacked rating bar (logged drinks only, not inferred from shots)
- [x] Drink rating over time trend — rolling average overlay
- [x] Shot vs drink rating bubble chart — diagonal reference line; bubble size = count

### More → Roasters
- [x] Roaster directory — name, alias, website, location, notes; bag count, total shots pulled, avg shot rating, avg drink rating per roaster (each a scalar correlated subquery through bags → shots → drinks, all excluding soft-deleted `status = 'removed'` bags so the counts match what `getBagsForRoaster` actually lists — a roaster with a removed duplicate bag used to show one more bag/shot in its header than in its own Bags list; null averages hidden rather than shown as 0 when a roaster has no rated shots/drinks yet); list ordered by avg shot rating (unrated last), then bag count; the bag-count pill is solid blue with white text when the roaster has at least one active/reserve bag (gray otherwise), both on the list and the detail header
- [x] Detail page order — Profile (name/alias/website/location/notes) first, then Stats + Charts, then a Bags list (see below), then Delete, last
- [x] Bags list on the detail page — every non-removed bag linked to the roaster, newest roast first; active bags get the same `MiniFreshnessBar` used on the home page (extracted to `src/components/bags/MiniFreshnessBar.tsx` now that two pages need it) plus freshness label and days-since-roast; non-active bags show a status badge (Reserve/Finished) instead; each row shows shot count and avg shot/drink rating, links to the bag detail page
- [x] Alias — an optional short name shown everywhere bags.roaster is displayed instead of the full name (e.g. "Metric" instead of "Metric Coffee Co."); saving cascades `alias || name` to every linked bag's denormalized `roaster` text, the same mechanism a plain rename uses
- [x] Add / edit / delete roaster — name/alias must be unique against every other roaster's name/alias (resolution below would otherwise be ambiguous); deleting unlinks bags (`roaster_id = null`) without touching their existing roaster name
- [x] Per-roaster charts — shot ratings, taste balance, roast level, process method — same components as the global Stats tab, scoped to this roaster's bags; each chart hides itself when empty, computed from the bars actually rendered rather than the raw distribution total (which includes an "unspecified" bucket with no bar of its own — a roaster tagged entirely unspecified would otherwise pass a naive `> 0` check and render a chart with zero visible bars)
- [x] Website link — external-link icon on the Roasters list (tappable without opening the detail page; row navigation and the link are structural siblings, not nested `<a>`s) and a "Visit website" link on the detail page header
- [x] Bag form roaster field is a type-ahead combobox — shows existing roasters as tappable chips (all of them when empty, filtered as you type, matched against name or alias); linking is derived purely from an exact case-insensitive match against the roaster's name or alias, both client-side (for the suggestion UI) and server-side (`resolveRoasterLink` in `createBag`/`updateBag`, which re-verifies rather than trusting a client value — needed because the duplicate/fuzzy-match backfill flow can override the typed roaster name to a canonical prior spelling — and always writes back the resolved alias-or-name, not whatever the user actually typed)

### More → Equipment
- [x] Multiple equipment profiles, switch active profile
- [x] Add / edit profile: machine, grinder, tamper, default spring weight, cleaning intervals, notes
- [x] Cleaning tracking — mark cleaned today, days-since display, overdue warnings on home + More

### More → Drinks
- [x] All logged drinks newest-first; min rating filter
- [x] Drink composition bars (dark-mode aware)
- [x] Latte art rating badge (purple) on eligible drinks
- [x] Links to parent shot detail

### More → Recipes (Static Reference)
- [x] Visual espresso drink guide — 20+ drinks with composition bars and proportions
- [x] "Latte Art" badge on eligible drinks (Cortado, Flat White, Cappuccino, Latte, Mocha, Dirty Chai)
- [x] Espresso ratio shown for drinks with a real convention (Macchiato/Cortado/Affogato → Espresso 1:2, Flat White → Doppio 1:2), pulled from the shared `TARGET_RATIOS` module; drinks without a fixed convention stay "Any"

### More → Extraction Thresholds
- [x] Inline editor for time and ratio classification ranges
- [x] DB-driven — thresholds read at runtime, not hardcoded
- [x] Restore defaults with confirm step
- [x] Configurable low inventory warning (cups threshold 1–60, default 14) and dose avg window (shots 1–30, default 10) — both saved to `app_config` alongside threshold edits

### More → AI Coaching State
- [x] Manual editor for AI coach rolling context (experience level, patterns, bean notes)

### More → Yield Calculator
- [x] Dose stepper (0.1g steps, 1–30g range) with ±/+ buttons
- [x] Yields table for 6 standard ratios: Turbo Ristretto (1:1) · Ristretto (1:1.5) · Espresso (1:2) · Normale (1:2.5) · Long Pull (1:3) · Lungo (1:4) — presets defined once in `src/lib/shots/targetRatios.ts`, shared with the log form's Target Ratio picker and the recipe reference
- [x] Standard espresso range (1:1.5–1:2.5) highlighted with accent color and accent pill badge
- [x] Ratio label, yield in grams, and style description per row

### More → Data
- [x] Export Backup — `GET /api/export` downloads all user data as a timestamped JSON file

---

## Database Schema (11 tables)

| Table | Purpose |
|---|---|
| `roasters` | Roaster directory — name, alias, website, location, notes; bags link via nullable `roaster_id`, kept in sync with the denormalized `bags.roaster` text (set to `alias \|\| name`) on rename or alias change |
| `bags` | Bean inventory — roaster, name, roast level, processing method, freshness window, blend flag |
| `bag_origins` | Per-bean origin data (country, region); supports blends with multiple origins |
| `equipment_profiles` | Machine + grinder config, cleaning intervals, last-cleaned dates |
| `extraction_thresholds` | DB-driven time/ratio classification ranges |
| `shots` | Every espresso pull — dose, yield, time, grind, taste, rating, notes; `is_locked` flag for dialed-in parameters; pressure + temp stored as defaults |
| `drinks` | Drink built on a shot — milk, foam, hot water, detected name, rating, latte art rating |
| `coaching_state` | Single-row AI coach context — experience level, patterns, bean notes |
| `shot_analyses` | Cached AI analysis results per shot; `is_stable` marks when parameters are dialed in |
| `bag_analyses` | Cached AI dial-in analysis per bag |
| `coffee_faqs` | Static FAQ content |
| `app_config` | Single-row user preferences — low inventory warning threshold |

---

## Key Technical Decisions

- **Server Actions over API routes** — all mutations are `"use server"` functions returning `{ success } | { error }` typed unions
- **`useActionState` for form state** — pairs naturally with server actions; no client state management library
- **DB-driven classification** — `classifyTime()` / `classifyRatio()` read thresholds from DB at runtime with hardcoded fallback
- **`drizzle-kit push` locally only** — safe for local dev where data loss is acceptable. On production, `drizzle-kit push` drops and recreates tables (SQLite limitation), wiping all data. For production schema changes, use `ALTER TABLE ADD COLUMN` directly for simple additions; reserve full drizzle push for major structural changes with a prior backup + restore plan
- **Production schema change workflow** — (1) `yield-backup`, (2) `ALTER TABLE ADD COLUMN` via `yield-shell`, (3) `yield-deploy`. See shell aliases in `.zshrc`
- **Per-bag freshness windows** — `estimatePeakWindow(roastLevel, processingMethod, isDecaf)` covers 15 roast/process combinations; stored on the bag so the user can override
- **Hardcoded drink detection** — `detectDrink()` in `drinkDetection.ts` is a pure synchronous function; runs client-side for live preview and server-side on save
- **`lagG` field** — Breville Bambino has no 3-way solenoid valve; 6–8g drip-through after pump stop is normal; stop before target yield and record resting weight
- **`tasteBalance` single control** — 1=Very Sour · 4=Balanced · 7=Very Bitter. Individual taste columns (acidity, sweetness, bitterness, body, aroma) were removed from the schema; columns still exist in the DB as inert nullables
- **AI analysis caching** — results stored in `shot_analyses`; return visits never trigger an API call. Only *recent* shots (within 48h) update `coaching_state`
- **SVG server components for charts** — all stat charts and per-bag charts render server-side as inline SVG; no charting library
- **Extraction ratio ≠ extraction quality** — `yield_g / dose_g` is brew ratio (ristretto/normale/lungo style), not EY%. True extraction yield requires TDS measurement (refractometer). Charts label by rating instead of over/under extracted
- **Macro region mapping** — country → macro region (Latin America, East Africa, etc.) is a static JS lookup; not stored in DB
- **All "today" comparisons must resolve in `America/Chicago`, not server time** — Vercel runs UTC, so any `new Date()` used as a day-boundary in server-rendered code (e.g. `getDaysSinceRoast`) drifts a day early whenever UTC crosses midnight (as early as 7pm Chicago during CDT). Client components are unaffected (browser's local clock), but shared lib functions callable from server code must explicitly convert via `toLocaleDateString("en-CA", { timeZone: "America/Chicago" })` before diffing dates

---

## Deployment Checklist

- [x] Turso database created (prod: `cuplog`, dev: `cuplog-dev`)
- [x] `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` set in Vercel environment
- [x] `ANTHROPIC_API_KEY` set in Vercel environment
- [x] Schema applied via `npx drizzle-kit push` (local) or `ALTER TABLE ADD COLUMN` (prod)
- [x] Deployed to Vercel (`vercel --prod` or `yield-deploy` alias)

### Shell aliases (`.zshrc`)

| Alias | Command |
|---|---|
| `yield-start` | `cd` to the repo and start the local dev server |
| `yield-backup` | Dump prod DB to timestamped `.sql` file |
| `yield-shell` | Open Turso prod DB shell |
| `yield-deploy` | `vercel --prod` |
| `yield-counts` | Row counts for all main tables |
