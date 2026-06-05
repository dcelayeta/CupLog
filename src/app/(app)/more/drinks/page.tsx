export const dynamic = "force-dynamic";

import { getDrinksForList } from "@/lib/drinks/queries";
import DrinkListClient from "@/components/drinks/DrinkListClient";
import Link from "next/link";

export default async function DrinksPage() {
  const drinkList = await getDrinksForList();

  return (
    <div className="pt-4 pb-24">
      <div className="px-4 mb-4 flex items-center justify-between">
        <Link
          href="/more"
          className="text-[17px] flex items-center gap-1"
          style={{ color: "var(--accent)" }}
        >
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1L1 8.5L9 16" />
          </svg>
          More
        </Link>
      </div>

      <h1 className="text-[34px] font-display px-4 mb-4" style={{ color: "var(--text-primary)" }}>
        Drinks
      </h1>

      <DrinkListClient drinks={drinkList} />
    </div>
  );
}
