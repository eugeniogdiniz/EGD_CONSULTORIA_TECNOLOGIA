import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "@/modules/auth/schema";

/** Destino de webhooks de saída (Fase 21). O segredo fica em claro só para assinar (HMAC); nunca sai pela API. */
export const webhookEndpoint = pgTable(
  "webhook_endpoint",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    url: text().notNull(),
    secret: text().notNull(),
    events: jsonb().$type<string[]>().default([]).notNull(),
    active: boolean().default(true).notNull(),
    failureCount: integer().default(0).notNull(),
    lastDeliveryAt: timestamp({ withTimezone: true }),
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("webhook_endpoint_active_idx").on(t.active)],
);

export const webhookDelivery = pgTable(
  "webhook_delivery",
  {
    id: uuid().primaryKey().defaultRandom(),
    endpointId: uuid()
      .notNull()
      .references(() => webhookEndpoint.id, { onDelete: "cascade" }),
    event: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    status: text({ enum: ["pending", "ok", "failed"] }).default("pending").notNull(),
    attempts: integer().default(0).notNull(),
    nextAttemptAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    responseStatus: integer(),
    error: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index("webhook_delivery_pending_idx").on(t.nextAttemptAt).where(sql`${t.status} = 'pending'`),
    index("webhook_delivery_endpoint_idx").on(t.endpointId, t.createdAt.desc()),
  ],
);
