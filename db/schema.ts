// Source of truth for the database schema.
// Edit this file to add or modify tables.
// Changes are auto-applied to the database when merged to main.

import {
  pgTable,
  uuid,
  text,
  jsonb,
  smallint,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const roasts = pgTable(
  "roasts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),
    screenshotUrl: text("screenshot_url"),
    scores: jsonb("scores"),
    roastText: text("roast_text"),
    overallScore: smallint("overall_score"),
    pageContent: text("page_content"),
    ipHash: text("ip_hash"),
    isPro: boolean("is_pro").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("roasts_ip_hash_idx").on(table.ipHash),
    index("roasts_created_at_idx").on(table.createdAt),
  ]
);
