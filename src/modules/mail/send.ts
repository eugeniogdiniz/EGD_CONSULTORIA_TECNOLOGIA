import { transporter } from "@/lib/mail";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { renderInvitation, renderPasswordReset, renderLeadNotification, type MailContent } from "./templates";

/**
 * Entrega um e-mail. Nunca lança: falha de SMTP é registrada no log e o
 * fluxo principal (convite, lead, reset) continua.
 */
async function deliver(to: string, m: MailContent): Promise<void> {
  try {
    await transporter.sendMail({ from: env.MAIL_FROM, to, ...m });
  } catch (err) {
    logger.error("mail.failed", { to, subject: m.subject, err: String(err) });
  }
}

export const sendInvitationEmail = (p: { to: string; organizationName: string; acceptUrl: string }) =>
  deliver(p.to, renderInvitation(p));

export const sendPasswordResetEmail = (p: { to: string; url: string }) => deliver(p.to, renderPasswordReset(p));

export const sendLeadNotification = (p: { name: string; email: string; company: string | null; message: string }) =>
  deliver(env.ADMIN_NOTIFY_EMAIL, renderLeadNotification(p));
