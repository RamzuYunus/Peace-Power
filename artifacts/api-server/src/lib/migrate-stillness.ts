/**
 * Retroactive Deep Stillness Re-Classification
 *
 * Finds any scan records where the physiological data meets the Deep Stillness
 * thresholds but was classified before this feature existed (or with isStillnessMode = false).
 * Updates those records so historical results correctly reflect the user's state.
 *
 * Safe to run on every startup — uses a WHERE clause that only touches records
 * that need changing, and is a no-op when there are none.
 */

import { db, scansTable } from "@workspace/db";
import { and, lt, gt, eq, or, isNull } from "drizzle-orm";

// These must stay in sync with signal-processing.ts on the frontend
const STILLNESS_HR_THRESHOLD = 55;  // bpm  (strictly less than)
const STILLNESS_SDNN_MAX     = 20;  // ms   (strictly less than)
const STILLNESS_RMSSD_MIN    = 100; // ms   (strictly greater than)

export async function retroactivelyClassifyStillnessScans() {
  try {
    // Find scans that physiologically qualify as Deep Stillness
    // but have not been marked as such yet.
    const qualifying = await db
      .select({ id: scansTable.id })
      .from(scansTable)
      .where(
        and(
          lt(scansTable.heartRate, STILLNESS_HR_THRESHOLD),
          lt(scansTable.sdnn, STILLNESS_SDNN_MAX),
          gt(scansTable.rmssd, STILLNESS_RMSSD_MIN),
          // Only touch records not already classified
          or(
            eq(scansTable.isStillnessMode, false),
            isNull(scansTable.isStillnessMode)
          )
        )
      );

    if (qualifying.length === 0) {
      console.log("[stillness-migration] No scans require re-classification.");
      return;
    }

    const ids = qualifying.map(r => r.id);
    console.log(`[stillness-migration] Re-classifying ${ids.length} scan(s) as Deep Stillness: ids ${ids.join(", ")}`);

    // Update each qualifying scan in bulk
    await Promise.all(
      ids.map(id =>
        db
          .update(scansTable)
          .set({
            coherenceScore: 10,
            coherenceLevel: "Deep Stillness",
            isStillnessMode: true,
          })
          .where(eq(scansTable.id, id))
      )
    );

    console.log(`[stillness-migration] Done — ${ids.length} scan(s) updated.`);
  } catch (err) {
    // Never crash the server over a migration error
    console.error("[stillness-migration] Error during re-classification:", err);
  }
}
