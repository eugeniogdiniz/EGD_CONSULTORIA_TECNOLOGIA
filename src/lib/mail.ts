import nodemailer from "nodemailer";
import { env } from "@/lib/env";

/** Transporter SMTP único do processo (Hostinger em produção, Mailpit em dev). */
export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});
