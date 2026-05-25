# Espresso Tracker — Shot Seed Data

Extracted from Diego's conversation log. Use this to pre-populate the shots table so the app launches with real historical data.

---

## Equipment Profile (all shots)

```json
{
  "machine": "Breville Bambino",
  "grinder": "Baratza Encore ESP Pro",
  "tamper": "Normcore Self-Leveling",
  "spring_weight_lbs": 15
}
```

Note: Spring changed to 30lb partway through. See individual shots for spring weight used.

---

## Bags Referenced

| bag_id | Roaster | Name | Roast Date | Status |
|---|---|---|---|---|
| 1 | Metric | Ándale Market | 2026-04-27 | Active (finishing) |
| 2 | Luckycat | Maomi Blend | 2026-05-04 | Active |
| 3 | Metric | Decaf Huila Pink Bourbon | 2026-05-18 | Resting |

---

## Shots

All shots pulled in May 2026. Exact dates approximate where not stated — use pulled_at dates below as best estimates based on conversation timeline.

---

### Shot 1
```json
{
  "bag_id": 1,
  "pulled_at": "2026-05-07T08:00:00",
  "grind_setting": 37.0,
  "dose_g": 18.0,
  "yield_g": 36.0,
  "shot_time_seconds": 36,
  "spring_weight_lbs": 15,
  "wdt_used": false,
  "preinfusion_seconds": 10,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 4,
  "sweetness": 2,
  "bitterness": 1,
  "body": 2,
  "aroma": 2,
  "balance": 2,
  "shot_quality": 1,
  "notes": "Sour. Early shot, still learning workflow. Using 15lb spring, no WDT yet. Extended manual preinfusion ~10 seconds."
}
```

---

### Shot 2
```json
{
  "bag_id": 1,
  "pulled_at": "2026-05-08T08:00:00",
  "grind_setting": 36.5,
  "dose_g": 18.0,
  "yield_g": 38.0,
  "shot_time_seconds": 25,
  "spring_weight_lbs": 15,
  "wdt_used": false,
  "preinfusion_seconds": 10,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 4,
  "sweetness": 2,
  "bitterness": 1,
  "body": 2,
  "aroma": 2,
  "balance": 2,
  "shot_quality": 1,
  "notes": "Still sour. Flow all over the place, more on one spout than the other. Stopped machine at ~30g, significant drip lag to 38g."
}
```

---

### Shot 3
```json
{
  "bag_id": 1,
  "pulled_at": "2026-05-09T08:00:00",
  "grind_setting": 34.5,
  "dose_g": 18.1,
  "yield_g": 43.3,
  "shot_time_seconds": 43,
  "spring_weight_lbs": 15,
  "wdt_used": true,
  "preinfusion_seconds": 10,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 4,
  "sweetness": 2,
  "bitterness": 2,
  "body": 2,
  "aroma": 2,
  "balance": 2,
  "shot_quality": 1,
  "notes": "Went finer to address sourness. Flow restricted at first, just dripping. Over-extracted. Still sour. WDT introduced this session. Extended preinfusion still in use."
}
```

---

### Shot 4
```json
{
  "bag_id": 1,
  "pulled_at": "2026-05-10T08:00:00",
  "grind_setting": 35.5,
  "dose_g": 18.0,
  "yield_g": 37.5,
  "shot_time_seconds": 35,
  "spring_weight_lbs": 30,
  "wdt_used": true,
  "preinfusion_seconds": 0,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 3,
  "sweetness": 3,
  "bitterness": 2,
  "body": 2,
  "aroma": 3,
  "balance": 2,
  "shot_quality": 2,
  "notes": "Switched to 30lb spring. No manual preinfusion. Flow even from both spouts. Slightly sour but noticeably more balanced than previous shots. Best shot so far."
}
```

---

