import Link from "next/link";

const DRINKS = [
  {
    name: "Ristretto",
    base: "Ratio 1:1 – 1:1.5",
    milk: null,
    foam: null,
    hotWater: null,
    extras: null,
    description: "Short, concentrated pull. Sweeter and more syrupy.",
  },
  {
    name: "Espresso",
    base: "Ratio 1:1.5 – 1:3, dose ≤10g",
    milk: null,
    foam: null,
    hotWater: null,
    extras: null,
    description: "Classic single shot. Balanced extraction.",
  },
  {
    name: "Doppio",
    base: "Ratio 1:1.5 – 1:3, dose >10g",
    milk: null,
    foam: null,
    hotWater: null,
    extras: null,
    description: "Double shot. Same ratio as espresso, larger dose.",
  },
  {
    name: "Lungo",
    base: "Ratio 1:3 – 1:4",
    milk: null,
    foam: null,
    hotWater: null,
    extras: null,
    description: "Long pull. More bitter, less concentrated.",
  },
  {
    name: "Americano",
    base: "Any",
    milk: null,
    foam: null,
    hotWater: "120ml",
    extras: null,
    description: "Espresso diluted with hot water.",
  },
  {
    name: "Macchiato",
    base: "Espresso",
    milk: null,
    foam: "20ml",
    hotWater: null,
    extras: null,
    description: "Espresso 'stained' with a small dollop of foam.",
  },
  {
    name: "Cortado",
    base: "Espresso",
    milk: "30ml steamed",
    foam: "10ml",
    hotWater: null,
    extras: null,
    description: "Equal parts espresso and steamed milk. Minimal foam.",
  },
  {
    name: "Flat White",
    base: "Doppio",
    milk: "120ml steamed",
    foam: "10ml microfoam",
    hotWater: null,
    extras: null,
    description: "Doppio with velvety microfoam. Stronger than a latte.",
  },
  {
    name: "Cappuccino",
    base: "Any",
    milk: "60ml steamed",
    foam: "60ml thick foam",
    hotWater: null,
    extras: null,
    description: "Equal thirds: espresso, steamed milk, thick foam.",
  },
  {
    name: "Latte",
    base: "Any",
    milk: "240ml steamed",
    foam: "20ml thin layer",
    hotWater: null,
    extras: null,
    description: "Mostly steamed milk with a thin layer of microfoam.",
  },
  {
    name: "Mocha",
    base: "Any",
    milk: "120ml steamed",
    foam: "20ml",
    hotWater: null,
    extras: "Chocolate sauce",
    description: "Latte-style with chocolate. Rich and sweet.",
  },
  {
    name: "Affogato",
    base: "Espresso",
    milk: null,
    foam: null,
    hotWater: null,
    extras: "Ice cream (1 scoop)",
    description: "Hot espresso poured over a scoop of vanilla ice cream.",
  },
  {
    name: "Dirty Chai",
    base: "Any",
    milk: "150ml steamed",
    foam: null,
    hotWater: null,
    extras: "Chai concentrate",
    description: "Spiced chai with espresso and steamed milk.",
  },
];

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
            <p className="text-[13px] mb-2" style={{ color: "var(--text-secondary)" }}>
              {drink.description}
            </p>
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
