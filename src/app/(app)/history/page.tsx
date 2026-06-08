export const dynamic = "force-dynamic";

import { getShotsForHistory, getAllBagsForHistory } from "@/lib/shots/queries";
import HistoryListClient from "@/components/shots/HistoryListClient";

export default async function HistoryPage() {
  const [shots, bags] = await Promise.all([
    getShotsForHistory(),
    getAllBagsForHistory(),
  ]);

  return (
    <div className="pt-4 pb-24">
      <h1
        className="text-[34px] font-display px-4 mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        History
      </h1>

      <HistoryListClient shots={shots} bags={bags} />
    </div>
  );
}
