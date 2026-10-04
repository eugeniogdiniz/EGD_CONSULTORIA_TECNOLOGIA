/** Assinatura dos webhooks de saída: HMAC-SHA256 do "timestamp.body" com o segredo do endpoint. Puro. */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const WEBHOOK_EVENTS = ["lead.created", "request.created", "proposal.sent", "proposal.accepted", "project.deliverable.done", "invoice.paid", "ping"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
export const isWebhookEvent = (v: string): v is WebhookEvent => (WEBHOOK_EVENTS as readonly string[]).includes(v);
export const EVENT_LABEL: Record<WebhookEvent, string> = {
  "lead.created": "Lead recebido (site ou API)",
  "request.created": "Solicitação aberta no portal",
  "proposal.sent": "Proposta enviada",
  "proposal.accepted": "Proposta aceita",
  "project.deliverable.done": "Entrega concluída",
  "invoice.paid": "Parcela paga",
  ping: "Teste (ping)",
};

export const generateWebhookSecret = () => `whsec_${randomBytes(24).toString("base64url")}`;

export function signWebhook(secret: string, timestamp: number, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

/** Verificação do lado de quem recebe (documentada para integradores); tolera 5 min de relógio. */
export function verifyWebhook(secret: string, timestamp: number, body: string, signature: string, now = Date.now(), toleranceMs = 5 * 60_000): boolean {
  if (Math.abs(now - timestamp * 1000) > toleranceMs) return false;
  const expected = signWebhook(secret, timestamp, body);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Minutos de espera antes da tentativa `attempt + 1` (1, 5, 15, 60, 180). */
export const RETRY_MINUTES = [1, 5, 15, 60, 180] as const;
export const MAX_ATTEMPTS = RETRY_MINUTES.length;
export const DISABLE_AFTER_FAILURES = 20;

export function nextAttemptAt(attemptsDone: number, now: Date): Date | null {
  if (attemptsDone >= MAX_ATTEMPTS) return null;
  return new Date(now.getTime() + RETRY_MINUTES[attemptsDone - 1] * 60_000);
}
