# Espresso Tracker — Claude Code Build Instructions

A personal espresso shot logging and bean inventory app for home baristas. Tracks bean bags, espresso pulls, and finished drinks with automatic extraction classification and recipe detection.

---

## Project Overview

Build a full-stack web application that allows a user to:
- Manage a coffee bean bag inventory (single origins and blends, including decaf)
- Log espresso shot pulls with automatic ratio and extraction classification
- Log finished drinks with milk, additions, and auto recipe detection
- Browse and manage drink recipes
- Configure extraction thresholds and equipment profiles
- View shot history and bag details with auto-calculated days since roast

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Full-stack, free hosting on Vercel, excellent mobile browser support |
| Database | Turso (SQLite) | Free tier, persistent cloud SQLite, no server required |
| ORM | Drizzle ORM | Lightweight, TypeScript-native, works perfectly with Turso |
| Styling | Tailwind CSS | Utility-first, fast to build mobile-first layouts |
| Hosting | Vercel | Free for personal projects, auto-deploys from GitHub |
| Language | TypeScript | Type safety across frontend and backend |

**Deployment path:**
1. Develop locally
2. Push to GitHub
3. Connect GitHub repo to Vercel — auto-deploys on every push
4. Connect Turso database via environment variables
5. Access via yourappname.vercel.app on any device — iPhone, iPad, desktop

**PWA (Progressive Web App):**
Configure as a PWA so both Diego and Gaby can add it to their iPhone home screens. It will appear and behave like a native app with no browser chrome. Implement:
- `manifest.json` with app name, icons, theme color
- Service worker for offline support (at minimum cache the shell so the app loads without internet)
- `apple-mobile-web-app-capable` meta tags for iOS full-screen mode
- Theme color: `#F2F2F7` to match the iOS system gray background

---

## Design System

The app follows an iOS-native aesthetic inspired by CupLog, a clean Japanese coffee logging app. Every UI decision should reinforce this: minimal, warm, content-first. The reference screenshots show both light and dark themes — implement both.

### Color Tokens

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| Background | `#F0EEE9` | `#000000` | App background — warm cream / pure black |
| Card | `#FFFFFF` | `#1C1C1E` | Grouped field cards |
| Card Secondary | `#F0EEE9` | `#2C2C2E` | Secondary cards, search bar |
| Divider | `#E5E5EA` | `#38383A` | Hairline between fields within a card |
| Text Primary | `#000000` | `#FFFFFF` | Field labels, values, page titles |
| Text Secondary | `#8E8E93` | `#8E8E93` | Placeholders, section headers, hints |
| Accent | `#007AFF` | `#007AFF` | Save button, active tab, active states — iOS blue |
| Destructive | `#FF3B30` | `#FF3B30` | Cancel, delete, remove — always red, never blue |
| Warning | `#FF9500` | `#FF9500` | Freshness warnings, cleaning overdue |
| Success | `#34C759` | `#34C759` | Good extraction, peak freshness |
| Tab Bar Background | `#FFFFFF` | `#1C1C1E` | Bottom tab bar pill |
| Tab Active Background | `#E5E5EA` | `#3A3A3C` | Active tab pill highlight |

**Implementation:** Use CSS `prefers-color-scheme: dark` media query and Tailwind dark mode classes (`dark:`) throughout. Follow iOS system preference automatically — no manual toggle needed.

### Typography

- **Page title** — 34px, bold, left-aligned, `text-primary` — iOS large title style
- **Section headers** — 13px, uppercase, tracking-wide, `text-secondary`, 16px left margin, 8px bottom margin — sits above cards, not inside them
- **Field labels** — 17px, regular weight, `text-primary`
- **Field values / placeholders** — 17px, regular, right-aligned, `text-secondary`
- **Badges** — 12px, medium weight, rounded pill
- **Destructive text** — 17px, `#FF3B30`, used for delete/cancel actions

### Spacing

