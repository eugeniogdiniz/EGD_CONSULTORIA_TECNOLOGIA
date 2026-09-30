import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";
import { crmCompany, crmOpportunity } from "@/modules/crm/schema";
import { files } from "@/modules/files/schema";

export const projectStatus = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "delivered",
  "cancelled",
]);

export const projectDeliverableStatus = pgEnum("project_deliverable_status", [
  "todo",
  "doing",
  "review",
  "done",
  "blocked",
]);

/** Prioridade de trabalho, compartilhada por entregas e solicitações. */
export const workPriority = pgEnum("work_priority", ["urgent", "high", "medium", "low"]);

export const project = pgTable(
  "project",
  {
    id: uuid().primaryKey().defaultRandom(),
    opportunityId: uuid()
      .notNull()
      .unique()
      .references(() => crmOpportunity.id, { onDelete: "restrict" }),
    companyId: uuid()
      .notNull()
      .references(() => crmCompany.id, { onDelete: "restrict" }),
    title: text().notNull(),
    status: projectStatus().default("planning").notNull(),
    budgetCents: bigint({ mode: "number" }),
    currency: char({ length: 3 }).default("BRL").notNull(),
    startedAt: date(),
    endedAt: date(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id),
    notes: text(),
    /** Liga a seção de horas no relatório do portal. Nunca expõe valores. */
    showHoursToClient: boolean().default(false).notNull(),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("project_status_idx").on(t.status),
    index("project_company_idx").on(t.companyId),
    index("project_owner_idx").on(t.ownerId),
    index("project_archived_idx")
      .on(t.updatedAt)
      .where(sql`${t.archivedAt} is null`),
  ],
);

export const projectPhase = pgTable(
  "project_phase",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text().notNull(),
    // ordem 0-indexada dentro do projeto; unique parcial garante que não colide
    position: integer().notNull(),
    startedAt: date(),
    endedAt: date(),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("project_phase_project_idx").on(t.projectId, t.position),
    uniqueIndex("project_phase_position_uniq").on(t.projectId, t.position),
  ],
);

export const projectMilestone = pgTable(
  "project_milestone",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    // fase opcional — o marco pode ser do projeto todo
    phaseId: uuid().references(() => projectPhase.id, { onDelete: "set null" }),
    name: text().notNull(),
    dueAt: date().notNull(),
    completedAt: timestamp({ withTimezone: true }),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("project_milestone_project_due_idx").on(t.projectId, t.dueAt),
    index("project_milestone_pending_idx")
      .on(t.dueAt)
      .where(sql`${t.completedAt} is null`),
  ],
);

export const projectDeliverable = pgTable(
  "project_deliverable",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    phaseId: uuid().references(() => projectPhase.id, { onDelete: "set null" }),
    title: text().notNull(),
    description: text(),
    status: projectDeliverableStatus().default("todo").notNull(),
    priority: workPriority().default("medium").notNull(),
    // ordem dentro da coluna do kanban; menor = mais em cima
    position: integer().default(0).notNull(),
    assigneeId: uuid().references(() => users.id, { onDelete: "set null" }),
    dueAt: date(),
    completedAt: timestamp({ withTimezone: true }),
    fileId: uuid().references(() => files.id, { onDelete: "set null" }),
    // reservado para a Fase 4 (portal do cliente); não usado na Fase 3
    visibleToClient: boolean().default(false).notNull(),
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
    index("project_deliverable_project_idx").on(t.projectId),
    index("project_deliverable_priority_idx").on(t.priority),
    index("project_deliverable_status_position_idx").on(t.projectId, t.status, t.position),
    index("project_deliverable_due_idx")
      .on(t.dueAt)
      .where(sql`${t.status} <> 'done'`),
    index("project_deliverable_assignee_idx")
      .on(t.assigneeId)
      .where(sql`${t.status} <> 'done'`),
  ],
);
