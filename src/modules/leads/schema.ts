import { pgTable, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const leadStatus = pgEnum("lead_status", ["new", "seen"]);

export const leads = pgTable("leads", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull(),
  company: text(),
  phone: text(),
  message: text().notNull(),
  source: text().default("site_contact").notNull(),
  status: leadStatus().default("new").notNull(),
  ipHash: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