- App horizontal padding: 16px
- Card inner padding: 16px horizontal, 0 vertical (fields handle their own padding)
- Between section header and card: 8px
- Between sections: 24px
- Between fields within card: 1px divider only

### Components

**Page Header:**
Large bold left-aligned title, 34px, top padding 16px. Add button top right — dark rounded pill, white text, "Add" label. Sits below status bar, above search.

**Search Bar:**
Full-width rounded rectangle, `card-secondary` background, magnifying glass icon left, placeholder "Search..." in `text-secondary`. 44px tall, 16px horizontal margin. Positioned below page title, above filter tabs.

**Filter Tabs — Double Row:**
Two stacked segmented pill switchers when filtering + sorting are both needed:
- Row 1: Sort options (e.g. Date / Rating / Grind)
- Row 2: Filter options (e.g. All / Bags / Classification)
Both rows full width, `card-secondary` background pill, active segment white/dark pill with subtle shadow.

**Grouped Card:**
White / dark card background, 12px border radius, overflow hidden. Fields separated by 1px hairline dividers. No outer border. Subtle shadow light mode only: `0 1px 3px rgba(0,0,0,0.08)`.

**Field Row:**
Full width, 52px minimum height, 16px horizontal padding. Label left, value or control right. Vertically centered. Full row is tappable where interactive.

**Dropdown / Select Field:**
Label left, current value + chevron (›) right in `text-secondary`. Full row tappable. Opens native picker or custom bottom sheet.

**Date Field:**
Label left, date shown in rounded pill badge right — `#E5E5EA` / `#3A3A3C` dark background, primary text, 8px border radius, 8px horizontal padding.

**Taste Rating — Pill Button Group:**
Full width pill containing 5 equal segments. Unselected: `#E5E5EA` / `#2C2C2E` background. Selected: white / `#3A3A3C` background, subtle shadow. Numbers 1-5, 17px, centered. 52px tall. 12px outer border radius. This is the most distinctive UI element — replicate precisely from reference screenshots.

**Section Header:**
Small caps, 13px, `text-secondary`, 16px left margin, 8px bottom margin. Never inside a card.

**Save Button:**
Full width white/dark card, blue text `#007AFF`, 17px medium weight, centered, 52px tall, 12px border radius. Sticky bottom of viewport with safe area inset.

**Destructive Button:**
Same layout as save button but text is `#FF3B30`. Used for delete, remove, mark as empty. Always confirm before executing with a bottom sheet confirmation.

**Cancel Button (form header):**
Rounded pill, `#E5E5EA` / `#3A3A3C` background, primary text, 36px height, top left of form header.

**Bottom Tab Bar:**
Floating pill shape — not edge-to-edge. Centered horizontally, sits above home indicator with safe area padding. Background: white / dark gray, 24px border radius, subtle shadow. Active tab has a pill highlight background behind its icon + label. Active icon + label: `#007AFF`. Inactive: `#8E8E93`. 5 tabs: Bags, Pull Shot, Drinks, Recipes, Settings with appropriate icons.

**Classification Badges:**
Inline pill badges. Colors same in both modes:
- Very Fast / Very Slow: `#FF3B30` background, white text
- Fast / Slow: `#FF9500` background, white text
- Normal: `#34C759` background, white text
- Ristretto / Lungo: `#007AFF` background, white text
- Short / Long: `#8E8E93` background, white text

**Freshness Indicator:**
Colored dot + text alongside days since roast:
- Too fresh (0-6d): `#FF9500` dot — "Too fresh — wait"
- Peak (7-21d): `#34C759` dot — "Peak window"
- Good (22-35d): `#34C759` dot — "Still excellent"
- Aging (36-45d): `#FF9500` dot — "Use soon"
- Stale (46d+): `#FF3B30` dot — "Past peak"

### Mobile-First Layout Rules

