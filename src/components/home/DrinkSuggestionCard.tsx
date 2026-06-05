"use client";

import { useState, useEffect } from "react";

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
    description: "Short, concentrated pull. Sweeter and more syrupy.",
    chips: ["Ratio 1:1 – 1:1.5"],
    volumes: { espresso: 18, milk: 0, foam: 0, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Espresso",
    description: "Classic single shot. Balanced extraction.",
    chips: ["Ratio 1:1.5 – 1:3"],
    volumes: { espresso: 30, milk: 0, foam: 0, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Lungo",
    description: "Long pull. More bitter, less concentrated.",
    chips: ["Ratio 1:3 – 1:4"],
    volumes: { espresso: 54, milk: 0, foam: 0, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Americano",
    description: "Espresso diluted with hot water.",
    chips: ["Hot water 120ml"],
    volumes: { espresso: 36, milk: 0, foam: 0, hotWater: 120, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Macchiato",
    description: "Espresso 'stained' with a small dollop of foam.",
    chips: ["Foam 20ml"],
    volumes: { espresso: 30, milk: 0, foam: 20, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Cortado",
    description: "Equal parts espresso and steamed milk. Minimal foam.",
    chips: ["Milk 30ml steamed", "Foam 10ml"],
    volumes: { espresso: 30, milk: 30, foam: 10, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Flat White",
    description: "Doppio with velvety microfoam. Stronger than a latte.",
    chips: ["Milk 120ml steamed", "Foam 10ml microfoam"],
    volumes: { espresso: 36, milk: 120, foam: 10, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Cappuccino",
    description: "Equal thirds: espresso, steamed milk, thick foam.",
    chips: ["Milk 60ml steamed", "Foam 60ml thick foam"],
    volumes: { espresso: 36, milk: 60, foam: 60, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Latte",
    description: "Mostly steamed milk with a thin layer of microfoam.",
    chips: ["Milk 240ml steamed", "Foam 20ml thin layer"],
    volumes: { espresso: 36, milk: 240, foam: 20, hotWater: 0, chocolate: 0, iceCream: 0, chai: 0 },
  },
  {
    name: "Mocha",
    description: "Latte-style with chocolate. Rich and sweet.",
    chips: ["Milk 120ml steamed", "Chocolate sauce"],
    volumes: { espresso: 36, milk: 120, foam: 20, hotWater: 0, chocolate: 10, iceCream: 0, chai: 0 },
  },
  {
    name: "Affogato",
    description: "Hot espresso poured over a scoop of vanilla ice cream.",
    chips: ["Ice cream (1 scoop)"],
    volumes: { espresso: 30, milk: 0, foam: 0, hotWater: 0, chocolate: 0, iceCream: 60, chai: 0 },
  },
  {
    name: "Dirty Chai",
    description: "Spiced chai with espresso and steamed milk.",
    chips: ["Milk 150ml steamed", "Chai concentrate"],
    volumes: { espresso: 36, milk: 150, foam: 0, hotWater: 0, chocolate: 0, iceCream: 0, chai: 30 },
  },
];

function DrinkBar({ volumes }: { volumes: DrinkVolumes }) {
  const filled =
    volumes.espresso + volumes.chai + volumes.chocolate +
    volumes.hotWater + volumes.milk + volumes.iceCream + volumes.foam;
  const empty = Math.max(0, MAX_ML - filled);
  const segments = [
    { ml: volumes.espresso, color: "var(--drink-espresso)" },
    { ml: volumes.chai,     color: "var(--drink-chai)" },
    { ml: volumes.chocolate,color: "#79564d" },
    { ml: volumes.hotWater, color: "#a0cee7" },
    { ml: volumes.milk,     color: "#f3f2f6" },
    { ml: volumes.iceCream, color: "#d2d3c4" },
    { ml: volumes.foam,     color: "#fefce6" },
    { ml: empty,            color: "#c9c9ce" },
  ].filter((s) => s.ml > 0);
  return (
    <div className="flex overflow-hidden rounded-full" style={{ height: 10 }}>
      {segments.map((seg, i) => (
        <div key={i} style={{ width: `${(seg.ml / MAX_ML) * 100}%`, backgroundColor: seg.color, flexShrink: 0 }} />
      ))}
    </div>
  );
}

export default function DrinkSuggestionCard({
  bags = [],
  todayShots = [],
}: {
  bags?: { isDecaf: boolean }[];
  todayShots?: { pulledAt: string; isDecaf: boolean }[];
}) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (bags.length === 0) { setVisible(false); return; }

    const now = new Date();
    const hour = now.getHours();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const pulledCafToday = todayShots.some((s) => !s.isDecaf && new Date(s.pulledAt) >= todayStart);
    const pulledDecafToday = todayShots.some((s) => s.isDecaf && new Date(s.pulledAt) >= todayStart);

    if (pulledDecafToday) { setVisible(false); return; }
    if (pulledCafToday && hour < 14) { setVisible(false); return; }
    if (hour >= 19) { setVisible(false); return; }

    if (pulledCafToday) {
      setVisible(bags.some((b) => b.isDecaf));
      return;
    }

    setVisible(true);
  }, [bags, todayShots]);

  useEffect(() => {
    setIdx(Math.floor(Math.random() * DRINKS.length));
  }, []);

  const drink = DRINKS[idx];

  if (!visible) return null;

  function shuffle() {
    let next = Math.floor(Math.random() * (DRINKS.length - 1));
    if (next >= idx) next += 1;
    setIdx(next);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden mb-4"
      style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
    >
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Try a drink
        </p>
        <button
          type="button"
          onPointerDown={shuffle}
          className="flex items-center gap-1 text-[13px] font-medium active:opacity-60 transition-opacity select-none"
          style={{ color: "var(--accent)" }}
        >
          ↺ Shuffle
        </button>
      </div>
      <div className="row-divider-t px-4 pt-3 pb-3">
        <p className="text-[17px] font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
          {drink.name}
        </p>
        <p className="text-[13px] mb-3" style={{ color: "var(--text-secondary)" }}>
          {drink.description}
        </p>
        <div className="mb-3">
          <DrinkBar volumes={drink.volumes} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {drink.chips.map((chip) => (
            <span
              key={chip}
              className="text-[12px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
