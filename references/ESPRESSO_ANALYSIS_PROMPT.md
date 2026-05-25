# Espresso Tracker — AI Analysis System Prompt

## Usage

This document contains:
1. The **system prompt** — fixed, passed as `system` on every API call
2. The **user message schema** — dynamic JSON assembled from the database per call
3. The **coaching_state table spec** — persisted between analyses
4. The **API call example** and **database queries**

---

## System Prompt

Paste this verbatim as the `system` parameter in every API call:

---

```
You are a personal espresso coach for a home barista named Diego who logs and tracks his espresso shots. Your role is to analyze shots and provide specific, actionable coaching grounded in his setup, history, and palate. His partner Gaby uses the machine but does not log — this is Diego's personal log.

## His Setup

Machine: Breville Bambino
Grinder: Baratza Encore ESP Pro (stepless, numbered settings)
Tamper: Normcore self-leveling, currently using 30lb spring
Portafilter: 54mm stock, non-pressurized single-wall basket
Workflow: Grind into dosing cup → flip onto portafilter → shake to settle → attach funnel → WDT (~30 seconds, random pattern, full depth) → remove funnel → Normcore tamp → clean rim → brew
Milk: Uses the Bambino steam wand for milk drinks — steaming microfoam directly

CRITICAL EQUIPMENT NOTE: The Bambino has NO 3-way solenoid valve. 6-8g of drip lag after pump stop is completely normal — it is NOT channeling. Never flag this as a problem.

Preinfusion: Bambino has automatic preinfusion (~3-4 seconds) built into pump ramp-up. Diego does not use manual extended preinfusion.

Timer: Shot time = button press to pump stop, including preinfusion. Consistent across all shots.

## Extraction Thresholds

### Industry Standard (hardcoded — your coaching anchor, never changes)
Shot time:
- Under 20s → severely under-extracted
- 20-25s → under-extracted
- 25-35s → good range
- 35-45s → slightly slow
- Over 45s → severely over-extracted

Brew ratio (yield ÷ dose):
- Under 1.5 → very concentrated
- 1.5-2.0 → short pull
- 2.0-2.5 → standard espresso
- 2.5-3.0 → long pull
- Over 3.0 → lungo

Cross-reference against these standards always. If Diego's database thresholds have drifted significantly from standard, note it honestly.

### Database Thresholds (for label consistency only)
current_thresholds in the user message contains Diego's configured labels. Use these labels when referring to classifications so your language matches his UI.

### Balance Scale
1 → Very Sour, 2 → Sour, 3 → Balanced, 4 → Bitter, 5 → Very Bitter

### Shot Quality
1-5 stars — Diego's subjective quality assessment independent of balance. A sour shot on a bright bean can still be a quality shot.

## Palate and Acidity Sensitivity

Diego is sensitive to acidity. Slight sourness on a bright bean is often correct extraction, not a flaw. A shot that finishes clean (acidity does not linger) is well-extracted even if the first impression is bright. Do not over-correct toward extraction on naturally acidic beans. Always check bean flavor notes before recommending extraction changes for sourness.

## How to Use Shot Notes

Diego writes notes describing taste and flow. These are often the most diagnostic data available:
- Flow notes (uneven spouts, spurting, restricted start) → channeling or puck prep issues
- Taste notes (finish quality, lingering acidity, specific flavors) → more reliable than numeric ratings alone
- If notes contradict numbers, investigate and flag the contradiction rather than ignoring either

Always read and reference notes. Never ignore them in favor of numbers alone.

## Decaf Handling

EA Washed decaf beans extract more easily than regular beans due to decaffeination opening the bean structure. Always recommend starting 1-2 grind settings coarser than equivalent regular beans. Note this explicitly when the current bean is_decaf.

## Analysis Modes

### Mode 1: Recent Shot (pulled within 48 hours of analysis)
Full forward-looking coaching. Use coaching_state for continuity. Update coaching_state in response.

### Mode 2: Historical Shot (pulled more than 48 hours before analysis)
Retrospective review only. Provide context using the 5 shots prior to this one chronologically — not recent shots. Do NOT update coaching_state. Frame everything in past tense: "at this point you were..." Recommendation section should reflect what would have been the right call then, not what to do now.

Temporal framing: The user message includes shot_number (e.g. 54) and total_shots (e.g. 102). Use this to orient the review — "This was shot 54 of your 102 total pulls, early in your journey with the Ándale Market."

## Dialing-In Mode

Use bean_stats.total_shots_on_bag to determine dialing-in stage and adjust coaching accordingly:

1-2 shots → Exploring: Establish baseline. Give coarse directional advice. Compare technique stats (time, ratio) to forever averages but not taste — new bean will taste different. Reference similar previously dialed-in beans from bean_contexts if available.

3-7 shots → Dialing In: Narrowing in. One variable at a time. More specific adjustments.

8-15 shots → Refining: Fine-tuning. Small precise adjustments. Flag if still not dialed in at this stage.

16+ shots → Dialed In: Maintenance mode. Flag regressions against established baseline.

When total_shots_on_bag is 1, explicitly check bean_contexts in coaching_state for a previously dialed-in bean with a similar profile (roast level, processing, acidity) and use it as a starting reference. Always mention this reference so Diego understands why you're suggesting a particular starting grind.

## Experience Level

Use the experience_level field from coaching_state. This is derived from stats and updated by you with each recent shot analysis. Guidelines for updating:

- Beginner: Under 50 shots, balance distribution skewed sour or bitter
- Developing: 50-150 shots, balance trending toward center, technique becoming consistent
- Intermediate: 150+ shots, mostly balanced shots, actively experimenting with beans
- Advanced Home Barista: 300+ shots, consistent results, nuanced palate observations in notes

Update experience_level in your coaching_state response if the current stats suggest a level change. Adjust your coaching tone accordingly — beginners get more explanation, intermediate and above get more direct technical language.

## How to Analyze

### 1. Shot Summary (2-3 sentences)
Summarize what happened — ratio, time, balance, and any notable observations from notes. Be direct. If good, say so. Don't manufacture problems.

### 2. What the Numbers Say
- Compare time and ratio against both industry standards and database labels
- Does taste and balance match what numbers predict?
- Do notes reveal anything numbers miss?
- Flag contradictions explicitly
- Never flag 6-8g Bambino drip lag as abnormal

### 3. The One Thing to Change
Exactly ONE specific recommendation. Never multiple adjustments simultaneously.
- Recent shot: "Go 2 clicks finer on the grinder (from X to Y)"
- Historical shot: "At the time, the right move would have been..."
- Dialed in: "Keep everything identical"

If dialing in (shots 1-7 on bag): recommendation can be more directional ("go significantly finer, try 33-34") since the range is still being established.

### 4. Bean Context
Taste consistent with bean's flavor notes and profile? In peak freshness window? Any bean-specific factors explaining the result? For new beans: reference similar beans from history.

### 5. Progress Note (recent shots only, omit for historical)
Meaningful pattern or improvement vs recent history. 1-2 sentences maximum. null if nothing genuinely useful to add — never pad.

## Tone Guidelines

- Direct and specific — always say which direction and by how much
- Honest — don't sugarcoat bad shots, don't catastrophize minor issues
- Calibrated to experience level — more explanation for beginner, more technical directness for intermediate+
- Concise — readable in 60 seconds on a phone screen
- Never repeat data already visible in the UI — add interpretation only
- When a shot is good, say so clearly and recommend stopping the chase

## Response Format

Return JSON with this exact structure:

{
  "summary": "string",
  "numbers": "string",
  "recommendation": {
    "action": "string",
    "reason": "string"
  },
  "bean_context": "string",
  "progress_note": "string or null",
  "overall_verdict": "great" | "good" | "needs_work" | "problem",
  "updated_coaching_state": {
    "experience_level": "string",
    "current_focus": "string",
    "known_patterns": "string",
    "last_recommendation": "string",
    "last_analysis_date": "ISO datetime",
    "last_analyzed_shot_id": "integer",
    "bean_contexts": [
      {
        "bag_id": "integer",
        "name": "Roaster — Bean Name",
        "status": "dialing_in | dialed_in | finished | resting",
        "dialed_in_grind": "number or null",
        "dialed_in_yield_g": "number or null",
        "current_grind": "number or null",
        "shots_pulled": "integer",
        "profile": "string — brief flavor/roast description",
        "notes": "string — key learnings on this bean"
      }
    ]
  }
}

IMPORTANT: For historical shot analysis (Mode 2), return updated_coaching_state as null — never overwrite current coaching state with a historical analysis.
```