- **Minimum tap target: 44x44px** — every interactive element
- **Bottom tab navigation** — floating pill style as shown in reference screenshots
- **No hover states as primary interactions** — touch only
- **Forms scroll naturally** — never trap in fixed-height inner scroll containers
- **Sticky save button** — always visible, never scroll to find
- **Numeric inputs** — use `inputmode="decimal"` or `inputmode="numeric"` for correct iOS keyboard
- **Date pickers** — native `<input type="date">` styled as pill badge
- **Avoid modals** — prefer full-screen sheets sliding up from bottom
- **Safe area insets** — `env(safe-area-inset-bottom)` on tab bar and sticky buttons
- **Font size minimum 16px on inputs** — prevents iOS auto-zoom on focus
- **Dark mode** — all components must have dark mode variants

### Form Layout Pattern

Every form follows this exact structure from reference screenshots:

```
[Header: Cancel pill left | Title centered | (no right action)]
[Segmented tab: Bags / Pull Shot / Drink]
─────────────────────────────────────────
[Scrollable content:]
  SECTION HEADER (small gray caps)
  [White grouped card]
    [Field row]          ← 52px, label left, value right
    [1px divider]
    [Field row]
    [1px divider]
    [Field row]

  SECTION HEADER
  [White grouped card]
    [Field row]
    ...

  TASTE RATING SECTION HEADER
  [White grouped card]
    Acidity    [1][2][3][4][5]  ← full-width pill group
    [divider]
    Sweetness  [1][2][3][4][5]
    [divider]
    Bitterness [1][2][3][4][5]
    [divider]
    Body       [1][2][3][4][5]
    [divider]
    Aroma      [1][2][3][4][5]

  NOTES
  [White card — tall, free text]
─────────────────────────────────────────
[Sticky: Save button — blue text]
```

### List Page Layout Pattern

```
[Large bold title left — 34px]
[Search bar — full width rounded]
[Filter tabs — pill segmented rows]
─────────────────────────────────────────
[Scrollable list:]
  [Card row — tappable]
  [Card row — tappable]
  ...
─────────────────────────────────────────
[Floating pill bottom tab bar]
```

---

## Database Schema

### 1. `bags`

Stores coffee bean bag inventory.

| Column | Type | Notes |
|---|---|---|
| id | primary key | |
| roaster | string | required — e.g. "Metric", "Luckycat" |
| name | string | required — e.g. "Ándale Market", "Maomi Blend" |
| is_blend | boolean | default false |
| is_decaf | boolean | default false |
| roast_level | string | enum: light, medium_light, medium, medium_dark, dark, unspecified |
| processing_method | string | enum: washed, natural, honey, anaerobic, ea_washed, swiss_water, other |
| roast_date | date | required |
| purchase_date | date | |
| purchase_shop | string | |
| price | decimal | price paid for the bag |
| weight_g | integer | bag weight in grams for reference only — not tracked |
| status | string | enum: active, finished, removed — default active |
| finished_date | date | set when status changes to finished |
| notes | text | free text |
| created_at | timestamp | |
| updated_at | timestamp | |

**Calculated fields (not stored, computed on read):**
- `days_since_roast` — today's date minus roast_date

---

### 2. `bag_origins`

Stores origin details for each bag. Single origin bags have one record. Blends have multiple.

| Column | Type | Notes |
|---|---|---|
| id | primary key | |
| bag_id | foreign key | references bags |
| country | string | required |
| region | string | optional |
| farm | string | optional |
| variety | string | optional — e.g. "Pink Bourbon", "Bourbon", "Typica" |
| blend_percentage | integer | optional — percentage of this origin in blend (0-100) |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### 3. `equipment_profiles`

Stores equipment configurations. Supports multiple profiles for future flexibility.

