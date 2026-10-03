import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { webhookEndpoint } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { generateWebhookSecret, isWebhookEvent, WEBHOOK_EVENTS } from "./sign";
import { enqueueWebhook } from "./queue";
import { deliverOne, requeueDelivery } from "./deliver";

export const webhookSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  url: z.url("URL inválida").refine((u) => u.startsWith("https://") || process.env.NODE_ENV !== "production", "Use https:// em produção"),
  events: z.array(z.string()).min(1, "Escolha ao menos um evento.").refine((l) => l.every(isWebhookEvent), "Evento desconhecido."),
});
export type WebhookInput = z.input<typeof webhookSchema>;

/** Devolve o segredo em claro UMA vez na tela (ele fica gravado só para assinar). */
export async function createWebhook(ctx: AdminContext, input: WebhookInput): Promise<ActionResult<{ id: string; secret: string }>> {
  const parsed = webhookSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const secret = generateWebhookSecret();
  const events = [...new Set(parsed.data.events)].filter((e) => e !== "ping");
  const [row] = await db.insert(webhookEndpoint).values({ name: parsed.data.name, url: parsed.data.url, secret, events, createdBy: ctx.user.id }).returning({ id: webhookEndpoint.id });
  await audit({ actorId: ctx.user.id, action: "webhook.created", entityType: "webhook_endpoint", entityId: row.id, metadata: { url: parsed.data.url, events } });
  return ok({ id: row.id, secret });
}

export async function updateWebhook(ctx: AdminContext, id: string, input: WebhookInput): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Webhook não encontrado.");
  const parsed = webhookSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const events = [...new Set(parsed.data.events)].filter((e) => e !== "ping");
  const [row] = await db.update(webhookEndpoint).set({ name: parsed.data.name, url: parsed.data.url, events }).where(eq(webhookEndpoint.id, id)).returning({ id: webhookEndpoint.id });
  if (!row) return fail("Webhook não encontrado.");
  await audit({ actorId: ctx.user.id, action: "webhook.updated", entityType: "webhook_endpoint", entityId: id, metadata: { url: parsed.data.url, events } });
  return ok(null);
}

export async function setWebhookActive(ctx: AdminContext, id: string, active: boolean): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Webhook não encontrado.");
  const [row] = await db.update(webhookEndpoint).set({ active, ...(active ? { failureCount: 0 } : {}) }).where(eq(webhookEndpoint.id, id)).returning({ id: webhookEndpoint.id });
  if (!row) return fail("Webhook não encontrado.");
  await audit({ actorId: ctx.user.id, action: active ? "webhook.reactivated" : "webhook.deactivated", entityType: "webhook_endpoint", entityId: id });
  return ok(null);
}

/** Enfileira um `ping` só para este endpoint e tenta entregar na hora. */
export async function testWebhook(ctx: AdminContext, id: string): Promise<ActionResult<{ ok: boolean; status: number | null; error: string | null }>> {
  if (!isUuid(id)) return fail("Webhook não encontrado.");
  const ep = await db.query.webhookEndpoint.findFirst({ where: eq(webhookEndpoint.id, id), columns: { id: true, active: true } });
  if (!ep) return fail("Webhook não encontrado.");
  if (!ep.active) return fail("Reative o webhook antes de testar.");
  const n = await enqueueWebhook("ping", { message: "Teste enviado pela tela de API da EGD", by: ctx.user.name }, { endpointId: id });
  if (n === 0) return fail("Não foi possível enfileirar o teste.");
  const [latest] = await db.select({ id: webhookEndpoint.id }).from(webhookEndpoint).where(eq(webhookEndpoint.id, id)).limit(1);
  void latest;
  const { webhookDelivery } = await import("@/db/schema");
  const { and, desc } = await import("drizzle-orm");
  const [d] = await db.select({ id: webhookDelivery.id }).from(webhookDelivery).where(and(eq(webhookDelivery.endpointId, id), eq(webhookDelivery.event, "ping"), eq(webhookDelivery.status, "pending"))).orderBy(desc(webhookDelivery.createdAt)).limit(1);
  const r = d ? await deliverOne(d.id) : null;
  await audit({ actorId: ctx.user.id, action: "webhook.tested", entityType: "webhook_endpoint", entityId: id, metadata: { ok: r?.ok ?? false, status: r?.status ?? null } });
  return ok({ ok: r?.ok ?? false, status: r?.status ?? null, error: r?.error ?? null });
}

export async function resendDelivery(ctx: AdminContext, deliveryId: string): Promise<ActionResult<null>> {
  if (!isUuid(deliveryId)) return fail("Entrega não encontrada.");
  const queued = await requeueDelivery(deliveryId);
  if (!queued) return fail("Entrega não encontrada ou já entregue.");
  await deliverOne(deliveryId);
  await audit({ actorId: ctx.user.id, action: "webhook.resent", entityType: "webhook_delivery", entityId: deliveryId });
  return ok(null);
}

export { WEBHOOK_EVENTS };