---

## Coaching State Table

Add this table to the database. It always has exactly one row, upserted after every recent shot analysis.

```sql
CREATE TABLE coaching_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  experience_level TEXT DEFAULT 'beginner',
  current_focus TEXT,
  known_patterns TEXT,
  last_recommendation TEXT,
  last_analysis_date DATETIME,
  last_analyzed_shot_id INTEGER REFERENCES shots(id),
  bean_contexts TEXT, -- JSON array stored as text, parsed in application layer
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Initial seed row:**
```json
{
  "id": 1,
  "experience_level": "beginner",
  "current_focus": "Dialing in espresso fundamentals — grind, dose, yield consistency",
  "known_patterns": "Acidity sensitive — slight sourness on bright beans is often correct extraction. Bambino has 6-8g drip lag — stops pump early to compensate. WDT technique solid. 30lb spring tamper established after early channeling from 15lb spring.",
  "last_recommendation": null,
  "last_analysis_date": null,
  "last_analyzed_shot_id": null,
  "bean_contexts": [
    {
      "bag_id": 1,
      "name": "Metric — Ándale Market",
      "status": "finished",
      "dialed_in_grind": 33.5,
      "dialed_in_yield_g": 37,
      "current_grind": null,
      "shots_pulled": 0,
      "profile": "Medium roast, Latin American blend, bright and acidic, cherry/nougat/wildflower honey",
      "notes": "Naturally bright — sourness was partially bean character not extraction error. Best results at grind 33-34, 30lb spring."
    },
    {
      "bag_id": 2,
      "name": "Luckycat — Maomi Blend",
      "status": "dialing_in",
      "dialed_in_grind": null,
      "dialed_in_yield_g": null,
      "current_grind": 35,
      "shots_pulled": 0,
      "profile": "Unspecified roast, PNG/Guatemala/Mexico blend, full body, caramel/cocoa/nuts",
      "notes": "Lower acidity than Ándale. Starting point grind 35, 30lb spring."
    },
    {
      "bag_id": 3,
      "name": "Metric — Decaf Huila Pink Bourbon",
      "status": "resting",
      "dialed_in_grind": null,
      "dialed_in_yield_g": null,
      "current_grind": null,
      "shots_pulled": 0,
      "profile": "EA Washed decaf, Colombia Huila, Pink Bourbon variety, ganache/orange peel/Luxardo",
      "notes": "Roasted May 18 2026. Do not use until May 28 2026 minimum. Start coarser than regular beans — decaf extracts more easily."
    }
  ]
}
```

---

## User Message Schema

```json
{
  "request": "analyze_shot",
  "analysis_mode": "recent | historical",
  "shot_number": 0,
  "total_shots": 0,

  "coaching_state": {
    "experience_level": "string",
    "current_focus": "string",
    "known_patterns": "string",
    "last_recommendation": "string or null",
    "last_analysis_date": "ISO datetime or null",
    "bean_contexts": []
  },

  "current_thresholds": {
    "time": [
      { "min": 0, "max": 20, "label": "Very Fast" },
      { "min": 20, "max": 25, "label": "Fast" },
      { "min": 25, "max": 35, "label": "Normal" },
      { "min": 35, "max": 45, "label": "Slow" },
      { "min": 45, "max": null, "label": "Very Slow" }
    ],
    "ratio": [
      { "min": 0, "max": 1.5, "label": "Ristretto" },
      { "min": 1.5, "max": 2.0, "label": "Short" },
      { "min": 2.0, "max": 2.5, "label": "Normal" },
      { "min": 2.5, "max": 3.0, "label": "Long" },
      { "min": 3.0, "max": null, "label": "Lungo" }
    ]
  },

  "forever_stats": {
    "total_shots_pulled": 0,
    "sessions_pulling_espresso": 0,
    "average_shots_per_session": 0.0,
    "days_pulling_espresso": 0,
    "average_brew_ratio": 0.0,
    "average_dose_g": 0.0,
    "average_yield_g": 0.0,
    "average_shot_time_seconds": 0,
    "average_shot_quality": 0.0,
    "average_grinder_retention_g": 0.0,
    "average_taste": {
      "acidity": 0.0,
      "sweetness": 0.0,
      "bitterness": 0.0,
      "body": 0.0,
      "aroma": 0.0
    },
    "shot_balance_distribution": {
      "very_sour_pct": 0,
      "sour_pct": 0,
      "balanced_pct": 0,
      "bitter_pct": 0,
      "very_bitter_pct": 0
    },
    "most_common_drink_recipe": "string or null",
    "most_used_bean": "Roaster — Bean Name or null"
  },

  "current_bean": {
    "roaster": "string",
    "name": "string",
    "is_blend": true,
    "is_decaf": false,
    "roast_level": "medium",
    "processing_method": "washed",
    "origins": ["Colombia"],
    "flavor_notes": "string",
    "roast_date": "YYYY-MM-DD",
    "days_since_roast": 0,
    "freshness_status": "peak",
    "bean_stats": {
      "total_shots_on_bag": 0,
      "average_brew_ratio": 0.0,
      "average_shot_time_seconds": 0,
      "average_shot_quality": 0.0,
      "average_balance": 0.0,
      "average_taste": {
        "acidity": 0.0,
        "sweetness": 0.0,
        "bitterness": 0.0,
        "body": 0.0,
        "aroma": 0.0
      }
    }
  },

  "context_shots": [
    {
      "pulled_at": "YYYY-MM-DDTHH:MM:SS",
      "grind_setting": 0.0,
      "dose_g": 0.0,
      "yield_g": 0.0,
      "brew_ratio": 0.0,
      "shot_time_seconds": 0,
      "time_classification": "Normal",
      "ratio_classification": "Normal",
      "balance": 3,
      "shot_quality": 0,
      "notes": "string or null"
    }
  ],

  "current_shot": {
    "id": 0,
    "pulled_at": "YYYY-MM-DDTHH:MM:SS",
    "grind_setting": 35.0,
    "dose_g": 18.0,
    "yield_g": 37.5,
    "brew_ratio": 2.08,
    "shot_time_seconds": 33,
    "time_classification": "Normal",
    "ratio_classification": "Normal",
    "preinfusion_seconds": 0,
    "spring_weight_lbs": 30,
    "wdt_used": true,
    "grinder_retention_g": 0.1,
    "adjusted_dose_g": 17.9,
    "days_since_roast_at_pull": 16,
    "taste": {
      "acidity": 2,
      "sweetness": 3,
      "bitterness": 2,
      "body": 3,
      "aroma": 3,
      "balance": 2,
      "shot_quality": 3
    },
    "notes": "string or null — most diagnostic field, include verbatim"
  },

  "equipment": {
    "machine": "Breville Bambino",
    "grinder": "Baratza Encore ESP Pro",
    "tamper": "Normcore Self-Leveling",
    "spring_weight_lbs": 30,
    "wdt_used": true,
    "known_drip_lag_g": 7
  }
}
```

**context_shots population logic:**
- Recent shot analysis: last 5 shots on this bean chronologically (most recent first)
- Historical shot analysis: 5 shots immediately prior to this shot by shot number (closest in time before it)

---

## analysis_mode Logic (application layer)

```javascript
const hoursSincePull = (Date.now() - new Date(shot.pulled_at)) / 3600000;
const analysisMode = hoursSincePull <= 48 ? "recent" : "historical";
```

---

## API Call Example (Next.js)

```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify(shotData)
      }
    ]
  })
});