| Column | Type | Notes |
|---|---|---|
| id | primary key | |
| name | string | required — e.g. "Home Setup" |
| machine | string | e.g. "Breville Bambino" |
| grinder | string | e.g. "Baratza Encore ESP Pro" |
| tamper | string | e.g. "Normcore Self-Leveling" |
| default_spring_weight_lbs | integer | e.g. 30 |
| machine_last_cleaned_at | date | date machine was last cleaned |
| grinder_last_cleaned_at | date | date grinder was last cleaned |
| machine_cleaning_interval_days | integer | reminder interval in days — default 30 |
| grinder_cleaning_interval_days | integer | reminder interval in days — default 14 |
| is_active | boolean | default true — only one active at a time |
| notes | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### 4. `extraction_thresholds`

Configurable table defining extraction classification labels. Editable by the user via settings UI.

| Column | Type | Notes |
|---|---|---|
| id | primary key | |
| metric | string | enum: time, ratio |
| min_value | decimal | lower bound (inclusive) |
| max_value | decimal | upper bound (exclusive) — null means no upper bound |
| label | string | display label e.g. "Very Fast", "Normal", "Lungo" |
| description | string | optional explanation shown in UI |
| sort_order | integer | display order |
| created_at | timestamp | |
| updated_at | timestamp | |

**Seed data for extraction thresholds:**

Time thresholds (seconds):

| Min | Max | Label | Description |
|---|---|---|---|
| 0 | 20 | Very Fast | Severely under-extracted — grind much finer |
| 20 | 25 | Fast | Under-extracted — grind finer |
| 25 | 35 | Normal | Good extraction range |
| 35 | 45 | Slow | Slightly over-extracted — grind coarser |
| 45 | null | Very Slow | Severely over-extracted — grind much coarser |

Ratio thresholds (yield g ÷ dose g):

| Min | Max | Label | Description |
|---|---|---|---|
| 0 | 1.5 | Ristretto | Very concentrated, short pull |
| 1.5 | 2.0 | Short | Slightly under target ratio |
| 2.0 | 2.5 | Normal | Standard espresso ratio |
| 2.5 | 3.0 | Long | Extended pull, less concentrated |
| 3.0 | null | Lungo | Very long pull, highly diluted |

---

### 5. `shots`

Stores individual espresso pull logs.

| Column | Type | Notes |
|---|---|---|
| id | primary key | |
| bag_id | foreign key | references bags — required |
| equipment_profile_id | foreign key | references equipment_profiles |
| pulled_at | datetime | required — date and time of pull |
| grind_setting | decimal | e.g. 33.5 |
| dose_g | decimal | grams of coffee dosed — required |
| yield_g | decimal | final resting yield in grams after drip lag — required |
| shot_time_seconds | integer | button press to pump stop — required |
| preinfusion_seconds | integer | manual preinfusion duration if used |
| spring_weight_lbs | integer | tamper spring used — defaults from equipment profile |
| wdt_used | boolean | default false |
| grinder_retention_g | decimal | beans weighed before grinding minus grounds in portafilter |
| adjusted_dose_g | decimal | actual dose after retention — dose_g minus grinder_retention_g |
| acidity | integer | 1-5 rating |
| sweetness | integer | 1-5 rating |
| bitterness | integer | 1-5 rating |
| body | integer | 1-5 rating |
| aroma | integer | 1-5 rating |
| notes | text | free text |
| created_at | timestamp | |
| updated_at | timestamp | |

**Calculated fields (not stored, computed on read):**
- `brew_ratio` — yield_g ÷ dose_g, displayed as "1:X" rounded to 2 decimal places
- `ratio_classification` — looked up from extraction_thresholds by brew_ratio value
- `time_classification` — looked up from extraction_thresholds by shot_time_seconds value
- `days_since_roast_at_pull` — pulled_at date minus bag roast_date
- `average_retention_g` — mean of grinder_retention_g across last 10 shots on the same equipment profile — shown as a hint on the shot form

---

### 6. `additions`

Predefined list of drink additions selectable when logging a drink.

