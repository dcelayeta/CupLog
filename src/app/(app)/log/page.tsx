import {
  getActiveBags,
  getActiveEquipmentProfile,
  getAverageRetention,
  getLastShotDefaults,
} from "@/lib/shots/queries";
import { getExtractionThresholds } from "@/lib/shots/thresholds";
import LogFormClient from "@/components/shots/LogFormClient";

export default async function LogPage() {
  const [bags, equipmentProfile, averageRetention, lastShot, thresholds] = await Promise.all([
    getActiveBags(),
    getActiveEquipmentProfile(),
    getAverageRetention(),
    getLastShotDefaults(),
    getExtractionThresholds(),
  ]);

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
        <LogFormClient
          bags={bags}
          equipmentProfile={equipmentProfile}
          averageRetention={averageRetention}
          lastShot={lastShot}
          thresholds={thresholds}
        />
      )}
    </div>
  );
}
