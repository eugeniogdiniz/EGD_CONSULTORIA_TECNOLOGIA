import { pgTable, text, timestamp, uuid, bigserial, jsonb, index } from "drizzle-orm/pg-core";

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    // null = ação do sistema (sem usuário)
    actorId: uuid(),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: text().notNull(),
    organizationId: uuid(),
    metadata: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_org_idx").on(t.organizationId), index("audit_created_idx").on(t.createdAt)],
);
