import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";
import { crmCompany } from "@/modules/crm/schema";
import { project, projectDeliverable } from "@/modules/projects/schema";

/**
 * Ata de reunião. Sempre de uma empresa; o projeto é opcional (reunião
 * comercial ou de conta, sem projeto, fica só na empresa).
 */
export const meeting = pgTable(
  "meeting",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .notNull()
      .references(() => crmCompany.id, { onDelete: "restrict" }),
    projectId: uuid().references(() => project.id, { onDelete: "cascade" }),
    title: text().notNull(),
    heldAt: timestamp({ withTimezone: true }).notNull(),
    location: text(),
    agenda: text(),
    discussion: text(),
    decisions: text(),
    // o cliente lê a ata no portal (somente leitura)
    sharedWithClient: boolean().default(false).notNull(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("meeting_project_held_idx").on(t.projectId, t.heldAt),
    index("meeting_company_held_idx").on(t.companyId, t.heldAt),
  ],
);

/** Participante: alguém da equipe (`userId`) ou externo (só nome e empresa). */
export const meetingParticipant = pgTable(
  "meeting_participant",
  {
    id: uuid().primaryKey().defaultRandom(),
    meetingId: uuid()
      .notNull()
      .references(() => meeting.id, { onDelete: "cascade" }),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    name: text().notNull(),
    organization: text(),
    position: integer().default(0).notNull(),
  },
  (t) => [index("meeting_participant_meeting_idx").on(t.meetingId, t.position)],
);

/**
 * Item de ação da ata = uma entrega de projeto. A entrega sobrevive à ata:
 * excluir a ata apaga só o vínculo.
 */
export const meetingActionItem = pgTable(
  "meeting_action_item",
  {
    meetingId: uuid()
      .notNull()
      .references(() => meeting.id, { onDelete: "cascade" }),
    deliverableId: uuid()
      .notNull()
      .references(() => projectDeliverable.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.meetingId, t.deliverableId] }),
    uniqueIndex("meeting_action_item_deliverable_uniq").on(t.deliverableId),
  ],
);
