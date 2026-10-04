import { pgTable, text, timestamp, uuid, boolean, index, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "@/modules/auth/schema";

/** Uma linha por destinatário: o mesmo evento vira N notificações. `url` é relativa ao site. */
export const notification = pgTable(
  "notification",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text().notNull(),
    title: text().notNull(),
    body: text(),
    url: text().notNull(),
    entityType: text(),
    entityId: text(),
    organizationId: uuid(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("notification_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("notification_user_unread_idx")
      .on(t.userId)
      .where(sql`${t.readAt} is null`),
  ],
);

/** Preferência de e-mail por tipo. Sem linha = e-mail ligado. */
export const notificationPreference = pgTable(
  "notification_preference",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text().notNull(),
    email: boolean().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind] })],
);
