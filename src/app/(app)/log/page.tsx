export const dynamic = "force-dynamic";

import {
  getActiveBags,
  getActiveEquipmentProfile,
  getAverageRetention,
  getLastShotDefaults,
  getLastShotDefaultsPerBag,
  getRecentShotsForAllBags,
} from "@/lib/shots/queries";
import { getExtractionThresholds } from "@/lib/shots/thresholds";
import LogFlowClient from "@/components/shots/LogFlowClient";

export default async function LogPage() {
  const [bags, equipmentProfile, averageRetention, lastShot, bagDefaults, thresholds] = await Promise.all([
    getActiveBags(),
    getActiveEquipmentProfile(),
    getAverageRetention(),
    getLastShotDefaults(),
    getLastShotDefaultsPerBag(),
    getExtractionThresholds(),
  ]);

  const recentShotsByBag = await getRecentShotsForAllBags(bags.map((b) => b.id));

  return (
    <div className="pt-4 pb-4">
      <h1
        className="text-[34px] font-display px-4 mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        Log
      </h1>

      {bags.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[17px]" style={{ color: "var(--text-secondary)" }}>
            No active bags
          </p>
          <p className="text-[15px] mt-1" style={{ color: "var(--text-secondary)" }}>
            Add a bag in the Bags section before logging a shot.
          </p>
        </div>
      ) : (
        <LogFlowClient
          bags={bags}
          equipmentProfile={equipmentProfile}
          averageRetention={averageRetention}
          lastShot={lastShot}
          bagDefaults={bagDefaults}
          thresholds={thresholds}
          recentShotsByBag={recentShotsByBag}
        />
      )}
    </div>
  );
}
