import { pgTable, text, timestamp, uuid, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

/** Erros de servidor agrupados por fingerprint (Fase 20). Reaparecer depois de resolvido reabre a linha. */
export const appError = pgTable(
  "app_error",
  {
    id: uuid().primaryKey().defaultRandom(),
    fingerprint: text().notNull(),
    name: text().notNull(),
    message: text().notNull(),
    stack: text(),
    path: text(),
    method: text(),
    routeKind: text(),
    /** digest que o `error.tsx` mostra à pessoa (último visto) */
    digest: text(),
    userId: uuid(),
    count: integer().default(1).notNull(),
    firstSeenAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp({ withTimezone: true }),
    resolvedBy: uuid(),
  },
  (t) => [uniqueIndex("app_error_fingerprint_uniq").on(t.fingerprint), index("app_error_last_seen_idx").on(t.lastSeenAt.desc())],
);
