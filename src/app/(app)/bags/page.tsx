import Link from "next/link";
import { getBags, searchBags } from "@/lib/bags/queries";
import BagsListClient from "@/components/bags/BagsListClient";

export default async function BagsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status: "active" | "finished" | "all" =
    params.status === "finished" ? "finished" : params.status === "all" ? "all" : "active";
  const query = params.q ?? "";

  const bags = query
    ? await searchBags(query, status)
    : await getBags(status);

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
        <Link
          href="/bags/new"
          className="px-4 py-2 rounded-full text-[15px] font-semibold"
          style={{ backgroundColor: "var(--card)", color: "var(--accent)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
        >
          Add
        </Link>
      </div>

      <BagsListClient bags={bags} status={status} query={query} />
    </div>
  );
}
