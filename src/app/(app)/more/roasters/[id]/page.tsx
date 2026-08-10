import { notFound } from "next/navigation";
import Link from "next/link";
import { getRoasterById } from "@/lib/roasters/queries";
import RoasterFormClient from "@/components/roasters/RoasterFormClient";
import RoasterDeleteButton from "@/components/roasters/RoasterDeleteButton";

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

      <div className="px-4 mb-4 flex items-center gap-2">
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

      <SectionHeader title="Profile" />
      <RoasterFormClient roaster={roaster} />

      <RoasterDeleteButton roasterId={roaster.id} bagCount={roaster.bagCount} />
    </div>
  );
}
