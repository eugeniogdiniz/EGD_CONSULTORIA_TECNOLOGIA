import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

/** Configurações do sistema editáveis pelo dono (chave → valor JSON). Sem linha = padrão em código. */
export const appSetting = pgTable("app_setting", {
  key: text().primaryKey(),
  value: jsonb().$type<unknown>().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid(),
});
