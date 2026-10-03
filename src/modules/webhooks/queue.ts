/** Enfileira um evento para todos os endpoints ativos inscritos. Nunca lança (falha vira log). */
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookDelivery, webhookEndpoint } from "@/db/schema";
import { logger } from "@/lib/logger";
import type { WebhookEvent } from "./sign";

export async function enqueueWebhook(event: WebhookEvent, data: Record<string, unknown>, opts: { endpointId?: string } = {}): Promise<number> {
  try {
    const endpoints = await db
      .select({ id: webhookEndpoint.id })
      .from(webhookEndpoint)
      .where(and(eq(webhookEndpoint.active, true), opts.endpointId ? eq(webhookEndpoint.id, opts.endpointId) : sql`${webhookEndpoint.events} ? ${event}`));
    if (endpoints.length === 0) return 0;
    const now = new Date();
    const payload = { event, occurredAt: now.toISOString(), data };
    // nextAttemptAt pelo relógio do app (não o do banco): quem processa compara com o mesmo relógio
    await db.insert(webhookDelivery).values(endpoints.map((e) => ({ endpointId: e.id, event, payload, nextAttemptAt: now })));
    return endpoints.length;
  } catch (err) {
    logger.error("webhook.enqueue_failed", { event, err: String(err) });
    return 0;
  }
}
