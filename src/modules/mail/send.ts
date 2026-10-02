import { transporter } from "@/lib/mail";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { renderInvitation, renderPasswordReset, renderLeadNotification, renderClientCommentNotification, renderRequestNotification, type MailContent } from "./templates";

/**
 * Entrega um e-mail. Nunca lança: falha de SMTP é registrada no log e o
 * fluxo principal (convite, lead, reset) continua. Devolve se foi entregue
 * ao SMTP, para as automações contarem enviados e falhas.
 */
async function deliver(to: string, m: MailContent): Promise<boolean> {
  try {
    await transporter.sendMail({ from: env.MAIL_FROM, to, ...m });
    return true;
  } catch (err) {
    logger.error("mail.failed", { to, subject: m.subject, err: String(err) });
    return false;
  }
}

/** Envio de um e-mail já renderizado (resumos das automações). */
export const sendDigest = (to: string, m: MailContent) => deliver(to, m);

export const sendInvitationEmail = (p: { to: string; organizationName: string; acceptUrl: string }) =>
  deliver(p.to, renderInvitation(p));

export const sendPasswordResetEmail = (p: { to: string; url: string }) => deliver(p.to, renderPasswordReset(p));

export const sendLeadNotification = (p: { name: string; email: string; company: string | null; message: string }) =>
  deliver(env.ADMIN_NOTIFY_EMAIL, renderLeadNotification(p));

export const sendClientCommentNotification = (p: Parameters<typeof renderClientCommentNotification>[0]) =>
  deliver(env.ADMIN_NOTIFY_EMAIL, renderClientCommentNotification(p));

/** `to` = equipe (ADMIN_NOTIFY_EMAIL) quando omitido; passe o e-mail do autor para avisar o cliente. */
export const sendRequestNotification = (p: Parameters<typeof renderRequestNotification>[0] & { to?: string }) =>
  deliver(p.to ?? env.ADMIN_NOTIFY_EMAIL, renderRequestNotification(p));