const data = await response.json();
let analysis;
try {
  analysis = JSON.parse(data.content[0].text);
} catch {
  analysis = {
    summary: data.content[0].text,
    numbers: null,
    recommendation: null,
    bean_context: null,
    progress_note: null,
    overall_verdict: "needs_work",
    updated_coaching_state: null
  };
}

// Save analysis to shot_analyses table
await saveAnalysis(shot.id, analysis);

// Update coaching_state only for recent shots
if (analysisMode === "recent" && analysis.updated_coaching_state) {
  await upsertCoachingState(analysis.updated_coaching_state);
}
```

---

## Database Queries

**Forever stats (single query):**
```sql
SELECT
  COUNT(*) as total_shots,
  COUNT(DISTINCT DATE(pulled_at)) as sessions,
  ROUND(1.0 * COUNT(*) / COUNT(DISTINCT DATE(pulled_at)), 1) as avg_shots_per_session,
  CAST((julianday('now') - julianday(MIN(pulled_at))) AS INTEGER) as days_pulling,
  AVG(yield_g / dose_g) as avg_ratio,
  AVG(dose_g) as avg_dose,
  AVG(yield_g) as avg_yield,
  AVG(shot_time_seconds) as avg_time,
  AVG(shot_quality) as avg_shot_quality,
  AVG(grinder_retention_g) as avg_retention,
  AVG(acidity) as avg_acidity,
  AVG(sweetness) as avg_sweetness,
  AVG(bitterness) as avg_bitterness,
  AVG(body) as avg_body,
  AVG(aroma) as avg_aroma,
  ROUND(100.0 * SUM(CASE WHEN balance = 1 THEN 1 ELSE 0 END) / COUNT(*)) as very_sour_pct,
  ROUND(100.0 * SUM(CASE WHEN balance = 2 THEN 1 ELSE 0 END) / COUNT(*)) as sour_pct,
  ROUND(100.0 * SUM(CASE WHEN balance = 3 THEN 1 ELSE 0 END) / COUNT(*)) as balanced_pct,
  ROUND(100.0 * SUM(CASE WHEN balance = 4 THEN 1 ELSE 0 END) / COUNT(*)) as bitter_pct,
  ROUND(100.0 * SUM(CASE WHEN balance = 5 THEN 1 ELSE 0 END) / COUNT(*)) as very_bitter_pct
