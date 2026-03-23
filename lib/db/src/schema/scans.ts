import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const scansTable = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  heartRate: integer("heart_rate").notNull(),
  rmssd: integer("rmssd").notNull(),
  sdnn: integer("sdnn").notNull(),
  coherenceScore: real("coherence_score").notNull(),
  coherenceLevel: text("coherence_level").notNull(),
  quality: text("quality").notNull(),
  isStillnessMode: boolean("is_stillness_mode").notNull().default(false),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, createdAt: true });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
