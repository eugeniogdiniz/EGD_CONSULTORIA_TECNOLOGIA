/**
 * As automações. Cada uma declara agenda, destinatário, `run` (executa e
 * devolve um resumo curto) e `preview` (o que seria feito agora, sem efeito).
 * O `JobContext` traz `now`/`today` injetados para o runner e os testes.
 */
import { env } from "@/lib/env";
import { sendDigest } from "@/modules/mail/send";
import { renderDailyDigest, renderWeeklyClient, renderWeeklyTeam } from "@/modules/mail/digests";
import { formatBr } from "@/modules/reports/dates";
import type { Schedule } from "./schedule";
import { expireProposals, loadExpirableProposals, proposalsToExpire } from "./digests/proposals";
import { buildDailyDigest, loadDailyDigestInput } from "./digests/daily";
import { loadWeeklyTeamReport } from "./digests/weekly-team";
import { buildClientDigest, listDigestRecipients, loadClientDigestInput } from "./digests/weekly-client";
import { loadReminderCandidates, requestsToRemind, sendReminders, MAX_REMINDERS, REMINDER_AFTER_BUSINESS_DAYS } from "@/modules/requests/reminders";
import { countOldNotifications, deleteOldNotifications, READ_RETENTION_DAYS, UNREAD_RETENTION_DAYS } from "@/modules/notifications/cleanup";

export const JOB_KEYS = ["propostas-expirar", "resumo-diario", "semanal-equipe", "semanal-cliente", "notificacoes-limpar", "solicitacoes-lembrete"] as const;
export type JobKey = (typeof JOB_KEYS)[number];
export const isJobKey = (v: string): v is JobKey => (JOB_KEYS as readonly string[]).includes(v);

export type JobContext = { now: Date; today: string; baseUrl: string };
/** `text` é a frase curta mostrada na tela; o resto fica no JSON do histórico. */
export type JobSummary = { text: string; sent?: number; failed?: number } & Record<string, unknown>;

export type JobPreview =
  | { kind: "mail"; subject: string; to: string[]; html: string; wouldSend: boolean; reason?: string }
  | { kind: "table"; columns: string[]; rows: string[][]; note: string };

export type JobDefinition = {
  key: JobKey;
  name: string;
  description: string;
  schedule: Schedule;
  /** rótulo da coluna "para quem" (pode consultar o banco) */
  recipients: () => Promise<string>;
  run: (ctx: JobContext) => Promise<JobSummary>;
  preview: (ctx: JobContext, opts: { organizationId?: string }) => Promise<JobPreview>;
};

export const baseUrl = () => env.BETTER_AUTH_URL.replace(/\/$/, "");

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

const propostasExpirar: JobDefinition = {
  key: "propostas-expirar",
  name: "Expirar propostas vencidas",
  description: 'Propostas enviadas com validade passada viram "Expirada".',
  schedule: { kind: "daily", hour: 7, minute: 30 },
  recipients: async () => "ninguém (entra no resumo diário)",
  async run(ctx) {
    const r = await expireProposals(ctx.today, ctx.now);
    return { text: r.expired === 0 ? "nenhuma proposta vencida" : `${plural(r.expired, "proposta expirada", "propostas expiradas")}: ${r.numbers.join(", ")}`, ...r };
  },
  async preview(ctx) {
    const rows = proposalsToExpire(await loadExpirableProposals(ctx.today), ctx.today);
    return {
      kind: "table",
      columns: ["Número", "Proposta", "Empresa", "Válida até"],
      rows: rows.map((p) => [p.number, p.title, p.companyName, formatBr(p.validUntil)]),
      note: rows.length === 0 ? "Nenhuma proposta enviada com validade vencida. Nada seria alterado." : `${plural(rows.length, "proposta passaria", "propostas passariam")} a "Expirada".`,
    };
  },
};