| Column | Type | Notes |
|---|---|---|
| id | primary key | |
| name | string | required — e.g. "Vanilla Syrup", "Chai", "Cinnamon" |
| category | string | enum: syrup, spice, supplement, flavor, other |
| is_active | boolean | default true |
| created_at | timestamp | |
| updated_at | timestamp | |

**Seed data for additions:**

Syrups: Vanilla Syrup, Caramel Syrup, Hazelnut Syrup, Brown Sugar Syrup, Lavender Syrup

Spices: Cinnamon, Nutmeg, Cardamom, Cocoa Powder

Supplements: Collagen, Protein Powder, Ashwagandha

Flavors: Chai Concentrate, Matcha, Pumpkin Spice, Peppermint

---

### 7. `drinks`

Stores finished drink logs linked to a shot.

| Column | Type | Notes |
|---|---|---|
| id | primary key | |
| shot_id | foreign key | references shots — required |
| milk_type | string | enum: whole, oat, almond, soy, coconut, skim, half_and_half, none |
| milk_quantity_ml | integer | |
| milk_temperature | string | enum: hot, cold, iced, room_temperature |
| detected_recipe_id | foreign key | references recipes — nullable, auto-detected |
| overall_rating | integer | 1-5 |
| notes | text | free text |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### 8. `drink_additions`

Join table linking drinks to their additions (many to many).

| Column | Type | Notes |
|---|---|---|
| id | primary key | |
| drink_id | foreign key | references drinks |
| addition_id | foreign key | references additions |
| quantity | string | optional free text e.g. "2 pumps", "1 tsp" |
| created_at | timestamp | |

---

### 9. `recipes`

Stores drink recipe definitions.

| Column | Type | Notes |
|---|---|---|
| id | primary key | |
| name | string | required — e.g. "Flat White", "Cappuccino", "Latte" |
| description | text | optional — preparation notes |
| is_active | boolean | default true |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### 10. `recipe_components`

Stores up to 10 components per recipe.

| Column | Type | Notes |
|---|---|---|
| id | primary key | |
| recipe_id | foreign key | references recipes |
| name | string | required — e.g. "Espresso", "Steamed Milk", "Milk Foam" |
| quantity | decimal | numeric amount |
| unit | string | enum: ml, g, shots, pumps, tsp, tbsp |
| sort_order | integer | display order within recipe |
| created_at | timestamp | |
| updated_at | timestamp | |

**Validation:** maximum 10 recipe_components per recipe enforced at model level.

**Seed data for recipes:**

Espresso — 1 shot espresso (30ml)

Doppio — 2 shots espresso (60ml)

Americano — 1 shot espresso, hot water 120ml

Flat White — 1 shot espresso, steamed milk 120ml, milk foam 10ml

Latte — 1 shot espresso, steamed milk 240ml, milk foam 10ml

Cappuccino — 1 shot espresso, steamed milk 60ml, milk foam 60ml

Cortado — 1 shot espresso, steamed milk 30ml

Macchiato — 1 shot espresso, milk foam 15ml

Iced Latte — 1 shot espresso, cold milk 240ml, ice

---

## Business Logic

### Brew Ratio Calculation

```
brew_ratio = yield_g / dose_g
display_ratio = "1:" + brew_ratio.round(2)
```

Always calculate from final resting yield — not the weight at pump stop.

### Extraction Classification

On shot save and display, look up both `shot_time_seconds` and `brew_ratio` against `extraction_thresholds` table:

```
time_classification = extraction_thresholds
  .where(metric: 'time')
  .find { |t| shot_time_seconds >= t.min_value && (t.max_value.nil? || shot_time_seconds < t.max_value) }
  .label

ratio_classification = extraction_thresholds
  .where(metric: 'ratio')
  .find { |t| brew_ratio >= t.min_value && (t.max_value.nil? || brew_ratio < t.max_value) }
  .label
```

Display both classifications prominently on shot detail and shot list views.

### Days Since Roast

On bag detail view:
```
days_since_roast = Date.today - bag.roast_date
```

