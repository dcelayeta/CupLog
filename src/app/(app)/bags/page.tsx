export const dynamic = "force-dynamic";

import Link from "next/link";
import { getBags, getBagCounts, searchBags } from "@/lib/bags/queries";
import BagsListClient from "@/components/bags/BagsListClient";
import { getRecentAvgDosePerBag } from "@/lib/shots/queries";
import { getAppConfig } from "@/lib/config/queries";

export default async function BagsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status: "active" | "finished" | "all" =
    params.status === "finished" ? "finished" : params.status === "all" ? "all" : "active";
  const query = params.q ?? "";

  const [bags, reserveBags, config, counts] = await Promise.all([
    query ? searchBags(query, status) : getBags(status),
    status === "active" && !query ? getBags("reserve") : Promise.resolve([]),
    getAppConfig(),
    getBagCounts(),
  ]);

  const bagIds = [...bags, ...reserveBags].map((b) => b.id);
  const avgDosePerBag = bagIds.length > 0
    ? await getRecentAvgDosePerBag(bagIds, config.recentShotWindow ?? 10)
    : {};

  return (
    <div className="pt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-4">
        <h1
          className="text-[34px] font-display"
          style={{ color: "var(--text-primary)" }}
        >
          Bags
        </h1>
        <div className="flex gap-2">
          <Link
            href="/bags/plan"
            className="px-4 py-2 rounded-full text-[15px] font-semibold"
            style={{ backgroundColor: "var(--card)", color: "var(--accent)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
          >
            Plan
          </Link>
          <Link
            href="/bags/new"
            className="px-4 py-2 rounded-full text-[15px] font-semibold"
            style={{ backgroundColor: "var(--card)", color: "var(--accent)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
          >
            Add
          </Link>
        </div>
      </div>

      <BagsListClient bags={bags} reserveBags={reserveBags} status={status} query={query} avgDosePerBag={avgDosePerBag} counts={counts} />
    </div>
  );
}
