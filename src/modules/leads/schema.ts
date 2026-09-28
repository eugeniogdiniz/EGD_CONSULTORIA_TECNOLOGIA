import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";
import { crmCompany, crmContact, crmOpportunity } from "@/modules/crm/schema";

export const leadStatus = pgEnum("lead_status", ["new", "seen", "converted"]);

export const leads = pgTable(
  "leads",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull(),
    company: text(),
    phone: text(),
    message: text().notNull(),
    source: text().default("site_contact").notNull(),
    status: leadStatus().default("new").notNull(),
    ipHash: text().notNull(),
    // preenchidos quando o admin converte o lead em CRM (Fase 2)
    convertedCompanyId: uuid().references(() => crmCompany.id, { onDelete: "set null" }),
    convertedContactId: uuid().references(() => crmContact.id, { onDelete: "set null" }),
    convertedOpportunityId: uuid().references(() => crmOpportunity.id, { onDelete: "set null" }),
    convertedAt: timestamp({ withTimezone: true }),
    convertedBy: uuid().references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("leads_converted_at_idx").on(t.convertedAt)],
);