On shot detail view:
```
days_since_roast_at_pull = shot.pulled_at.to_date - shot.bag.roast_date
```

Display as integer days. Show a freshness indicator alongside:
- 0-6 days: "Too fresh — wait before pulling"
- 7-21 days: "Peak — ideal window"
- 22-35 days: "Good — still excellent"
- 36-45 days: "Aging — use soon"
- 46+ days: "Stale — past peak"

### Duplicate Bag Detection

When a new bag is saved, check for existing active or finished bags with the same roaster + name (case insensitive):

```
existing = Bag.where(status: ['active', 'finished'])
              .where("lower(roaster) = ? AND lower(name) = ?", 
                     roaster.downcase, name.downcase)
```

If match found, present user with modal:
- **"Replace"** — marks existing bag status as `finished`, sets `finished_date` to today, saves new bag as active
- **"Add as new"** — saves new bag alongside existing, both visible, user selects active bag per shot
- **"Cancel"** — returns to form without saving

### Recipe Detection

When a drink is saved, attempt to match against all active recipes:

1. Get the drink's milk_type, milk_quantity_ml, and addition names
2. For each active recipe, compare its components against the drink
3. A match requires:
   - Espresso component present (always true since drink is linked to a shot)
   - Milk type matches any milk component in recipe (if recipe has milk)
   - Milk quantity within ±30ml tolerance of recipe milk component quantity
   - No required recipe components missing from drink
4. If exactly one recipe matches — auto-set `detected_recipe_id`
5. If multiple recipes match — present options to user to confirm
6. If no match — leave `detected_recipe_id` null, no recipe shown

Display detected recipe name as a badge on the drink log entry. User can manually override.

### Bag Status Transitions

```
active → finished   (user marks bag empty)
active → removed    (user removes from view)
finished → removed  (user archives finished bag)
```

Never hard delete bags or origins. All shots, drinks linked to removed bags remain intact and visible in history with bag name shown as "[Archived] Roaster — Name".

---

## Seed Data — Current Bags

Pre-load the following three bags on first run:

### Bag 1: Ándale Market

```
roaster: "Metric"
name: "Ándale Market"
is_blend: true
is_decaf: false
roast_level: "medium"
processing_method: "unspecified"
roast_date: 2026-04-27
purchase_shop: "Metric Coffee Chicago"
status: "active"
notes: "Cherry, Nougat, Wildflower Honey. Bright, acidic Latin American blend. 
        Coordinates on bag: 41°53'12"N 87°40'39"W — Metric roastery location."
```

Origins:
```
{ country: "Mexico", region: nil, farm: nil, variety: nil, blend_percentage: nil }
{ country: "Guatemala", region: nil, farm: nil, variety: nil, blend_percentage: nil }
```

### Bag 2: Maomi Blend

```
roaster: "Luckycat"
name: "Maomi Blend"
is_blend: true
is_decaf: false
roast_level: "unspecified"
processing_method: "unspecified"
roast_date: 2026-05-04
purchase_shop: "Luckycat Coffee"
status: "active"
notes: "Caramel, Cocoa, Nuts. Full-bodied, low acidity blend. 
        Good milk drink bean."
```

Origins:
```
{ country: "Papua New Guinea", region: nil, farm: nil, variety: nil, blend_percentage: nil }
{ country: "Guatemala", region: nil, farm: nil, variety: nil, blend_percentage: nil }
{ country: "Mexico", region: nil, farm: nil, variety: nil, blend_percentage: nil }
```

### Bag 3: Decaf Huila Pink Bourbon

```
roaster: "Metric"
name: "Decaf Huila Pink Bourbon"
is_blend: false
is_decaf: true
roast_level: "unspecified"
processing_method: "ea_washed"
roast_date: 2026-05-18
purchase_shop: "Metric Coffee Chicago"
status: "active"
notes: "Luxardo, Ganache, Orange Peel. EA Washed (sugarcane ethyl acetate) 
        decaf process. Pink Bourbon variety. High elevation 1700-1900 MASL. 
        Do not use until May 25 2026 — too fresh."
```

