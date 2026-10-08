import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";
import { files } from "@/modules/files/schema";
import { crmProposal } from "@/modules/crm/schema";

/**
 * Contrato de prestação de serviços gerado a partir da proposta aceita (Fase 23).
 * Um por proposta. `document` guarda os campos editáveis do modelo do kit;
 * o PDF é versionado e vira arquivo interno (`file_id`).
 * draft → issued (edição bloqueada, visível ao cliente) → signed (data).
 */
export const crmContract = pgTable(
  "crm_contract",
  {
    id: uuid().primaryKey().defaultRandom(),
    // CT-AA-NNN, gerado por crm_next_contract_number(y)
    number: text().notNull().unique(),
    proposalId: uuid()
      .notNull()
      .unique()
      .references(() => crmProposal.id, { onDelete: "cascade" }),
    status: text({ enum: ["draft", "issued", "signed"] }).default("draft").notNull(),
    document: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    documentVersion: integer().default(0).notNull(),
    fileId: uuid().references(() => files.id, { onDelete: "set null" }),
    issuedAt: timestamp({ withTimezone: true }),
    signedAt: timestamp({ withTimezone: true }),
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("crm_contract_status_idx").on(t.status)],
);
