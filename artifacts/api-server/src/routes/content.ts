import { Router, type IRouter } from "express";
import { db, contentTable, usersTable, DEFAULT_CONTENT } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// GET /content/:key
router.get("/content/:key", async (req, res): Promise<void> => {
  const { key } = req.params;

  const content = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.key, key))
    .limit(1);

  if (content.length === 0) {
    const defaultValue = DEFAULT_CONTENT[key as keyof typeof DEFAULT_CONTENT];
    res.json({ key, value: defaultValue || "" });
    return;
  }

  res.json(content[0]);
});

// GET /content (get all content)
router.get("/content", async (_req, res): Promise<void> => {
  const content = await db.select().from(contentTable);
  
  // Merge with defaults
  const merged = { ...DEFAULT_CONTENT };
  for (const item of content) {
    merged[item.key as keyof typeof DEFAULT_CONTENT] = item.value;
  }
  
  res.json(merged);
});

// PUT /content/:key (admin only)
router.put("/content/:key", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  // Check if user is admin
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);

  if (!user.length || !user[0].isAdmin) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const { key } = req.params;
  const { value } = req.body;

  if (!value || typeof value !== "string") {
    res.status(400).json({ error: "Invalid value." });
    return;
  }

  // Upsert
  await db
    .insert(contentTable)
    .values({ key, value })
    .onConflictDoUpdate({
      target: contentTable.key,
      set: { value },
    });

  res.json({ key, value });
});

export default router;
