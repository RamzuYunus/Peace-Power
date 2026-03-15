import { Router, type IRouter } from "express";
import { db, scansTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SubmitScanBody, GetMyScansResponse } from "@workspace/api-zod";
import "../lib/session";

const router: IRouter = Router();

// POST /scans
router.post("/scans", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const parsed = SubmitScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { heartRate, rmssd, sdnn, coherenceScore, coherenceLevel, quality } = parsed.data;

  const [scan] = await db
    .insert(scansTable)
    .values({
      userId: req.session.userId,
      heartRate,
      rmssd,
      sdnn,
      coherenceScore,
      coherenceLevel,
      quality,
    })
    .returning();

  res.status(201).json(scan);
});

// GET /scans/me
router.get("/scans/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const scans = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.userId, req.session.userId))
    .orderBy(desc(scansTable.scannedAt));

  res.json(GetMyScansResponse.parse(scans));
});

export default router;
