import { sql } from "drizzle-orm";
import { bigint, char, check, date, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";
import { files } from "@/modules/files/schema";
import { organizations } from "@/modules/tenancy/schema";

export const crmCompanySource = pgEnum("crm_company_source", [
  "site_contact",
  "referral",
  "event",
  "outbound",
  "other",
]);

export const crmContactRole = pgEnum("crm_contact_role", [
  "primary",
  "technical",
  "financial",
  "other",
]);

export const crmOpportunityStage = pgEnum("crm_opportunity_stage", [
  "new",
  "qualified",
  "meeting",
  "proposal",
  "won",
  "lost",
]);

export const crmInteractionType = pgEnum("crm_interaction_type", [
  "call",
  "email",
  "meeting",
  "note",
]);

export const crmProposalStatus = pgEnum("crm_proposal_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
]);

export const crmCompany = pgTable(
  "crm_company",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    cnpj: text().unique(),
    website: text(),
    industry: text(),
    size: text(),
    source: crmCompanySource().default("outbound").notNull(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id),
    notes: text(),
    archivedAt: timestamp({ withTimezone: true }),
    // preenchido quando a empresa vira cliente com acesso ao portal
    linkedOrganizationId: uuid().references(() => organizations.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("crm_company_owner_idx").on(t.ownerId),
    index("crm_company_archived_idx")
      .on(t.updatedAt)
      .where(sql`${t.archivedAt} is null`),
    index("crm_company_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`),
  ],
);

export const crmContact = pgTable(
  "crm_contact",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .notNull()
      .references(() => crmCompany.id, { onDelete: "cascade" }),
    name: text().notNull(),
    email: text(),
    phone: text(),
    role: crmContactRole().default("primary").notNull(),
    title: text(),
    notes: text(),
    archivedAt: timestamp({ withTimezone: true }),
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
    index("crm_contact_company_idx").on(t.companyId),
    index("crm_contact_email_trgm").using("gin", sql`${t.email} gin_trgm_ops`),
    index("crm_contact_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`),
    // no máximo um contato principal ativo por empresa
    uniqueIndex("crm_contact_primary_uniq")
      .on(t.companyId)
      .where(sql`${t.role} = 'primary' and ${t.archivedAt} is null`),
  ],
);

export const crmOpportunity = pgTable(
  "crm_opportunity",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .notNull()
      .references(() => crmCompany.id, { onDelete: "cascade" }),
    primaryContactId: uuid().references(() => crmContact.id, {
      onDelete: "set null",
    }),
    title: text().notNull(),
    stage: crmOpportunityStage().default("new").notNull(),
    valueCents: bigint({ mode: "number" }),
    currency: char({ length: 3 }).default("BRL").notNull(),
    expectedCloseAt: date(),
    nextStep: text(),
    nextStepAt: date(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id),
    wonAt: timestamp({ withTimezone: true }),
    lostAt: timestamp({ withTimezone: true }),
    lostReason: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("crm_opportunity_stage_idx").on(t.stage),
    index("crm_opportunity_company_idx").on(t.companyId),
    index("crm_opportunity_owner_idx").on(t.ownerId),
    index("crm_opportunity_next_step_idx")
      .on(t.nextStepAt)
      .where(sql`${t.stage} not in ('won', 'lost')`),
  ],
);

export const crmInteraction = pgTable(
  "crm_interaction",
  {
    id: uuid().primaryKey().defaultRandom(),
    type: crmInteractionType().notNull(),
    at: timestamp({ withTimezone: true }).notNull(),
    byUserId: uuid()
      .notNull()
      .references(() => users.id),
    summary: text().notNull(),
    body: text(),
    companyId: uuid().references(() => crmCompany.id, { onDelete: "cascade" }),
    contactId: uuid().references(() => crmContact.id, { onDelete: "set null" }),
    opportunityId: uuid().references(() => crmOpportunity.id, {
      onDelete: "cascade",
    }),
    // soft delete: interação some da timeline mas fica na tabela para auditoria
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("crm_interaction_company_at_idx").on(t.companyId, t.at.desc()),
    index("crm_interaction_opportunity_at_idx").on(t.opportunityId, t.at.desc()),
    index("crm_interaction_contact_at_idx").on(t.contactId, t.at.desc()),
    check(
      "crm_interaction_has_anchor",
      sql`coalesce(${t.companyId}, ${t.opportunityId}, ${t.contactId}) is not null`,
    ),
  ],
);

export const crmProposal = pgTable(
  "crm_proposal",
  {
    id: uuid().primaryKey().defaultRandom(),
    // formato PROP-YY-seq, gerado por crm_next_proposal_number(y)
    number: text().notNull().unique(),
    opportunityId: uuid()
      .notNull()
      .references(() => crmOpportunity.id, { onDelete: "cascade" }),
    title: text().notNull(),
    valueCents: bigint({ mode: "number" }).notNull(),
    currency: char({ length: 3 }).default("BRL").notNull(),
    status: crmProposalStatus().default("draft").notNull(),
    sentAt: timestamp({ withTimezone: true }),
    validUntil: date(),
    decidedAt: timestamp({ withTimezone: true }),
    decisionNotes: text(),
    fileId: uuid().references(() => files.id, { onDelete: "set null" }),
    // Fase 16: documento da proposta (seções do modelo do kit), versão do PDF gerado, contato e envio
    document: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    documentVersion: integer().default(0).notNull(),
    contactId: uuid().references(() => crmContact.id, { onDelete: "set null" }),
    emailedAt: timestamp({ withTimezone: true }),
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
    index("crm_proposal_opportunity_idx").on(t.opportunityId),
    index("crm_proposal_status_idx").on(t.status),
  ],
);

/** Catálogo de serviços da EGD (Fase 19): preço de referência para montar o investimento da proposta. */
export const crmService = pgTable(
  "crm_service",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    description: text(),
    unit: text().default("projeto").notNull(),
    defaultPriceCents: bigint({ mode: "number" }).notNull(),
    active: boolean().default(true).notNull(),
    position: integer().default(0).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("crm_service_active_position_idx").on(t.active, t.position)],
);
