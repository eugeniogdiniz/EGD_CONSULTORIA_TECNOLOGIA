import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";

/** Chaves de API. O segredo nunca é gravado: só o sha256 (`keyHash`) e um prefixo para identificação. */
export const apiKey = pgTable(
  "api_key",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    prefix: text().notNull(),
    keyHash: text().notNull().unique(),
    scopes: jsonb().$type<string[]>().default([]).notNull(),
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    lastUsedAt: timestamp({ withTimezone: true }),
    /** Fase 21: validade; nulo = sem expiração (chaves antigas) */
    expiresAt: timestamp({ withTimezone: true }),
    /** revogação pode ser agendada (rotação mantém a antiga por 7 dias) */
    revokedAt: timestamp({ withTimezone: true }),
    /** chave que substituiu esta numa rotação */
    rotatedToId: uuid(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("api_key_created_idx").on(t.createdAt)],
);
