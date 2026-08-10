import { notFound } from "next/navigation";
import Link from "next/link";
import { getRoasterById, getBagsForRoaster } from "@/lib/roasters/queries";
import {
  getRoasterShotRatingDist,
  getRoasterTasteDist,
  getRoasterRoastLevelDist,
  getRoasterProcessDist,
} from "@/lib/roasters/stats";
import RoasterFormClient from "@/components/roasters/RoasterFormClient";
import RoasterDeleteButton from "@/components/roasters/RoasterDeleteButton";
import { BarChart, RATING_COLORS, type BarSpec } from "@/components/stats/StatsCharts";
import MiniFreshnessBar from "@/components/bags/MiniFreshnessBar";
import { getDaysSinceRoast, getFreshnessLabel, getFreshnessColor, FRESHNESS_CSS } from "@/lib/bags/freshness";

const BAG_STATUS_LABELS: Record<string, string> = {
  reserve: "Reserve", finished: "Finished",
};

const ROAST_LEVEL_LABELS: Record<string, string> = {
  light: "Light", medium_light: "Med-Light", medium: "Medium",
  medium_dark: "Med-Dark", dark: "Dark",
};
const ROAST_LEVEL_COLORS: Record<string, string> = {
  light: "#FFD60A", medium_light: "#FF9500", medium: "#C84B31",
  medium_dark: "#8B3A2A", dark: "#4A2315",
};
const PROCESS_LABELS: Record<string, string> = {
  washed: "Washed", natural: "Natural", honey: "Honey",
  anaerobic: "Anaerob.", ea_washed: "EA W.",
  swiss_water: "Swiss W.", other: "Other",
};
const PROCESS_COLORS: Record<string, string> = {
  washed: "#34AADC", natural: "#E8735A", honey: "#F5A623",
  anaerobic: "#8B5CF6", ea_washed: "#34C759",
  swiss_water: "#30D158", other: "#8E8E93",
};
const TASTE_LABELS = ["V.Sour", "Sour", "Sl.Sour", "Balanced", "Sl.Bitter", "Bitter", "V.Bitter"];

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <p className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{title}</p>
    </div>
  );
}

