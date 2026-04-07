import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentTable = pgTable("content", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContentSchema = createInsertSchema(contentTable);
export type InsertContent = z.infer<typeof insertContentSchema>;
export type Content = typeof contentTable.$inferSelect;

// Default content keys
export const DEFAULT_CONTENT = {
  "landing_headline": "United Empowerment Through the Power of the Heart",
  "landing_description": "We are building a global initiative to unite those who want peace and an end to oppression — by utilizing the power of heart-based compassionate collective consciousness through heart coherence.",
  "scan_instructions": "Place your fingertip completely over your phone's rear camera lens. The flash will turn on automatically.",
  "scan_warning": "If finger is NOT touching camera, RMSSD will be inflated 2–4x. PRESS FINGER FLAT against camera + flash for accurate readings. Hovering = unreliable HRV.",
} as const;