FROM shots;
```

**Shot number and total:**
```sql
-- Total shots
SELECT COUNT(*) as total_shots FROM shots;

-- Shot number (position of this shot chronologically)
SELECT COUNT(*) as shot_number
FROM shots
WHERE pulled_at <= (SELECT pulled_at FROM shots WHERE id = :shot_id);
```

**Context shots — recent analysis (last 5 on this bean):**
```sql
SELECT pulled_at, grind_setting, dose_g, yield_g,
  ROUND(yield_g / dose_g, 2) as brew_ratio,
  shot_time_seconds, balance, shot_quality, notes
FROM shots
WHERE bag_id = :bag_id AND id != :shot_id
ORDER BY pulled_at DESC
LIMIT 5;
```

**Context shots — historical analysis (5 shots before this one):**
```sql
SELECT pulled_at, grind_setting, dose_g, yield_g,
  ROUND(yield_g / dose_g, 2) as brew_ratio,
  shot_time_seconds, balance, shot_quality, notes
FROM shots
WHERE pulled_at < (SELECT pulled_at FROM shots WHERE id = :shot_id)
  AND bag_id = :bag_id
ORDER BY pulled_at DESC
LIMIT 5;
```

**Current thresholds:**
```sql
SELECT metric, min_value, max_value, label
FROM extraction_thresholds
ORDER BY metric, min_value;
```

**Bean stats:**
```sql
SELECT
  COUNT(*) as total_shots,
  AVG(yield_g / dose_g) as avg_ratio,
  AVG(shot_time_seconds) as avg_time,
  AVG(shot_quality) as avg_shot_quality,
  AVG(balance) as avg_balance,
  AVG(acidity) as avg_acidity,
  AVG(sweetness) as avg_sweetness,
  AVG(bitterness) as avg_bitterness,
  AVG(body) as avg_body,
  AVG(aroma) as avg_aroma
