/**
 * Retroactive Deep Stillness Re-Classification (4-Level Tiered)
 *
 * Scans all existing records and re-classifies any that meet the tiered
 * stillness thresholds using the saved HR, SDNN, and RMSSD values.
 *
 * If raw IBI data is available, uses it for a more precise re-calculation.
 * Safe to run on every startup — only updates records that need changing.
 */

import { db, scansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { reclassifyFromMetrics, detectStillnessLevel } from "./stillness-thresholds";

export { reclassifyFromMetrics } from "./stillness-thresholds";

export async function retroactivelyClassifyStillnessScans(): Promise<{
  total: number;
  updated: number;
  unchanged: number;
  details: string[];
}> {
  const result = { total: 0, updated: 0, unchanged: 0, details: [] as string[] };

  try {
    const allScans = await db.select().from(scansTable);
    result.total = allScans.length;

    for (const scan of allScans) {
      let newClassification: ReturnType<typeof reclassifyFromMetrics>;

      // Use raw IBIs if available (precise), otherwise fall back to stored metrics
      const rawIbis = scan.rawIbis as number[] | null;
      if (rawIbis && rawIbis.length >= 5) {
        const meanIbi = rawIbis.reduce((a: number, b: number) => a + b, 0) / rawIbis.length;
        const heartRate = Math.round(60000 / meanIbi);

        let sumSqDiff = 0;
        for (let i = 1; i < rawIbis.length; i++) {
          const diff = rawIbis[i] - rawIbis[i - 1];
          sumSqDiff += diff * diff;
        }
        const rmssdPrecise = Math.sqrt(sumSqDiff / (rawIbis.length - 1));

        let sumSqDev = 0;
        for (let i = 0; i < rawIbis.length; i++) {
          const dev = rawIbis[i] - meanIbi;
          sumSqDev += dev * dev;
        }
        const sdnnPrecise = Math.sqrt(sumSqDev / rawIbis.length);

        const match = detectStillnessLevel(heartRate, sdnnPrecise, rmssdPrecise, false);
        if (match) {
          newClassification = {
            isStillnessMode: true,
            stillnessLevel: match.level,
            stillnessLabel: match.label,
            stillnessBadge: match.badge,
            coherenceScore: 10,
            coherenceLevel: "Deep Stillness",
          };
        } else {
          newClassification = {
            isStillnessMode: false,
            stillnessLevel: 0,
            stillnessLabel: "",
            stillnessBadge: "",
            coherenceScore: -1,
            coherenceLevel: "",
          };
        }
      } else {
        newClassification = reclassifyFromMetrics(scan.heartRate, scan.sdnn, scan.rmssd);
      }

      // Check if anything changed
      const needsUpdate =
        newClassification.isStillnessMode !== scan.isStillnessMode ||
        newClassification.stillnessLevel !== scan.stillnessLevel ||
        newClassification.stillnessLabel !== (scan.stillnessLabel ?? "") ||
        newClassification.stillnessBadge !== (scan.stillnessBadge ?? "");

      if (!needsUpdate) {
        result.unchanged++;
        continue;
      }

      const updateValues: Record<string, unknown> = {
        isStillnessMode: newClassification.isStillnessMode,
        stillnessLevel: newClassification.stillnessLevel,
        stillnessLabel: newClassification.stillnessLabel,
        stillnessBadge: newClassification.stillnessBadge,
      };
      if (newClassification.coherenceScore !== -1) {
        updateValues.coherenceScore = newClassification.coherenceScore;
        updateValues.coherenceLevel = newClassification.coherenceLevel;
      }

      await db.update(scansTable).set(updateValues).where(eq(scansTable.id, scan.id));
      result.updated++;

      const label = newClassification.isStillnessMode
        ? `→ ${newClassification.stillnessBadge} Level ${newClassification.stillnessLevel} (${newClassification.stillnessLabel})`
        : "→ standard (no stillness)";
      result.details.push(`Scan #${scan.id} [HR ${scan.heartRate}, SDNN ${scan.sdnn}, RMSSD ${scan.rmssd}] ${label}`);
    }

    if (result.updated === 0) {
      console.log(`[stillness-migration] No scans require re-classification. (${result.total} checked)`);
    } else {
      console.log(`[stillness-migration] Updated ${result.updated}/${result.total} scan(s):`);
      result.details.forEach(d => console.log(`  ${d}`));
    }
  } catch (err) {
    console.error("[stillness-migration] Error during re-classification:", err);
  }

  return result;
}
