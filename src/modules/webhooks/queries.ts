import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookDelivery, webhookEndpoint } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";

/** Nunca devolve o segredo: a listagem mostra só o prefixo. */
export async function listWebhooks(_ctx: AdminContext) {
  const rows = await db
    .select({ id: webhookEndpoint.id, name: webhookEndpoint.name, url: webhookEndpoint.url, secret: webhookEndpoint.secret, events: webhookEndpoint.events, active: webhookEndpoint.active, failureCount: webhookEndpoint.failureCount, lastDeliveryAt: webhookEndpoint.lastDeliveryAt, createdAt: webhookEndpoint.createdAt })
    .from(webhookEndpoint)
    .orderBy(desc(webhookEndpoint.createdAt));
  return rows.map(({ secret, ...r }) => ({ ...r, secretPrefix: `${secret.slice(0, 10)}…` }));
}

export async function getWebhook(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const row = await db.query.webhookEndpoint.findFirst({ where: eq(webhookEndpoint.id, id), columns: { secret: false } });
  return row ?? null;
}

export function listDeliveries(_ctx: AdminContext, endpointId: string, limit = 30) {
  if (!isUuid(endpointId)) return Promise.resolve([]);
  return db
    .select({ id: webhookDelivery.id, event: webhookDelivery.event, status: webhookDelivery.status, attempts: webhookDelivery.attempts, responseStatus: webhookDelivery.responseStatus, error: webhookDelivery.error, nextAttemptAt: webhookDelivery.nextAttemptAt, createdAt: webhookDelivery.createdAt, deliveredAt: webhookDelivery.deliveredAt, payload: webhookDelivery.payload })
    .from(webhookDelivery)
    .where(eq(webhookDelivery.endpointId, endpointId))
    .orderBy(desc(webhookDelivery.createdAt))
    .limit(limit);
}
