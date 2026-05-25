import Link from "next/link";

const MAX_ML = 300;

type DrinkVolumes = {
  espresso: number;
  milk: number;
  foam: number;
  hotWater: number;
  chocolate: number;
  iceCream: number;
  chai: number;
};

const DRINKS = [
  {
    name: "Ristretto",
    base: "Ratio 1:1 – 1:1.5",
    milk: null, foam: null, hotWater: null, extras: null,
    description: "Short, concentrated pull. Sweeter and more syrupy.",
    volumes: { espresso: 18, milk: 0, foam: 0, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Espresso",
    base: "Ratio 1:1.5 – 1:3, dose ≤10g",
    milk: null, foam: null, hotWater: null, extras: null,
    description: "Classic single shot. Balanced extraction.",
    volumes: { espresso: 30, milk: 0, foam: 0, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Doppio",
    base: "Ratio 1:1.5 – 1:3, dose >10g",
    milk: null, foam: null, hotWater: null, extras: null,
    description: "Double shot. Same ratio as espresso, larger dose.",
    volumes: { espresso: 36, milk: 0, foam: 0, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Lungo",
    base: "Ratio 1:3 – 1:4",
    milk: null, foam: null, hotWater: null, extras: null,
    description: "Long pull. More bitter, less concentrated.",
    volumes: { espresso: 54, milk: 0, foam: 0, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Americano",
    base: "Any",
    milk: null, foam: null, hotWater: "120ml", extras: null,
    description: "Espresso diluted with hot water.",
    volumes: { espresso: 36, milk: 0, foam: 0, hotWater: 120, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Macchiato",
    base: "Espresso",
    milk: null, foam: "20ml", hotWater: null, extras: null,
    description: "Espresso 'stained' with a small dollop of foam.",
    volumes: { espresso: 30, milk: 0, foam: 20, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Cortado",
    base: "Espresso",
    milk: "30ml steamed", foam: "10ml", hotWater: null, extras: null,
    description: "Equal parts espresso and steamed milk. Minimal foam.",
    volumes: { espresso: 30, milk: 30, foam: 10, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Flat White",
    base: "Doppio",
    milk: "120ml steamed", foam: "10ml microfoam", hotWater: null, extras: null,
    description: "Doppio with velvety microfoam. Stronger than a latte.",
    volumes: { espresso: 36, milk: 120, foam: 10, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Cappuccino",
    base: "Any",
    milk: "60ml steamed", foam: "60ml thick foam", hotWater: null, extras: null,
    description: "Equal thirds: espresso, steamed milk, thick foam.",
    volumes: { espresso: 36, milk: 60, foam: 60, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Latte",
    base: "Any",
    milk: "240ml steamed", foam: "20ml thin layer", hotWater: null, extras: null,
    description: "Mostly steamed milk with a thin layer of microfoam.",
    volumes: { espresso: 36, milk: 240, foam: 20, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Mocha",
    base: "Any",
    milk: "120ml steamed", foam: "20ml", hotWater: null, extras: "Chocolate sauce",
    description: "Latte-style with chocolate. Rich and sweet.",
    volumes: { espresso: 36, milk: 120, foam: 20, hotWater: 0, chocolate: 10, iceCream: 0, chai: 0 },
  },
  {
    name: "Affogato",
    base: "Espresso",
    milk: null, foam: null, hotWater: null, extras: "Ice cream (1 scoop)",
    description: "Hot espresso poured over a scoop of vanilla ice cream.",
    volumes: { espresso: 30, milk: 0, foam: 0, hotWater: 0, chocolate: 0, iceCream: 60, chai: 0 },
  },
  {
    name: "Dirty Chai",
    base: "Any",
    milk: "150ml steamed", foam: null, hotWater: null, extras: "Chai concentrate",
    description: "Spiced chai with espresso and steamed milk.",
    volumes: { espresso: 36, milk: 150, foam: 0, hotWater: 0, chocolate: 0, iceCream: 0, chai: 30 },
  },
];

function DrinkBar({ volumes }: { volumes: DrinkVolumes }) {
  const filled = volumes.espresso + volumes.chai + volumes.chocolate + volumes.hotWater + volumes.milk + volumes.iceCream + volumes.foam;
  const empty = Math.max(0, MAX_ML - filled);

  const segments: { ml: number; color: string }[] = [
    { ml: volumes.espresso, color: "#271812" },
    { ml: volumes.chai,     color: "#462c21" },
    { ml: volumes.chocolate,color: "#79564d" },
    { ml: volumes.hotWater, color: "#a0cee7" },
    { ml: volumes.milk,     color: "#f3f2f6" },
    { ml: volumes.iceCream, color: "#d2d3c4" },
    { ml: volumes.foam,     color: "#fefce6" },
    { ml: empty,            color: "#c9c9ce" },
  ].filter((s) => s.ml > 0);

  return (
    <div className="flex overflow-hidden rounded-full mb-3" style={{ height: 12 }}>
      {segments.map((seg, i) => (
        <div
          key={i}
          style={{ width: `${(seg.ml / MAX_ML) * 100}%`, backgroundColor: seg.color, flexShrink: 0 }}
        />
      ))}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span
      className="text-[12px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }}
    >
      {label}
    </span>
  );
}

export default function DrinkReferencePage() {
  return (
    <div className="pt-4 pb-24">
      <div className="px-4 mb-2">
        <Link href="/more" className="text-[17px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1L1 8.5L9 16" />
          </svg>
          More
        </Link>
      </div>
      <h1 className="text-[34px] font-display px-4 mb-1" style={{ color: "var(--text-primary)" }}>
        Drink Reference
      </h1>
      <p className="px-4 mb-4 text-[15px]" style={{ color: "var(--text-secondary)" }}>
        Canonical proportions used for auto-detection.
      </p>

      <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        {DRINKS.map((drink, i) => (
          <div
            key={drink.name}
            className={`px-6 py-4${i < DRINKS.length - 1 ? " row-divider" : ""}`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-[17px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {drink.name}
              </p>
              <span className="text-[13px] shrink-0 mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {drink.base}
              </span>
            </div>
            <p className="text-[13px] mb-3" style={{ color: "var(--text-secondary)" }}>
              {drink.description}
            </p>
            <DrinkBar volumes={drink.volumes} />
            <div className="flex flex-wrap gap-1.5">
              {drink.milk && <Chip label={`Milk ${drink.milk}`} />}
              {drink.foam && <Chip label={`Foam ${drink.foam}`} />}
              {drink.hotWater && <Chip label={`Hot water ${drink.hotWater}`} />}
              {drink.extras && <Chip label={drink.extras} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
