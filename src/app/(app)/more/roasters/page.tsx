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
            <div
              key={roaster.id}
              className={`flex items-center px-6 py-3 min-h-[64px]${i < roasters.length - 1 ? " row-divider" : ""}`}
            >
              <Link href={`/more/roasters/${roaster.id}`} className="flex-1 min-w-0 active:opacity-70 transition-opacity">
                <div className="flex items-center gap-2">
                  <p className="text-[17px]" style={{ color: "var(--text-primary)" }}>{roaster.name}</p>
                  {roaster.alias && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--accent)" + "22", color: "var(--accent)" }}>
                      {roaster.alias}
                    </span>
                  )}
                </div>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {[roaster.location, roaster.website].filter(Boolean).join(" · ") || "No details"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    {roaster.shotCount} {roaster.shotCount === 1 ? "shot" : "shots"}
                  </span>
                  {roaster.avgShotRating != null && (
                    <span className="text-[13px] font-medium" style={{ color: "#FF9500" }}>
                      ★ {roaster.avgShotRating.toFixed(1)}
                    </span>
                  )}
                  {roaster.avgDrinkRating != null && (
                    <span className="text-[13px] font-medium" style={{ color: "var(--accent)" }}>
                      ★ {roaster.avgDrinkRating.toFixed(1)}
                    </span>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                {roaster.website && (
                  <a
                    href={roaster.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${roaster.name}'s website`}
                    className="p-1.5 active:opacity-60 transition-opacity"
                    style={{ color: "var(--accent)" }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}
                <Link href={`/more/roasters/${roaster.id}`} className="flex items-center gap-3 active:opacity-70 transition-opacity">
                  <span
                    className="text-[13px] font-medium px-2.5 py-1 rounded-full"
                    style={
                      roaster.activeBagCount > 0
                        ? { backgroundColor: "var(--accent)", color: "#fff" }
                        : { backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }
                    }
                  >
                    {roaster.bagCount} {roaster.bagCount === 1 ? "bag" : "bags"}
                  </span>
                  <svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
                    <path d="M1 1l6 5.5L1 12" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
