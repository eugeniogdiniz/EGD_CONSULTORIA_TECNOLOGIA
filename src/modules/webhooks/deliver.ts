/**
 * Entrega das filas de webhook: POST assinado, até 5 tentativas com backoff;
 * 20 falhas seguidas desativam o endpoint e avisam o dono. Chamado pelo tique
 * do agendador e por "Testar" na tela.
 */
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookDelivery, webhookEndpoint } from "@/db/schema";
import { logger } from "@/lib/logger";
import { DISABLE_AFTER_FAILURES, nextAttemptAt, signWebhook } from "./sign";

const TIMEOUT_MS = 10_000;

export type DeliveryResult = { id: string; ok: boolean; status: number | null; error: string | null };

async function post(url: string, secret: string, event: string, deliveryId: string, body: string): Promise<{ ok: boolean; status: number | null; error: string | null }> {
  const ts = Math.floor(Date.now() / 1000);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "EGD-Webhooks/1", "x-egd-event": event, "x-egd-delivery": deliveryId, "x-egd-timestamp": String(ts), "x-egd-signature": signWebhook(secret, ts, body) },
      body,
      signal: ctrl.signal,
      redirect: "manual",
    });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, error: res.status >= 200 && res.status < 300 ? null : `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, status: null, error: (err instanceof Error ? err.message : String(err)).slice(0, 500) };
  } finally {
    clearTimeout(timer);
  }
}

export async function deliverOne(deliveryId: string, now = new Date()): Promise<DeliveryResult | null> {
  const [d] = await db
    .select({ id: webhookDelivery.id, event: webhookDelivery.event, payload: webhookDelivery.payload, attempts: webhookDelivery.attempts, endpointId: webhookEndpoint.id, url: webhookEndpoint.url, secret: webhookEndpoint.secret, failureCount: webhookEndpoint.failureCount, active: webhookEndpoint.active })
    .from(webhookDelivery)
    .innerJoin(webhookEndpoint, eq(webhookDelivery.endpointId, webhookEndpoint.id))
    .where(and(eq(webhookDelivery.id, deliveryId), eq(webhookDelivery.status, "pending")))
    .limit(1);
  if (!d) return null;
  const body = JSON.stringify({ id: d.id, ...d.payload });
  const r = await post(d.url, d.secret, d.event, d.id, body);
  const attempts = d.attempts + 1;
  if (r.ok) {
    await db.update(webhookDelivery).set({ status: "ok", attempts, responseStatus: r.status, error: null, deliveredAt: now }).where(eq(webhookDelivery.id, d.id));
    await db.update(webhookEndpoint).set({ failureCount: 0, lastDeliveryAt: now }).where(eq(webhookEndpoint.id, d.endpointId));
    return { id: d.id, ok: true, status: r.status, error: null };
  }
  const next = nextAttemptAt(attempts, now);
  await db
    .update(webhookDelivery)
    .set({ status: next ? "pending" : "failed", attempts, responseStatus: r.status, error: r.error, nextAttemptAt: next ?? now })
    .where(eq(webhookDelivery.id, d.id));
  const failures = d.failureCount + 1;
  const disable = failures >= DISABLE_AFTER_FAILURES && d.active;
  await db.update(webhookEndpoint).set({ failureCount: failures, lastDeliveryAt: now, ...(disable ? { active: false } : {}) }).where(eq(webhookEndpoint.id, d.endpointId));
  if (disable) {
    logger.warn("webhook.endpoint_disabled", { endpointId: d.endpointId, failures });
    const { notifyWebhookDisabled } = await import("@/modules/notifications/events");
    await notifyWebhookDisabled({ endpointId: d.endpointId, url: d.url, failures });
  }
  return { id: d.id, ok: false, status: r.status, error: r.error };
}

/** Entregas pendentes devidas, até `limit` por tique. */
export async function processWebhookDeliveries(now = new Date(), limit = 50): Promise<{ processed: number; ok: number }> {
  let processed = 0;
  let ok = 0;
  try {
    const due = await db
      .select({ id: webhookDelivery.id })
      .from(webhookDelivery)
      .innerJoin(webhookEndpoint, eq(webhookDelivery.endpointId, webhookEndpoint.id))
      .where(and(eq(webhookDelivery.status, "pending"), lte(webhookDelivery.nextAttemptAt, now), eq(webhookEndpoint.active, true)))
      .orderBy(webhookDelivery.nextAttemptAt)
      .limit(limit);
    for (const d of due) {
      const r = await deliverOne(d.id, now);
      if (r) {
        processed++;
        if (r.ok) ok++;
      }
    }
  } catch (err) {
    logger.error("webhook.process_failed", { err: String(err) });
  }
  return { processed, ok };
}

/** Entregas pendentes/falhas de um endpoint podem ser reenfileiradas pela tela. */
export async function requeueDelivery(deliveryId: string, now = new Date()): Promise<boolean> {
  const rows = await db.update(webhookDelivery).set({ status: "pending", nextAttemptAt: now }).where(and(eq(webhookDelivery.id, deliveryId), sql`${webhookDelivery.status} <> 'ok'`)).returning({ id: webhookDelivery.id });
  return rows.length > 0;
}