### Shot 5
```json
{
  "bag_id": 1,
  "pulled_at": "2026-05-11T08:00:00",
  "grind_setting": 34.5,
  "dose_g": 18.1,
  "yield_g": 39.6,
  "shot_time_seconds": 31,
  "spring_weight_lbs": 30,
  "wdt_used": true,
  "preinfusion_seconds": 0,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 3,
  "sweetness": 3,
  "bitterness": 2,
  "body": 3,
  "aroma": 3,
  "balance": 2,
  "shot_quality": 3,
  "notes": "Slightly sour but really good with milk. Both spouts but concentrated in one for a while mid-shot. Puck intact. Getting closer."
}
```

---

### Shot 6
```json
{
  "bag_id": 1,
  "pulled_at": "2026-05-12T08:00:00",
  "grind_setting": 33.0,
  "dose_g": 18.1,
  "yield_g": 39.6,
  "shot_time_seconds": 31,
  "spring_weight_lbs": 30,
  "wdt_used": true,
  "preinfusion_seconds": 0,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 3,
  "sweetness": 3,
  "bitterness": 2,
  "body": 3,
  "aroma": 3,
  "balance": 2,
  "shot_quality": 3,
  "notes": "Slightly sour, less than other shots. Came through both spouts but not the whole time — concentrated in one for a while. Really good with milk. Possibly best shot yet on this bean."
}
```

---

### Shot 7
```json
{
  "bag_id": 1,
  "pulled_at": "2026-05-13T08:00:00",
  "grind_setting": 34.0,
  "dose_g": 18.1,
  "yield_g": 38.0,
  "shot_time_seconds": 23,
  "spring_weight_lbs": 30,
  "wdt_used": true,
  "preinfusion_seconds": 0,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 4,
  "sweetness": 2,
  "bitterness": 1,
  "body": 2,
  "aroma": 2,
  "balance": 2,
  "shot_quality": 2,
  "notes": "Sour. Fast shot at 23 seconds. Stopped at ~30g. Bean getting older at 16 days — may need finer grind as it ages."
}
```

---

### Shot 8 — Gaby's single shot for affogato
```json
{
  "bag_id": 1,
  "pulled_at": "2026-05-14T15:00:00",
  "grind_setting": 39.5,
  "dose_g": 9.0,
  "yield_g": 40.0,
  "shot_time_seconds": null,
  "spring_weight_lbs": 30,
  "wdt_used": false,
  "preinfusion_seconds": 0,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 2,
  "sweetness": 3,
  "bitterness": 3,
  "body": 2,
  "aroma": 2,
  "balance": 3,
  "shot_quality": 3,
  "notes": "Gaby's shot. Single 9g dose for affogato. Much more balanced — likely due to very long ratio (1:4.4) diluting acidity. Coarse grind 39.5."
}
```

---

### Shot 9 — Diego single shot test
```json
{
  "bag_id": 1,
  "pulled_at": "2026-05-14T15:30:00",
  "grind_setting": null,
  "dose_g": 8.0,
  "yield_g": 21.0,
  "shot_time_seconds": 16,
  "spring_weight_lbs": 30,
  "wdt_used": true,
  "preinfusion_seconds": 0,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 2,
  "sweetness": 2,
  "bitterness": 4,
  "body": 2,
  "aroma": 2,
  "balance": 4,
  "shot_quality": 2,
  "notes": "8g single shot test for affogato. 21g in 16 seconds — very fast, slightly bitter. Small dose + no 3-way solenoid made drip lag proportionally huge. Difficult on the Bambino."
}
```

---

### Shot 10 — Ándale overextraction test
```json
{
  "bag_id": 1,
  "pulled_at": "2026-05-15T08:00:00",
  "grind_setting": 31.5,
  "dose_g": 18.0,
  "yield_g": null,
  "shot_time_seconds": null,
  "spring_weight_lbs": 30,
  "wdt_used": true,
  "preinfusion_seconds": 0,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 2,
  "sweetness": 2,
  "bitterness": 4,
  "body": 3,
  "aroma": 2,
  "balance": 4,
  "shot_quality": 2,
  "notes": "Went very fine (31-32 range) to test limits. Over-extracted and slightly bitter. Flow uneven. Useful to identify the over-extraction end of the spectrum on this bean."
}
```

