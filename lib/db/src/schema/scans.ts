import { pgTable, text, serial, timestamp, integer, real, boolean, jsonb } from "drizzle-orm/pg-core";
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
  stillnessLevel: integer("stillness_level").notNull().default(0),     // 0=none, 1-4=level
  stillnessLabel: text("stillness_label").notNull().default(""),
  stillnessBadge: text("stillness_badge").notNull().default(""),
  rawIbis: jsonb("raw_ibis"),                                           // number[] for recalculation
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, createdAt: true });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
