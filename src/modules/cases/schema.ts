import { bigint, boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const siteCaseSize = pgEnum("site_case_size", ["micro", "small", "medium", "large"]);

/** Cases exibidos no site público (/cases, home, /sobre). Valores monetários em centavos de BRL. */
export const siteCase = pgTable(
  "site_case",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    sector: text().notNull(),
    size: siteCaseSize().notNull(),
    systems: integer().default(0).notNull(),
    automations: integer().default(0).notNull(),
    savingsCents: bigint({ mode: "number" }).default(0).notNull(),
    capexCents: bigint({ mode: "number" }).default(0).notNull(),
    featured: boolean().default(false).notNull(),
    published: boolean().default(true).notNull(),
    deliverables: jsonb().$type<string[]>().default([]).notNull(),
    // ex.: "Em desenvolvimento"; vazio = em produção
    statusNote: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("site_case_published_idx").on(t.published, t.savingsCents)],
);
