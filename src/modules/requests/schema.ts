import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";
import { organizations } from "@/modules/tenancy/schema";
import { project } from "@/modules/projects/schema";

export const portalRequestStatus = pgEnum("portal_request_status", ["open", "in_progress", "resolved"]);

/** Solicitação aberta pelo cliente no portal. Escopo: a organização; qualquer membro enxerga. */
export const portalRequest = pgTable(
  "portal_request",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // opcional; a solicitação sobrevive se o projeto for excluído
    projectId: uuid().references(() => project.id, { onDelete: "set null" }),
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    title: text().notNull(),
    body: text().notNull(),
    status: portalRequestStatus().default("open").notNull(),
    resolvedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("portal_request_org_updated_idx").on(t.organizationId, t.updatedAt.desc()),
    index("portal_request_status_idx").on(t.status),
  ],
);

export const portalRequestMessage = pgTable(
  "portal_request_message",
  {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
      .notNull()
      .references(() => portalRequest.id, { onDelete: "cascade" }),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("portal_request_message_request_idx").on(t.requestId, t.createdAt)],
);