export default async function RoasterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roaster = await getRoasterById(Number(id));
  if (!roaster) notFound();

  const [ratingDist, tasteDist, roastDist, processDist, bags] = await Promise.all([
    getRoasterShotRatingDist(roaster.id),
    getRoasterTasteDist(roaster.id),
    getRoasterRoastLevelDist(roaster.id),
    getRoasterProcessDist(roaster.id),
    getBagsForRoaster(roaster.id),
  ]);

  const ratingBars: BarSpec[] = [1, 2, 3, 4, 5].map(n => ({
    label: `${n}★`, count: ratingDist[n], color: RATING_COLORS[n],
  }));
  const totalRated = ratingBars.reduce((a, b) => a + b.count, 0);

  const tasteBars: BarSpec[] = [1, 2, 3, 4, 5, 6, 7].map((n, i) => ({
    label: TASTE_LABELS[i], count: tasteDist[n], color: "var(--accent)",
  }));
  const totalTasted = tasteBars.reduce((a, b) => a + b.count, 0);

  // Totals come from the bars actually being rendered, not the raw
  // distribution — that distribution includes an "unspecified" bucket with
  // no bar of its own, so a roaster tagged entirely "unspecified" would
  // otherwise pass the > 0 gate below and render a chart with zero visible
  // bars.
  const roastCountMap = Object.fromEntries(roastDist.map(r => [r.roastLevel, r.count]));
  const roastBars: BarSpec[] = (["light", "medium_light", "medium", "medium_dark", "dark"] as const).map(level => ({
    label: ROAST_LEVEL_LABELS[level], count: roastCountMap[level] ?? 0, color: ROAST_LEVEL_COLORS[level],
  }));
  const roastTotal = roastBars.reduce((a, b) => a + b.count, 0);

  const processCountMap = Object.fromEntries(processDist.map(r => [r.method, r.count]));
  const processBars: BarSpec[] = (["washed", "natural", "honey", "anaerobic", "ea_washed", "swiss_water", "other"] as const).map(m => ({
    label: PROCESS_LABELS[m], count: processCountMap[m] ?? 0, color: PROCESS_COLORS[m],
  }));
  const processTotal = processBars.reduce((a, b) => a + b.count, 0);

  return (
    <div className="pt-4 pb-24">
      <div className="px-4 mb-2">
        <Link href="/more/roasters" className="text-[17px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 1L1 8.5L9 16" />
          </svg>
          Roasters
        </Link>
      </div>

      <div className="px-4 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-[34px] font-display flex-1" style={{ color: "var(--text-primary)" }}>
            {roaster.name}
          </h1>
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
        </div>
        {roaster.alias && (
          <p className="text-[15px] mt-0.5" style={{ color: "var(--accent)" }}>
            Shown as “{roaster.alias}” across the app
          </p>
        )}
        {roaster.website && (
          <a
            href={roaster.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[15px] mt-1 active:opacity-70 transition-opacity"
            style={{ color: "var(--accent)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Visit website
          </a>
        )}
      </div>

      <SectionHeader title="Profile" />
      <RoasterFormClient roaster={roaster} />

      <SectionHeader title="Stats" />
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div className="flex items-center justify-between px-6 min-h-[52px]">
          <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Shots Pulled</span>
          <span className="text-[17px]" style={{ color: "var(--text-secondary)" }}>{roaster.shotCount}</span>
        </div>
        {roaster.avgShotRating != null && (
          <>
            <div className="ml-4" style={{ height: "1px", backgroundColor: "var(--divider)" }} />
            <div className="flex items-center justify-between px-6 min-h-[52px]">
              <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Avg Shot Rating</span>
              <span className="text-[17px]" style={{ color: "#FF9500" }}>
                {"★".repeat(Math.round(roaster.avgShotRating))}{"☆".repeat(5 - Math.round(roaster.avgShotRating))} {roaster.avgShotRating.toFixed(1)}
              </span>
            </div>
          </>
        )}
        {roaster.avgDrinkRating != null && (
          <>
            <div className="ml-4" style={{ height: "1px", backgroundColor: "var(--divider)" }} />
            <div className="flex items-center justify-between px-6 min-h-[52px]">
              <span className="text-[17px]" style={{ color: "var(--text-primary)" }}>Avg Drink Rating</span>
              <span className="text-[17px]" style={{ color: "var(--accent)" }}>
                {"★".repeat(Math.round(roaster.avgDrinkRating))}{"☆".repeat(5 - Math.round(roaster.avgDrinkRating))} {roaster.avgDrinkRating.toFixed(1)}
              </span>
            </div>
          </>
        )}
      </div>

      {(totalRated > 0 || totalTasted > 0 || roastTotal > 0 || processTotal > 0) && (
        <>
          <SectionHeader title="Charts" />
          <div className="px-4">
            {totalRated > 0 && (
              <BarChart bars={ratingBars} title="Shot ratings" subtitle={`${totalRated} rated`}
                stat={roaster.avgShotRating != null ? `★ ${roaster.avgShotRating.toFixed(1)}` : undefined}
                statColor="#FF9500"
              />
            )}
            {totalTasted > 0 && (
              <BarChart bars={tasteBars} title="Taste balance" subtitle={`${totalTasted} logged`} labelFontSize={8} />
            )}
            {roastTotal > 0 && (
              <BarChart bars={roastBars} title="Roast level" subtitle={`${roastTotal} shots`} />
            )}
            {processTotal > 0 && (
              <BarChart bars={processBars} title="Process method" subtitle={`${processTotal} shots`} labelFontSize={8} />
            )}
          </div>
        </>
      )}

      {bags.length > 0 && (
        <>
          <SectionHeader title="Bags" />
          <div className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            {bags.map((bag, i) => {
              const isActive = bag.status === "active";
              const days = getDaysSinceRoast(bag.roastDate);
              const peakStart = bag.peakStartDay ?? 7;
              const peakEnd = bag.peakEndDay ?? 35;
              const freshnessLabel = getFreshnessLabel(days, peakStart, peakEnd);
              const freshnessColor = getFreshnessColor(days, peakStart, peakEnd);
              return (
                <Link
                  key={bag.id}
                  href={`/bags/${bag.id}`}
                  className={`block px-6 py-3 active:opacity-70 transition-opacity${i > 0 ? " row-divider" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <p className="text-[15px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{bag.name}</p>
                    {!isActive && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }}>
                        {BAG_STATUS_LABELS[bag.status] ?? bag.status}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <>
                      <MiniFreshnessBar days={days} peakStart={peakStart} peakEnd={peakEnd} />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[12px]" style={{ color: FRESHNESS_CSS[freshnessColor] }}>{freshnessLabel}</span>
                        {days >= 0 && (
                          <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{days}d</span>
                        )}
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {bag.avgShotRating != null && (
                      <span className="text-[12px] font-medium" style={{ color: "#FF9500" }}>
                        ★ {bag.avgShotRating.toFixed(1)}
                      </span>
                    )}
                    {bag.avgDrinkRating != null && (
                      <span className="text-[12px] font-medium" style={{ color: "var(--accent)" }}>
                        ★ {bag.avgDrinkRating.toFixed(1)}
                      </span>
                    )}
                    <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      {bag.shotCount} {bag.shotCount === 1 ? "shot" : "shots"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <RoasterDeleteButton roasterId={roaster.id} bagCount={roaster.bagCount} />
    </div>
  );
}