Origins:
```
{ country: "Colombia", region: "Huila", farm: nil, variety: "Pink Bourbon", blend_percentage: nil }
```

### Equipment Profile — Default

```
name: "Home Setup"
machine: "Breville Bambino"
grinder: "Baratza Encore ESP Pro"
tamper: "Normcore Self-Leveling"
default_spring_weight_lbs: 30
machine_cleaning_interval_days: 30
grinder_cleaning_interval_days: 14
is_active: true
notes: "No 3-way solenoid valve — expect 6-8g drip lag after pump stop. 
        Always stop pump before target yield to account for lag. 
        10 min warmup + blank flush before pulling shots."
```

---

## UI Requirements

### Navigation

Five main sections:
1. **Bags** — bean inventory
2. **Pull Shot** — log a new shot
3. **Drinks** — log a finished drink
4. **Recipes** — browse and manage recipes
5. **Settings** — equipment profiles, extraction thresholds, additions list

---

### Bags Section

**Bag list view:**
- Show all active bags by default
- Toggle to show finished bags
- Each bag card shows: roaster, name, roast level, days since roast with freshness indicator, is_decaf badge, is_blend badge, origin countries, status
- Actions: View detail, Mark as empty, Remove, Add new bag of same coffee

**Bag detail view:**
- All bag fields
- Origins listed (multiple for blends)
- Days since roast — calculated live, with freshness indicator
- Shot history linked to this bag — count and link to filtered shot list
- Average taste ratings across all shots from this bag
- Average grinder retention across all shots from this bag

**Add bag form:**
- All bag fields
- Dynamic origins section — starts with one origin row, add up to 10 for blends
- On save: run duplicate detection logic, present modal if match found

---

### Pull Shot Section

**New shot form:**
- Bag selector — dropdown of active bags, shows roaster + name + days since roast
- Equipment profile selector — defaults to active profile
- Date/time — defaults to now, editable
- Grind setting — decimal number input
- Dose (g) — decimal, required
- Yield (g) — decimal, required — label: "Final resting yield after drip stops"
- Shot time (seconds) — integer, required — label: "Button press to pump stop"
- Preinfusion (seconds) — integer, optional
- Spring weight (lbs) — integer, defaults from equipment profile
- WDT used — toggle yes/no
- Grinder retention (g) — decimal, optional — tooltip: "Weigh beans before grinding, then weigh grounds in portafilter — difference is retention"
- Show hint below retention field: "Average retention last 10 shots: Xg" — calculated live from shot history on active equipment profile
- Adjusted dose — auto-calculated and displayed: dose_g minus grinder_retention_g
- Taste ratings — five sliders or button groups 1-5: Acidity, Sweetness, Bitterness, Body, Aroma
- Notes — free text

**On submit — display immediately:**
- Brew ratio: "1:X"
- Ratio classification badge (e.g. "Normal", "Long")
- Time classification badge (e.g. "Fast", "Normal")
- Days since roast at pull
- Freshness indicator

**Shot list view:**
- Chronological, newest first
- Each row shows: date, bag name, grind, dose, yield, ratio, time, time classification badge, ratio classification badge, overall taste summary
- Filter by bag, date range, classification
- Click to view shot detail

---

### Drinks Section

**New drink form:**
- Shot selector — shows recent shots, displays bag name + pull date + ratio classification
- Milk type — dropdown from enum
- Milk quantity (ml) — integer
- Milk temperature — hot / cold / iced / room temperature
- Additions — multi-select from additions list, each with optional quantity text
- Overall rating — 1-5
- Notes — free text
- On save: run recipe detection, show detected recipe badge or prompt if multiple match

**Drink list view:**
- Chronological, newest first
- Each row: date, linked shot bag name, milk type + quantity, additions, detected recipe badge, overall rating
- Click to view detail

---

