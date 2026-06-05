import { getBags } from "@/lib/bags/queries";
import { getShotDosageHistory } from "@/lib/shots/queries";
import PlannerClient from "@/components/bags/PlannerClient";
import Link from "next/link";

export default async function PlanPage() {
  const [activeBags, shotDosageHistory] = await Promise.all([
    getBags("active"),
    getShotDosageHistory(45),
  ]);

  return (
    <div className="pt-4 pb-24">
      <div className="flex items-center justify-between px-4 mb-4">
        <h1 className="text-[34px] font-display leading-none" style={{ color: "var(--text-primary)" }}>
          Planner
        </h1>
        <Link
          href="/bags"
          className="text-[17px]"
          style={{ color: "var(--accent)" }}
        >
          Bags ›
        </Link>
      </div>
      <PlannerClient activeBags={activeBags} shotDosageHistory={shotDosageHistory} />
    </div>
  );
}
