import { notFound } from "next/navigation";
import Link from "next/link";
import { getRoasterById } from "@/lib/roasters/queries";
import {
  getRoasterShotRatingDist,
  getRoasterTasteDist,
  getRoasterRoastLevelDist,
  getRoasterProcessDist,
} from "@/lib/roasters/stats";
import RoasterFormClient from "@/components/roasters/RoasterFormClient";
import RoasterDeleteButton from "@/components/roasters/RoasterDeleteButton";
import { BarChart, RATING_COLORS, type BarSpec } from "@/components/stats/StatsCharts";

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

  const [ratingDist, tasteDist, roastDist, processDist] = await Promise.all([
    getRoasterShotRatingDist(roaster.id),
    getRoasterTasteDist(roaster.id),
    getRoasterRoastLevelDist(roaster.id),
    getRoasterProcessDist(roaster.id),
  ]);

  const ratingBars: BarSpec[] = [1, 2, 3, 4, 5].map(n => ({
    label: `${n}★`, count: ratingDist[n], color: RATING_COLORS[n],
  }));
  const totalRated = ratingBars.reduce((a, b) => a + b.count, 0);

  const tasteBars: BarSpec[] = [1, 2, 3, 4, 5, 6, 7].map((n, i) => ({
    label: TASTE_LABELS[i], count: tasteDist[n], color: "var(--accent)",
  }));
  const totalTasted = tasteBars.reduce((a, b) => a + b.count, 0);

  const roastCountMap = Object.fromEntries(roastDist.map(r => [r.roastLevel, r.count]));
  const roastTotal = roastDist.reduce((a, r) => a + r.count, 0);
  const roastBars: BarSpec[] = (["light", "medium_light", "medium", "medium_dark", "dark"] as const).map(level => ({
    label: ROAST_LEVEL_LABELS[level], count: roastCountMap[level] ?? 0, color: ROAST_LEVEL_COLORS[level],
  }));

  const processCountMap = Object.fromEntries(processDist.map(r => [r.method, r.count]));
  const processTotal = processDist.reduce((a, r) => a + r.count, 0);
  const processBars: BarSpec[] = (["washed", "natural", "honey", "anaerobic", "ea_washed", "swiss_water", "other"] as const).map(m => ({
    label: PROCESS_LABELS[m], count: processCountMap[m] ?? 0, color: PROCESS_COLORS[m],
  }));

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
            style={{ backgroundColor: "var(--card-secondary)", color: "var(--text-secondary)" }}
          >
            {roaster.bagCount} {roaster.bagCount === 1 ? "bag" : "bags"}
          </span>
        </div>
        {roaster.alias && (
          <p className="text-[15px] mt-0.5" style={{ color: "var(--accent)" }}>
            Shown as “{roaster.alias}” across the app
          </p>
        )}
      </div>

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

      <SectionHeader title="Profile" />
      <RoasterFormClient roaster={roaster} />

      <RoasterDeleteButton roasterId={roaster.id} bagCount={roaster.bagCount} />
    </div>
  );
}
