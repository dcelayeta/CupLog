import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { bags, bagOrigins, shots, drinks, equipmentProfiles, extractionThresholds, shotAnalyses, bagAnalyses, coachingState } from "@/db/schema";

export async function GET() {
  const [
    bagsData,
    bagOriginsData,
    shotsData,
    drinksData,
    equipmentProfilesData,
    extractionThresholdsData,
    shotAnalysesData,
    bagAnalysesData,
    coachingStateData,
  ] = await Promise.all([
    db.select().from(bags),
    db.select().from(bagOrigins),
    db.select().from(shots),
    db.select().from(drinks),
    db.select().from(equipmentProfiles),
    db.select().from(extractionThresholds),
    db.select().from(shotAnalyses),
    db.select().from(bagAnalyses),
    db.select().from(coachingState),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    bags: bagsData,
    bagOrigins: bagOriginsData,
    shots: shotsData,
    drinks: drinksData,
    equipmentProfiles: equipmentProfilesData,
    extractionThresholds: extractionThresholdsData,
    shotAnalyses: shotAnalysesData,
    bagAnalyses: bagAnalysesData,
    coachingState: coachingStateData,
  };

  const filename = `yield-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
