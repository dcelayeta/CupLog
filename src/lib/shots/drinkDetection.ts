export type EspressoBase = "Ristretto" | "Espresso" | "Doppio" | "Lungo" | null;

export const ALL_DRINK_NAMES = [
  "Ristretto",
  "Espresso",
  "Doppio",
  "Lungo",
  "Americano",
  "Macchiato",
  "Cortado",
  "Flat White",
  "Cappuccino",
  "Latte",
  "Mocha",
  "Affogato",
  "Dirty Chai",
] as const;

export type DrinkName = (typeof ALL_DRINK_NAMES)[number];

export type DrinkDefaults = {
  milkMl: number;
  foamMl: number;
  hotWaterMl: number;
  hasChocolate: boolean;
  hasIceCream: boolean;
  hasChai: boolean;
};

export const DRINK_DEFAULTS: Record<DrinkName, DrinkDefaults> = {
  Ristretto:   { milkMl: 0,   foamMl: 0,  hotWaterMl: 0,   hasChocolate: false, hasIceCream: false, hasChai: false },
  Espresso:    { milkMl: 0,   foamMl: 0,  hotWaterMl: 0,   hasChocolate: false, hasIceCream: false, hasChai: false },
  Doppio:      { milkMl: 0,   foamMl: 0,  hotWaterMl: 0,   hasChocolate: false, hasIceCream: false, hasChai: false },
  Lungo:       { milkMl: 0,   foamMl: 0,  hotWaterMl: 0,   hasChocolate: false, hasIceCream: false, hasChai: false },
  Americano:   { milkMl: 0,   foamMl: 0,  hotWaterMl: 120, hasChocolate: false, hasIceCream: false, hasChai: false },
  Macchiato:   { milkMl: 0,   foamMl: 20, hotWaterMl: 0,   hasChocolate: false, hasIceCream: false, hasChai: false },
  Cortado:     { milkMl: 30,  foamMl: 10, hotWaterMl: 0,   hasChocolate: false, hasIceCream: false, hasChai: false },
  "Flat White":{ milkMl: 120, foamMl: 10, hotWaterMl: 0,   hasChocolate: false, hasIceCream: false, hasChai: false },
  Cappuccino:  { milkMl: 60,  foamMl: 60, hotWaterMl: 0,   hasChocolate: false, hasIceCream: false, hasChai: false },
  Latte:       { milkMl: 240, foamMl: 20, hotWaterMl: 0,   hasChocolate: false, hasIceCream: false, hasChai: false },
  Mocha:       { milkMl: 120, foamMl: 20, hotWaterMl: 0,   hasChocolate: true,  hasIceCream: false, hasChai: false },
  Affogato:    { milkMl: 0,   foamMl: 0,  hotWaterMl: 0,   hasChocolate: false, hasIceCream: true,  hasChai: false },
  "Dirty Chai":        { milkMl: 150, foamMl: 0,  hotWaterMl: 0,   hasChocolate: false, hasIceCream: false, hasChai: true  },
};

export function detectEspressoBase(doseG: number, yieldG: number): EspressoBase {
  const ratio = yieldG / doseG;
  if (ratio >= 1.0 && ratio < 1.5) return "Ristretto";
  if (ratio >= 1.5 && ratio < 3.0) return doseG <= 10 ? "Espresso" : "Doppio";
  if (ratio >= 3.0 && ratio < 4.0) return "Lungo";
  return null;
}

export function detectDrink(params: {
  doseG: number;
  yieldG: number;
  milkMl: number | null;
  foamMl: number | null;
  hotWaterMl: number | null;
  hasChocolate: boolean;
  hasIceCream: boolean;
  hasChai: boolean;
}): DrinkName | null {
  const { doseG, yieldG, hasChocolate, hasIceCream, hasChai } = params;
  const milkMl = params.milkMl ?? 0;
  const foamMl = params.foamMl ?? 0;
  const hotWaterMl = params.hotWaterMl ?? 0;

  const base = detectEspressoBase(doseG, yieldG);
  const matches: DrinkName[] = [];

  // Affogato
  if (hasIceCream) matches.push("Affogato");

  // Chai
  if (hasChai && milkMl > 0) matches.push("Dirty Chai");

  // Americano
  if (hotWaterMl > 0 && milkMl === 0 && foamMl === 0 && !hasChocolate && !hasIceCream && !hasChai) matches.push("Americano");

  // Macchiato: base=espresso, milkMl 0–10, foamMl 10–35
  if (base === "Espresso" && milkMl >= 0 && milkMl <= 10 && foamMl >= 10 && foamMl <= 35 && hotWaterMl === 0 && !hasChocolate && !hasChai) {
    matches.push("Macchiato");
  }

  // Cortado: base=espresso, milkMl 20–55, foamMl 0–20
  if (base === "Espresso" && milkMl >= 20 && milkMl <= 55 && foamMl >= 0 && foamMl <= 20 && hotWaterMl === 0 && !hasChocolate && !hasChai) {
    matches.push("Cortado");
  }

  // Flat White: base=doppio, milkMl 80–149, foamMl 0–20
  if (base === "Doppio" && milkMl >= 80 && milkMl <= 149 && foamMl >= 0 && foamMl <= 20 && hotWaterMl === 0 && !hasChocolate && !hasChai) {
    matches.push("Flat White");
  }

  // Cappuccino: milkMl 45–90, foamMl 45–90, roughly equal
  if (milkMl >= 45 && milkMl <= 90 && foamMl >= 45 && foamMl <= 90 && Math.abs(milkMl - foamMl) <= 30 && hotWaterMl === 0 && !hasChocolate && !hasChai) {
    matches.push("Cappuccino");
  }

  // Mocha: milkMl 80–160, hasChocolate
  if (milkMl >= 80 && milkMl <= 160 && hasChocolate && hotWaterMl === 0 && !hasChai) {
    matches.push("Mocha");
  }

  // Latte: milkMl 150–300, foamMl 0–35
  if (milkMl >= 150 && milkMl <= 300 && foamMl >= 0 && foamMl <= 35 && hotWaterMl === 0 && !hasChocolate && !hasChai) {
    matches.push("Latte");
  }

  // Base espresso: no milk, foam, water, or extras
  if (base !== null && milkMl === 0 && foamMl === 0 && hotWaterMl === 0 && !hasChocolate && !hasIceCream && !hasChai) {
    matches.push(base);
  }

  if (matches.length === 1) return matches[0];
  return null;
}