const resumoDiario: JobDefinition = {
  key: "resumo-diario",
  name: "Resumo diário da equipe",
  description: "Atrasadas, vencem hoje e nos próximos 7 dias, solicitações aguardando, propostas.",
  schedule: { kind: "weekdays", hour: 8, minute: 0 },
  recipients: async () => env.ADMIN_NOTIFY_EMAIL,
  async run(ctx) {
    const digest = buildDailyDigest(await loadDailyDigestInput(ctx.today), ctx.today);
    if (digest.isEmpty) return { text: "nada a enviar", sent: 0 };
    const ok = await sendDigest(env.ADMIN_NOTIFY_EMAIL, renderDailyDigest(digest, ctx.baseUrl));
    if (!ok) throw new Error("SMTP recusou o envio do resumo diário");
    const bits = [`${digest.late.total} atrasadas`, `${digest.dueToday.total} vencem hoje`];
    if (digest.requests.total) bits.push(`${plural(digest.requests.total, "solicitação aguardando", "solicitações aguardando")}`);
    return { text: `1 e-mail enviado · ${bits.join(", ")}`, sent: 1, late: digest.late.total, dueToday: digest.dueToday.total, requests: digest.requests.total };
  },
  async preview(ctx) {
    const digest = buildDailyDigest(await loadDailyDigestInput(ctx.today), ctx.today);
    const m = renderDailyDigest(digest, ctx.baseUrl);
    return { kind: "mail", subject: m.subject, to: [env.ADMIN_NOTIFY_EMAIL], html: m.html, wouldSend: !digest.isEmpty, reason: digest.isEmpty ? "nada atrasado, vencendo ou aguardando: o resumo não seria enviado" : undefined };
  },
};

const semanalEquipe: JobDefinition = {
  key: "semanal-equipe",
  name: "Relatório semanal da equipe",
  description: "O semanal da semana que fechou, por projeto.",
  schedule: { kind: "weekly", weekday: 1, hour: 8, minute: 15 },
  recipients: async () => env.ADMIN_NOTIFY_EMAIL,
  async run(ctx) {
    const report = await loadWeeklyTeamReport(ctx.today);
    const ok = await sendDigest(env.ADMIN_NOTIFY_EMAIL, renderWeeklyTeam(report, ctx.baseUrl));
    if (!ok) throw new Error("SMTP recusou o envio do relatório semanal");
    return { text: `1 e-mail enviado · semana ${report.label}: ${report.doneCount} concluídos`, sent: 1, week: report.label, done: report.doneCount };
  },
  async preview(ctx) {
    const m = renderWeeklyTeam(await loadWeeklyTeamReport(ctx.today), ctx.baseUrl);
    return { kind: "mail", subject: m.subject, to: [env.ADMIN_NOTIFY_EMAIL], html: m.html, wouldSend: true };
  },
};

const semanalCliente: JobDefinition = {
  key: "semanal-cliente",
  name: "Andamento semanal para clientes",
  description: "Só para organizações com o resumo ligado. Nunca mostra valores nem entregas internas.",
  schedule: { kind: "weekly", weekday: 1, hour: 9, minute: 0 },
  async recipients() {
    const orgs = await listDigestRecipients();
    if (orgs.length === 0) return "nenhuma organização ligou o resumo";
    const people = orgs.reduce((s, o) => s + o.recipients.length, 0);
    return `${plural(orgs.length, "organização", "organizações")} · ${plural(people, "pessoa", "pessoas")}`;
  },
  async run(ctx) {
    const orgs = await listDigestRecipients();
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    for (const org of orgs) {
      const input = await loadClientDigestInput(org.id);
      if (!input) continue;
      const digest = buildClientDigest(input, ctx.today);
      if (digest.isEmpty) {
        skipped++;
        continue;
      }
      const m = renderWeeklyClient(digest, ctx.baseUrl);
      for (const r of org.recipients) {
        if (await sendDigest(r.email, m)) sent++;
        else failed++;
      }
    }
    if (failed > 0 && sent === 0) throw new Error(`SMTP recusou todos os ${failed} envios`);
    const text = orgs.length === 0 ? "nenhuma organização com o resumo ligado" : `${plural(sent, "e-mail enviado", "e-mails enviados")} · ${plural(orgs.length - skipped, "organização", "organizações")} com movimento${skipped ? `, ${skipped} sem` : ""}${failed ? ` · ${failed} falharam` : ""}`;
    return { text, sent, failed, organizations: orgs.length, skipped };
  },
  async preview(ctx, opts) {
    const orgs = await listDigestRecipients();
    const org = orgs.find((o) => o.id === opts.organizationId) ?? orgs[0];
    if (!org) return { kind: "mail", subject: "—", to: [], html: "", wouldSend: false, reason: "nenhuma organização ligou o resumo semanal" };
    const input = await loadClientDigestInput(org.id);
    if (!input) return { kind: "mail", subject: "—", to: [], html: "", wouldSend: false, reason: "organização não encontrada" };
    const digest = buildClientDigest(input, ctx.today);
    const m = renderWeeklyClient(digest, ctx.baseUrl);
    return { kind: "mail", subject: m.subject, to: org.recipients.map((r) => r.email), html: m.html, wouldSend: !digest.isEmpty, reason: digest.isEmpty ? "nenhum projeto com movimento: esta organização não receberia" : undefined };
  },
};

