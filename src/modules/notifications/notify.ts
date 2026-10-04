/**
 * Disparo único de notificação: grava uma linha por destinatário e manda o
 * e-mail a quem tem a preferência do tipo ligada. Nunca lança: a action que
 * chamou já fez o trabalho dela; falha aqui vira log.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { notification, notificationPreference } from "@/db/schema";
import { logger } from "@/lib/logger";
import { sendMail } from "@/modules/mail/send";
import type { MailContent } from "@/modules/mail/templates";
import { getKind, pickEmailRecipients, type KindKey, type Recipient } from "./kinds";

export type NotifyInput = {
  kind: KindKey;
  title: string;
  body?: string | null;
  /** caminho relativo (ex.: /admin/solicitacoes/<id>) */
  url: string;
  entity?: { type: string; id: string };
  organizationId?: string | null;
  recipients: Recipient[];
  /** quem causou o evento: nunca recebe a própria notificação */
  excludeUserId?: string | null;
  /** e-mail a enviar a cada destinatário com a preferência ligada; a função pode devolver null para pular alguém */
  mail?: MailContent | ((r: Recipient) => MailContent | null);
};

export type NotifyResult = { inApp: number; emailed: number; failed: number };

export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const result: NotifyResult = { inApp: 0, emailed: 0, failed: 0 };
  try {
    const recipients = dedupe(input.recipients.filter((r) => r.id !== input.excludeUserId));
    if (recipients.length === 0) return result;

    await db.insert(notification).values(
      recipients.map((r) => ({
        userId: r.id,
        kind: input.kind,
        title: input.title.slice(0, 200),
        body: input.body ? input.body.slice(0, 1000) : null,
        url: input.url,
        entityType: input.entity?.type ?? null,
        entityId: input.entity?.id ?? null,
        organizationId: input.organizationId ?? null,
      })),
    );
    result.inApp = recipients.length;

    if (!input.mail || !getKind(input.kind).emailable) return result;
    const prefs = await db
      .select({ userId: notificationPreference.userId, kind: notificationPreference.kind, email: notificationPreference.email })
      .from(notificationPreference)
      .where(and(eq(notificationPreference.kind, input.kind), inArray(notificationPreference.userId, recipients.map((r) => r.id))));
    for (const r of pickEmailRecipients(recipients, prefs, input.kind)) {
      const content = typeof input.mail === "function" ? input.mail(r) : input.mail;
      if (!content) continue;
      if (await sendMail(r.email, content)) result.emailed++;
      else result.failed++;
    }
    return result;
  } catch (err) {
    logger.error("notify.failed", { kind: input.kind, err: String(err) });
    return result;
  }
}

function dedupe(list: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  return list.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}
