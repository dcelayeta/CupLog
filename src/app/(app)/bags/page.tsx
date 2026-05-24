import Link from "next/link";
import { getBags, searchBags } from "@/lib/bags/queries";
import BagsListClient from "@/components/bags/BagsListClient";

export default async function BagsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status === "finished" ? "finished" : "active";
  const query = params.q ?? "";

  const bags = query
    ? await searchBags(query, status)
    : await getBags(status);

  return (
    <div className="pt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-4">
        <h1
          className="text-[34px] font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Bags
        </h1>
        <Link
          href="/bags/new"
          className="px-4 py-2 rounded-full text-[15px] font-medium"
          style={{ backgroundColor: "var(--text-primary)", color: "var(--bg)" }}
        >
          Add
        </Link>
      </div>

      <BagsListClient bags={bags} status={status} query={query} />
    </div>
  );
}