const notificacoesLimpar: JobDefinition = {
  key: "notificacoes-limpar",
  name: "Limpar notificações antigas",
  description: `Apaga notificações lidas há mais de ${READ_RETENTION_DAYS} dias e não lidas há mais de ${UNREAD_RETENTION_DAYS}.`,
  schedule: { kind: "daily", hour: 3, minute: 0 },
  recipients: async () => "ninguém (só limpa)",
  async run(ctx) {
    const r = await deleteOldNotifications(ctx.now);
    return { text: r.deleted === 0 ? "nada a apagar" : `${plural(r.deleted, "notificação apagada", "notificações apagadas")}`, ...r };
  },
  async preview(ctx) {
    const c = await countOldNotifications(ctx.now);
    return {
      kind: "table",
      columns: ["Situação", "Quantidade"],
      rows: [
        [`lidas há mais de ${READ_RETENTION_DAYS} dias`, String(c.read)],
        [`não lidas há mais de ${UNREAD_RETENTION_DAYS} dias`, String(c.unread)],
      ],
      note: c.read + c.unread === 0 ? "Nenhuma notificação antiga. Nada seria apagado." : `${plural(c.read + c.unread, "notificação seria apagada", "notificações seriam apagadas")}.`,
    };
  },
};

const solicitacoesLembrete: JobDefinition = {
  key: "solicitacoes-lembrete",
  name: "Lembrar clientes de solicitações paradas",
  description: `Solicitação respondida pela equipe sem retorno do cliente há ${REMINDER_AFTER_BUSINESS_DAYS} dias úteis: lembrete por e-mail e no portal, no máximo ${MAX_REMINDERS}.`,
  schedule: { kind: "weekdays", hour: 9, minute: 30 },
  recipients: async () => "membros das organizações com solicitação parada",
  async run(ctx) {
    const r = await sendReminders(ctx.now);
    if (r.failed > 0 && r.sent === 0 && r.reminded > 0) throw new Error(`SMTP recusou todos os ${r.failed} lembretes`);
    return {
      text: r.reminded === 0 ? "nenhuma solicitação parada" : `${plural(r.reminded, "lembrete enviado", "lembretes enviados")} (${plural(r.sent, "e-mail", "e-mails")})${r.failed ? ` · ${r.failed} falharam` : ""}`,
      sent: r.sent,
      failed: r.failed,
      reminded: r.reminded,
    };
  },
  async preview(ctx) {
    const rows = requestsToRemind(await loadReminderCandidates(), ctx.now);
    return {
      kind: "table",
      columns: ["Solicitação", "Organização", "Parada há", "Lembrete nº"],
      rows: rows.map((r) => [r.title, r.organizationName, `${r.idleBusinessDays} dias úteis`, String(r.reminderCount + 1)]),
      note: rows.length === 0 ? "Nenhuma solicitação aguardando o cliente há 5 dias úteis ou mais. Nada seria enviado." : `${plural(rows.length, "cliente receberia", "clientes receberiam")} lembrete agora.`,
    };
  },
};

export const JOBS: readonly JobDefinition[] = [propostasExpirar, resumoDiario, semanalEquipe, semanalCliente, solicitacoesLembrete, notificacoesLimpar];
export const getJob = (key: string): JobDefinition | null => JOBS.find((j) => j.key === key) ?? null;
