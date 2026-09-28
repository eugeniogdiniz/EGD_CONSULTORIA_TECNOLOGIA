import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";
import { project, projectDeliverable } from "./schema";

// Enums ─────────────────────────────────────────────────────────────────────

export const projectExpenseKind = pgEnum("project_expense_kind", [
  "travel",
  "service",
  "equipment",
  "other",
]);

export const projectTimeSource = pgEnum("project_time_source", ["timer", "manual"]);

// Dependências entre entregas ───────────────────────────────────────────────

export const projectDeliverableDependency = pgTable(
  "project_deliverable_dependency",
  {
    predecessorId: uuid()
      .notNull()
      .references(() => projectDeliverable.id, { onDelete: "cascade" }),
    successorId: uuid()
      .notNull()
      .references(() => projectDeliverable.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.predecessorId, t.successorId] }),
    check("dep_no_self", sql`${t.predecessorId} <> ${t.successorId}`),
    index("dep_successor_idx").on(t.successorId),
  ],
);

// Comentários por entrega ───────────────────────────────────────────────────

export const projectDeliverableComment = pgTable(
  "project_deliverable_comment",
  {
    id: uuid().primaryKey().defaultRandom(),
    deliverableId: uuid()
      .notNull()
      .references(() => projectDeliverable.id, { onDelete: "cascade" }),
    parentId: uuid(),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    body: text().notNull(),
    // soft delete pra preservar a thread; textos ocultados na leitura
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("comment_deliverable_created_idx").on(t.deliverableId, t.createdAt),
  ],
);

// Horas trabalhadas ─────────────────────────────────────────────────────────

export const projectTimeEntry = pgTable(
  "project_time_entry",
  {
    id: uuid().primaryKey().defaultRandom(),
    deliverableId: uuid()
      .notNull()
      .references(() => projectDeliverable.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    startedAt: timestamp({ withTimezone: true }).notNull(),
    endedAt: timestamp({ withTimezone: true }),
    // ceil((endedAt - startedAt)/60000); null enquanto aberto
    minutes: integer(),
    source: projectTimeSource().notNull(),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("time_deliverable_idx").on(t.deliverableId, t.startedAt.desc()),
    // no máximo um timer aberto por usuário
    uniqueIndex("time_user_open_uniq")
      .on(t.userId)
      .where(sql`${t.endedAt} is null`),
    check("time_end_after_start", sql`${t.endedAt} is null or ${t.endedAt} > ${t.startedAt}`),
  ],
);

// Despesas do projeto ───────────────────────────────────────────────────────

export const projectExpense = pgTable(
  "project_expense",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    description: text().notNull(),
    amountCents: bigint({ mode: "number" }).notNull(),
    kind: projectExpenseKind().default("other").notNull(),
    dateAt: date().notNull(),
    notes: text(),
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("expense_project_date_idx").on(t.projectId, t.dateAt.desc()),
    check("expense_amount_positive", sql`${t.amountCents} >= 0`),
  ],
);

// Templates de projeto ──────────────────────────────────────────────────────

export const projectTemplate = pgTable("project_template", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  description: text(),
  ownerId: uuid()
    .notNull()
    .references(() => users.id),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const projectTemplatePhase = pgTable(
  "project_template_phase",
  {
    id: uuid().primaryKey().defaultRandom(),
    templateId: uuid()
      .notNull()
      .references(() => projectTemplate.id, { onDelete: "cascade" }),
    name: text().notNull(),
    position: integer().notNull(),
    notes: text(),
  },
  (t) => [
    uniqueIndex("template_phase_position_uniq").on(t.templateId, t.position),
  ],
);

export const projectTemplateDeliverable = pgTable(
  "project_template_deliverable",
  {
    id: uuid().primaryKey().defaultRandom(),
    templateId: uuid()
      .notNull()
      .references(() => projectTemplate.id, { onDelete: "cascade" }),
    phaseId: uuid().references(() => projectTemplatePhase.id, { onDelete: "set null" }),
    title: text().notNull(),
    description: text(),
    position: integer().default(0).notNull(),
  },
  (t) => [
    index("template_deliverable_template_idx").on(t.templateId),
  ],
);
