import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { files } from "@/modules/files/schema";
import { users } from "@/modules/auth/schema";
import { organizations } from "@/modules/tenancy/schema";
import { project, projectDeliverable, workPriority } from "@/modules/projects/schema";

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
    // triagem da equipe
    priority: workPriority().default("medium").notNull(),
    // entrega criada a partir desta solicitação
    deliverableId: uuid().references(() => projectDeliverable.id, { onDelete: "set null" }),
    // Fase 15: responsável na equipe, SLA de primeira resposta e lembretes ao cliente
    assigneeId: uuid().references(() => users.id, { onDelete: "set null" }),
    firstResponseDueAt: timestamp({ withTimezone: true }),
    firstResponseAt: timestamp({ withTimezone: true }),
    reminderCount: integer().default(0).notNull(),
    lastReminderAt: timestamp({ withTimezone: true }),
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
    // nota interna: só a equipe vê; não muda status nem conta como resposta
    internal: boolean().default(false).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("portal_request_message_request_idx").on(t.requestId, t.createdAt)],
);

/** Anexo de uma solicitação. `messageId` nulo = anexo do texto inicial. O arquivo pertence à organização. */
export const portalRequestAttachment = pgTable(
  "portal_request_attachment",
  {
    id: uuid().primaryKey().defaultRandom(),
    requestId: uuid()
      .notNull()
      .references(() => portalRequest.id, { onDelete: "cascade" }),
    messageId: uuid().references(() => portalRequestMessage.id, { onDelete: "cascade" }),
    fileId: uuid()
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("portal_request_attachment_request_idx").on(t.requestId)],
);
