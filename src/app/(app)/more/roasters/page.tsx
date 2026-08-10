export const dynamic = "force-dynamic";

import Link from "next/link";
import { getRoasters } from "@/lib/roasters/queries";

export default async function RoastersPage() {
  const roasters = await getRoasters();

  return (
    <div className="pt-4 pb-24">
      <div className="px-4 mb-2 flex items-center justify-between">
        <Link href="/more" className="text-[17px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1L1 8.5L9 16" />
          </svg>
          More
        </Link>
        <Link href="/more/roasters/new" className="text-[17px] font-medium" style={{ color: "var(--accent)" }}>
          Add
        </Link>
      </div>

      <h1 className="text-[34px] font-display px-4 mb-4" style={{ color: "var(--text-primary)" }}>
        Roasters
      </h1>

      {roasters.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[17px]" style={{ color: "var(--text-secondary)" }}>No roasters yet</p>
          <Link href="/more/roasters/new" className="text-[17px] font-medium mt-2 block" style={{ color: "var(--accent)" }}>
            Add your first roaster
          </Link>
        </div>
      ) : (
        <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          {roasters.map((roaster, i) => (
            <Link
              key={roaster.id}
              href={`/more/roasters/${roaster.id}`}
              className={`flex items-center px-6 min-h-[64px] active:opacity-70 transition-opacity${i < roasters.length - 1 ? " row-divider" : ""}`}
            >
              <div className="flex-1">
                <p className="text-[17px]" style={{ color: "var(--text-primary)" }}>{roaster.name}</p>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {[roaster.location, roaster.website].filter(Boolean).join(" · ") || "No details"}
                </p>
              </div>
              <span className="text-[13px] font-medium px-2.5 py-1 rounded-full ml-3" style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }}>
                {roaster.bagCount} {roaster.bagCount === 1 ? "bag" : "bags"}
              </span>
              <svg className="ml-3 flex-shrink-0" width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
                <path d="M1 1l6 5.5L1 12" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
