import { Router, type IRouter } from "express";
import { db, scansTable, usersTable } from "@workspace/db";
import { eq, desc, count, avg, sql } from "drizzle-orm";
import { retroactivelyClassifyStillnessScans } from "../lib/migrate-stillness";
import {
  GetAdminMembersResponse,
  GetAdminMemberScansResponse,
  GetAdminStatsResponse,
  SetAdminRoleBody,
  SetAdminRoleParams,
  GetAdminMemberScansParams,
  SetAdminRoleResponse,
} from "@workspace/api-zod";
import "../lib/session";

const router: IRouter = Router();

// Middleware: require auth + admin
async function requireAdmin(req: any, res: any, next: any) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));
  if (!user || !user.isAdmin) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  next();
}

// GET /admin/members
router.get("/admin/members", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);

  const members = await Promise.all(
    users.map(async (user) => {
      const userScans = await db
        .select()
        .from(scansTable)
        .where(eq(scansTable.userId, user.id))
        .orderBy(desc(scansTable.scannedAt));

      const scanCount = userScans.length;
      const lastScan = userScans[0] ?? null;
      const avgCoherenceScore =
        scanCount > 0
          ? userScans.reduce((sum, s) => sum + s.coherenceScore, 0) / scanCount
          : null;
      const avgHeartRate =
        scanCount > 0
          ? userScans.reduce((sum, s) => sum + s.heartRate, 0) / scanCount
          : null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        scanCount,
        lastScan,
        avgCoherenceScore,
        avgHeartRate,
      };
    })
  );

  res.json(GetAdminMembersResponse.parse(members));
});

// GET /admin/members/:userId/scans
router.get("/admin/members/:userId/scans", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const params = GetAdminMemberScansParams.safeParse({ userId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const scans = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.userId, params.data.userId))
    .orderBy(desc(scansTable.scannedAt));

  res.json(GetAdminMemberScansResponse.parse(scans));
});

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [memberRow] = await db.select({ total: count() }).from(usersTable);
  const allScans = await db.select().from(scansTable);

  const totalScans = allScans.length;
  const avgCoherenceScore =
    totalScans > 0
      ? allScans.reduce((sum, s) => sum + s.coherenceScore, 0) / totalScans
      : null;
  const avgHeartRate =
    totalScans > 0
      ? allScans.reduce((sum, s) => sum + s.heartRate, 0) / totalScans
      : null;
  const highCoherenceCount = allScans.filter((s) => s.coherenceLevel === "High").length;
  const mediumCoherenceCount = allScans.filter((s) => s.coherenceLevel === "Medium").length;
  const lowCoherenceCount = allScans.filter((s) => s.coherenceLevel === "Low").length;

  res.json(
    GetAdminStatsResponse.parse({
      totalMembers: memberRow?.total ?? 0,
      totalScans,
      avgCoherenceScore,
      avgHeartRate,
      highCoherenceCount,
      mediumCoherenceCount,
      lowCoherenceCount,
    })
  );
});

// POST /admin/members/:userId/set-admin
router.post("/admin/members/:userId/set-admin", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const params = SetAdminRoleParams.safeParse({ userId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const body = SetAdminRoleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ isAdmin: body.data.isAdmin })
    .where(eq(usersTable.id, params.data.userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "Member not found." });
    return;
  }

  res.json(
    SetAdminRoleResponse.parse({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    })
  );
});

// POST /admin/reclassify-stillness
// Manually re-run the Deep Stillness re-classification across all members.
// Useful when thresholds are tuned after deployment.
router.post("/admin/reclassify-stillness", requireAdmin, async (_req, res): Promise<void> => {
  const result = await retroactivelyClassifyStillnessScans();
  res.json({ ok: true, total: result.total, updated: result.updated, unchanged: result.unchanged });
});

export default router;