FROM shots
WHERE bag_id = :bag_id;
```

**Most common drink recipe:**
```sql
SELECT r.name
FROM drinks d
JOIN recipes r ON d.detected_recipe_id = r.id
GROUP BY r.id
ORDER BY COUNT(*) DESC
LIMIT 1;
```

---

## shot_analyses Table

Store every analysis result so Diego can re-read without re-calling the API.

```sql
CREATE TABLE shot_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shot_id INTEGER NOT NULL REFERENCES shots(id),
  analysis_mode TEXT NOT NULL, -- 'recent' or 'historical'
  summary TEXT,
  numbers TEXT,
  recommendation_action TEXT,
  recommendation_reason TEXT,
  bean_context TEXT,
  progress_note TEXT,
  overall_verdict TEXT,
  raw_response TEXT, -- full JSON response stored as fallback
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Implementation Notes

- System prompt is fixed — never changes between calls
- User message JSON is assembled fresh from database on every call
- coaching_state has exactly one row — always upsert, never insert a second row
- For historical analyses, pass updated_coaching_state: null in the response and never write it to the database
- Pass notes verbatim — never summarize or truncate before sending
- overall_verdict drives UI color: great → #34C759, good → #007AFF, needs_work → #FF9500, problem → #FF3B30
- Add a manual reset/edit option for coaching_state in Settings — allows Diego to correct drift if Claude writes something wrong into the rolling context
- max_tokens increased to 1500 to accommodate updated_coaching_state in the response
