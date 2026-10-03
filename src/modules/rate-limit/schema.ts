import { pgTable, text, timestamp, integer, primaryKey, index } from "drizzle-orm/pg-core";

/** Contadores de limite de taxa por janela fixa, compartilhados entre containers (Fase 20). */
export const rateLimitBucket = pgTable(
  "rate_limit_bucket",
  {
    key: text().notNull(),
    windowStart: timestamp({ withTimezone: true }).notNull(),
    count: integer().default(0).notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] }), index("rate_limit_bucket_window_idx").on(t.windowStart)],
);