---

### Shot 11 — First Maomi shot
```json
{
  "bag_id": 2,
  "pulled_at": "2026-05-16T08:00:00",
  "grind_setting": 34.0,
  "dose_g": 18.0,
  "yield_g": null,
  "shot_time_seconds": null,
  "spring_weight_lbs": 30,
  "wdt_used": true,
  "preinfusion_seconds": 0,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 2,
  "sweetness": 3,
  "bitterness": 4,
  "body": 3,
  "aroma": 3,
  "balance": 4,
  "shot_quality": 2,
  "notes": "First shot on Maomi. Purged ~20g first to clear Ándale from burrs. Slightly bitter but not too bad. Did not log scale — no yield or time recorded."
}
```

---

### Shot 12 — Maomi dialing in
```json
{
  "bag_id": 2,
  "pulled_at": "2026-05-16T08:30:00",
  "grind_setting": 35.0,
  "dose_g": 18.0,
  "yield_g": null,
  "shot_time_seconds": 40,
  "spring_weight_lbs": 30,
  "wdt_used": true,
  "preinfusion_seconds": 10,
  "grinder_retention_g": null,
  "adjusted_dose_g": null,
  "acidity": 4,
  "sweetness": 2,
  "bitterness": 2,
  "body": 2,
  "aroma": 2,
  "balance": 2,
  "shot_quality": 1,
  "notes": "Went coarser to 35. Accidentally used 10 second manual preinfusion — old habit. Over-extracted at 40 seconds. Flow restricted. Sour. Identified preinfusion as ongoing variable causing inconsistency."
}
```

---

### Shot 13 — Maomi best shot
```json
{
  "bag_id": 2,
  "pulled_at": "2026-05-16T09:00:00",
  "grind_setting": 35.0,
  "dose_g": 18.1,
  "yield_g": 37.4,
  "shot_time_seconds": 33,
  "spring_weight_lbs": 30,
  "wdt_used": true,
  "preinfusion_seconds": 0,
  "grinder_retention_g": 0.1,
  "adjusted_dose_g": 18.0,
  "acidity": 3,
  "sweetness": 3,
  "bitterness": 2,
  "body": 3,
  "aroma": 3,
  "balance": 2,
  "shot_quality": 3,
  "notes": "Best shot yet. No manual preinfusion. Flow came out more on right spout then started on left halfway through — mild channeling. Acid taste that does not linger much. Really good with milk. Grinder retention 0.1g."
}
```

---

## Summary Stats

| Metric | Value |
|---|---|
| Total shots logged | 13 |
| Bags used | 2 (Ándale Market, Maomi Blend) |
| Date range | ~May 7-16, 2026 |
| Spring used | 15lb shots 1-3, 30lb shots 4-13 |
| WDT introduced | Shot 3 onward |
| Manual preinfusion eliminated | Shot 4 onward (except shot 12 accidentally) |
| Best shots | 5, 6, 13 |
| Balance distribution | Mostly sour (2), one balanced (3 on shot 13), one bitter (4 on shots 9, 10) |

---

## Seed Notes for Claude Code

- Shots 1-10 use bag_id 1 (Ándale Market)
- Shots 11-13 use bag_id 2 (Maomi Blend)
- Bag 3 (Decaf) has zero shots — still resting
- Where yield_g or shot_time_seconds is null, insert NULL in the database — do not estimate
- pulled_at dates are approximate — use the dates provided, they are close enough for coaching context
- Shot 8 was pulled by Gaby — still worth logging for completeness
- Grinder retention only tracked from shot 13 onward — null for all prior shots
- Shot quality ratings are Diego's estimated retrospective assessment — he did not rate these in real time