### Recipes Section

**Recipe list view:**
- Cards for each recipe showing name, description, component count
- Click to view/edit

**Recipe detail view:**
- Name, description
- Components listed in sort order with quantity and unit
- Shots that matched this recipe — count and link

**Add/edit recipe form:**
- Name, description
- Dynamic component rows — add up to 10
- Each component: name, quantity, unit, sort order
- Validation: maximum 10 components

---

### Settings Section

**Equipment profiles:**
- List profiles, mark one as active
- Add/edit/deactivate profiles
- Fields: name, machine, grinder, tamper, default spring weight, cleaning intervals, notes
- Show days since last cleaning for machine and grinder on each profile card
- Warning badge when overdue: "Machine cleaning overdue — X days" / "Grinder cleaning overdue — X days"
- "Mark machine cleaned today" and "Mark grinder cleaned today" quick action buttons directly on profile card — no need to open edit form
- Show cleaning status warning in Settings section header if either is overdue
- Show average grinder retention across all shots on this profile

**Extraction thresholds:**
- Editable table for time thresholds
- Editable table for ratio thresholds
- Restore defaults button — resets to seed data values

**Additions list:**
- List all additions by category
- Add new addition
- Deactivate additions (soft delete — never hard delete if used in drinks)

---

## Validation Rules

### Bags
- Roaster and name required
- Roast date required and must not be in the future
- At least one origin required
- Status must be active, finished, or removed
- Maximum 10 origins per bag

### Shots
- Bag required and must be active or finished (not removed)
- Dose must be between 5g and 30g
- Yield must be between 10g and 100g
- Yield must be greater than dose
- Shot time must be between 5 and 120 seconds
- Pulled_at must not be in the future
- Grinder retention must be between 0g and 5g if provided
- Adjusted dose must be greater than 0 if retention provided
- Taste ratings 1-5 if provided

### Drinks
- Shot required
- Overall rating 1-5 if provided
- Maximum 10 additions per drink

### Recipes
- Name required and unique
- Maximum 10 components per recipe

### Equipment Profiles
- Only one profile may have is_active = true at a time
- Deactivating the only active profile should warn the user

---

## Implementation Order

Build in this order to allow testing at each stage:

1. Project setup — Next.js 14, TypeScript, Tailwind CSS, Turso + Drizzle ORM, Vercel deployment pipeline
2. PWA configuration — manifest.json, service worker, iOS meta tags, home screen icon
3. Design system — global CSS tokens, Card component, FieldRow component, PillRating component, ClassificationBadge component, BottomTabBar component, StickyButton component
4. Database schema and migrations — all 10 tables
5. Seed data — extraction thresholds, additions, recipes, equipment profile, three bags
6. Bags CRUD — list, detail, add, edit, mark finished, remove, duplicate detection
7. Shots CRUD — list, detail, add with auto-calculations displayed on save
8. Drinks CRUD — list, detail, add with recipe detection
9. Recipes CRUD — list, detail, add, edit
10. Settings — equipment profiles with cleaning tracking, extraction thresholds editor, additions manager
11. Shot history and averages on bag detail view
12. Filtering and search across shots and bags
13. Polish — animations on tab switcher, badge colors, freshness indicators, safe area insets

---

## Notes for Implementation

- The Bambino has no 3-way solenoid valve. Drip lag of 6-8g after pump stop is expected and normal. The yield field always captures final resting weight, not pump stop weight. Document this in UI tooltips.
- Days since roast is always calculated live from roast_date — never stored.
- Brew ratio, extraction classifications, average retention, and days since cleaning are always calculated on read — never stored. If thresholds change in settings, all historical shots reflect the new classifications immediately.
- Bags marked as removed still appear in shot history with "[Archived]" prefix on their name.
- Cleaning overdue warnings should be visible but not blocking — never prevent the user from logging a shot.
- The app is used by two people (Diego and Gaby) but there is no user authentication required for now — single shared instance.
