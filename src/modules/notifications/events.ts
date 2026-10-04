/**
 * Os eventos que geram notificação, um por função, chamados pelas actions
 * depois de gravarem. Cada um resolve destinatários, monta título e e-mail e
 * delega ao `notify()`. Nenhum lança.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, project, projectDeliverable, users } from "@/db/schema";
import { env } from "@/lib/env";
import { formatDate, formatIsoDate } from "@/lib/format";
import {
  renderClientCommentNotification,
  renderDeliverableDoneNotification,
  renderLeadNotification,
  renderMeetingSharedNotification,
  renderDeliverableAssigned,
  renderRequestAssigned,
  renderRequestNotification,
  renderRequestReminder,
  renderTeamCommentNotification,
  type RequestNotificationKind,
} from "@/modules/mail/templates";
import { excerpt } from "./kinds";
import { notify, type NotifyResult } from "./notify";
import { activeOwners, activeTeam, deliverableAudience, meetingAudience, organizationMembers } from "./recipients";

const base = () => env.BETTER_AUTH_URL.replace(/\/$/, "");
const mailExcerpt = (s: string) => (s.length > 800 ? `${s.slice(0, 800)}…` : s);

/** Solicitação: aviso à equipe (nova / resposta do cliente) ou aos membros da organização (resposta da equipe). */
export async function notifyRequestEvent(p: {
  kind: RequestNotificationKind;
  requestId: string;
  organizationId: string;
  organizationName: string;
  title: string;
  body: string;
  actorId: string;
  actorName: string;
}): Promise<NotifyResult> {
  const toTeam = p.kind !== "team_reply";
  const path = toTeam ? `/admin/solicitacoes/${p.requestId}` : `/portal/solicitacoes/${p.requestId}`;
  const mail = renderRequestNotification({
    kind: p.kind,
    actorName: toTeam ? p.actorName : "A equipe da EGD",
    organizationName: p.organizationName,
    title: p.title,
    body: mailExcerpt(p.body),
    url: `${base()}${path}`,
  });
  return notify({
    kind: p.kind === "created" ? "request.created" : p.kind === "client_reply" ? "request.client_reply" : "request.team_reply",
    title: p.kind === "created" ? `Nova solicitação de ${p.organizationName}: ${p.title}` : p.kind === "client_reply" ? `${p.actorName} (${p.organizationName}) respondeu: ${p.title}` : `A EGD respondeu: ${p.title}`,
    body: excerpt(p.body),
    url: path,
    entity: { type: "portal_request", id: p.requestId },
    organizationId: p.organizationId,
    recipients: toTeam ? await activeTeam() : await organizationMembers(p.organizationId),
    excludeUserId: p.actorId,
    mail,
  });
}

/** Cliente comentou numa entrega: avisa a equipe. */
export async function notifyClientComment(p: {
  actorId: string;
  actorName: string;
  organizationId: string;
  organizationName: string;
  projectId: string;
  projectTitle: string;
  deliverableId: string;
  deliverableTitle: string;
  body: string;
}): Promise<NotifyResult> {
  const path = `/admin/projetos/${p.projectId}/entregas/${p.deliverableId}`;
  return notify({
    kind: "comment.client",
    title: `${p.actorName} (${p.organizationName}) comentou em ${p.deliverableTitle}`,
    body: excerpt(p.body),
    url: path,
    entity: { type: "project_deliverable", id: p.deliverableId },
    organizationId: p.organizationId,
    recipients: await activeTeam(),
    excludeUserId: p.actorId,
    mail: renderClientCommentNotification({
      authorName: p.actorName,
      organizationName: p.organizationName,
      projectTitle: p.projectTitle,
      deliverableTitle: p.deliverableTitle,
      body: mailExcerpt(p.body),
      url: `${base()}${path}`,
    }),
  });
}

/** Equipe comentou numa entrega: avisa os membros da organização, se a entrega for visível. */
export async function notifyTeamComment(p: { deliverableId: string; body: string; actorId: string }): Promise<NotifyResult | null> {
  const a = await deliverableAudience(p.deliverableId);
  if (!a) return null;
  const path = `/portal/projetos/${a.projectId}/entregas/${a.id}`;
  return notify({
    kind: "comment.team",
    title: `A EGD comentou em ${a.title}`,
    body: excerpt(p.body),
    url: path,
    entity: { type: "project_deliverable", id: a.id },
    organizationId: a.organizationId,
    recipients: a.recipients,
    excludeUserId: p.actorId,
    mail: renderTeamCommentNotification({ projectTitle: a.projectTitle, deliverableTitle: a.title, body: mailExcerpt(p.body), url: `${base()}${path}` }),
  });
}

/** Entrega visível concluída: avisa os membros da organização. */
export async function notifyDeliverableDone(p: { deliverableId: string; hasFile: boolean; actorId: string }): Promise<NotifyResult | null> {
  const a = await deliverableAudience(p.deliverableId);
  if (!a) return null;
  const path = `/portal/projetos/${a.projectId}/entregas/${a.id}`;
  return notify({
    kind: "deliverable.done",
    title: `Entrega concluída: ${a.title}`,
    body: a.projectTitle,
    url: path,
    entity: { type: "project_deliverable", id: a.id },
    organizationId: a.organizationId,
    recipients: a.recipients,
    excludeUserId: p.actorId,
    mail: renderDeliverableDoneNotification({ projectTitle: a.projectTitle, deliverableTitle: a.title, hasFile: p.hasFile, url: `${base()}${path}` }),
  });
}

/** Ata passou a compartilhada: avisa os membros da organização. */
export async function notifyMeetingShared(p: { meetingId: string; heldAt: Date; actorId: string }): Promise<NotifyResult | null> {
  const a = await meetingAudience(p.meetingId);
  if (!a) return null;
  const path = `/portal/atas/${a.id}`;
  return notify({
    kind: "meeting.shared",
    title: `Ata compartilhada: ${a.title}`,
    body: `Reunião de ${formatDate(p.heldAt)}`,
    url: path,
    entity: { type: "meeting", id: a.id },
    organizationId: a.organizationId,
    recipients: a.recipients,
    excludeUserId: p.actorId,
    mail: renderMeetingSharedNotification({ meetingTitle: a.title, heldAt: formatDate(p.heldAt), url: `${base()}${path}` }),
  });
}

/** Lead novo (site ou API): avisa os admins. A caixa da equipe (`ADMIN_NOTIFY_EMAIL`) já recebeu o e-mail pela action. */
export async function notifyLeadCreated(p: { leadId: string; name: string; email: string; company: string | null; message: string }): Promise<NotifyResult> {
  const teamMailbox = env.ADMIN_NOTIFY_EMAIL.toLowerCase();
  const mail = renderLeadNotification({ name: p.name, email: p.email, company: p.company, message: p.message });
  return notify({
    kind: "lead.created",
    title: `Novo lead: ${p.name}${p.company ? ` (${p.company})` : ""}`,
    body: excerpt(p.message),
    url: "/admin/leads",
    entity: { type: "lead", id: p.leadId },
    recipients: await activeOwners(),
    mail: (r) => (r.email.toLowerCase() === teamMailbox ? null : mail),
  });
}

/** Proposta expirada pela automação: só no sistema (o resumo diário já lista). */
export async function notifyProposalExpired(p: { proposalId: string; number: string; title: string; companyName: string }): Promise<NotifyResult> {
  return notify({
    kind: "proposal.expired",
    title: `Proposta ${p.number} expirou`,
    body: `${p.title} · ${p.companyName}`,
    url: `/admin/crm/propostas/${p.proposalId}`,
    entity: { type: "crm_proposal", id: p.proposalId },
    recipients: await activeOwners(),
  });
}

/** Alguém da equipe virou responsável por uma solicitação (não avisa quem se atribuiu). */
export async function notifyRequestAssigned(p: {
  requestId: string;
  title: string;
  organizationId: string;
  assignee: { id: string; name: string; email: string };
  actorId: string;
  actorName: string;
}): Promise<NotifyResult> {
  const path = `/admin/solicitacoes/${p.requestId}`;
  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, p.organizationId)).limit(1);
  const organizationName = org?.name ?? "";
  return notify({
    kind: "request.assigned",
    title: `Solicitação atribuída a você: ${p.title}`,
    body: organizationName,
    url: path,
    entity: { type: "portal_request", id: p.requestId },
    organizationId: p.organizationId,
    recipients: [p.assignee],
    excludeUserId: p.actorId,
    mail: renderRequestAssigned({ title: p.title, organizationName, actorName: p.actorName, url: `${base()}${path}` }),
  });
}

/** Lembrete da automação ao cliente: a solicitação aguarda retorno dele. */
export async function notifyRequestReminder(p: { requestId: string; title: string; organizationId: string; organizationName: string; idleBusinessDays: number }): Promise<NotifyResult> {
  const path = `/portal/solicitacoes/${p.requestId}`;
  return notify({
    kind: "request.reminder",
    title: `Aguardamos seu retorno: ${p.title}`,
    body: `Respondida pela equipe há ${p.idleBusinessDays} dias úteis.`,
    url: path,
    entity: { type: "portal_request", id: p.requestId },
    organizationId: p.organizationId,
    recipients: await organizationMembers(p.organizationId),
    mail: renderRequestReminder({ title: p.title, organizationName: p.organizationName, idleBusinessDays: p.idleBusinessDays, url: `${base()}${path}` }),
  });
}

/** Entrega atribuída por outra pessoa da equipe (criar, editar ou atribuir). */
export async function notifyDeliverableAssigned(p: { deliverableId: string; assigneeId: string; actorId: string; actorName: string }): Promise<NotifyResult | null> {
  if (p.assigneeId === p.actorId) return null;
  const [row] = await db
    .select({ id: projectDeliverable.id, title: projectDeliverable.title, dueAt: projectDeliverable.dueAt, projectId: project.id, projectTitle: project.title })
    .from(projectDeliverable)
    .innerJoin(project, eq(projectDeliverable.projectId, project.id))
    .where(eq(projectDeliverable.id, p.deliverableId))
    .limit(1);
  if (!row) return null;
  const [assignee] = await db.select({ id: users.id, email: users.email, name: users.name }).from(users).where(and(eq(users.id, p.assigneeId), eq(users.active, true))).limit(1);
  if (!assignee) return null;
  const path = `/admin/projetos/${row.projectId}/entregas/${row.id}`;
  const dueAt = row.dueAt ? formatIsoDate(row.dueAt) : null;
  return notify({
    kind: "deliverable.assigned",
    title: `Entrega atribuída a você: ${row.title}`,
    body: `${row.projectTitle}${dueAt ? ` · prazo ${dueAt}` : ""}`,
    url: path,
    entity: { type: "project_deliverable", id: row.id },
    recipients: [assignee],
    excludeUserId: p.actorId,
    mail: renderDeliverableAssigned({ actorName: p.actorName, deliverableTitle: row.title, projectTitle: row.projectTitle, dueAt, url: `${base()}${path}` }),
  });
}

/** Automação diária: um aviso ao dono com as parcelas vencidas (nada quando não há). */
export async function notifyInvoicesOverdue(p: { count: number; totalCents: number; oldestDueAt: string; sample: string[] }): Promise<NotifyResult> {
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.totalCents / 100);
  const title = `${p.count} parcela${p.count === 1 ? "" : "s"} vencida${p.count === 1 ? "" : "s"}: ${brl} a receber`;
  const body = p.sample.join(" · ");
  const url = "/admin/projetos";
  const text = [title, "", ...p.sample.map((s) => `- ${s}`), "", `Mais antiga vence em ${p.oldestDueAt}.`, "", `Abrir: ${base()}${url}`].join("\n");
  return notify({
    kind: "invoice.overdue",
    title,
    body,
    url,
    recipients: await activeOwners(),
    mail: { subject: title, text, html: `<p>${title}</p><ul>${p.sample.map((s) => `<li>${s.replace(/[<>&]/g, "")}</li>`).join("")}</ul><p>Mais antiga vence em ${p.oldestDueAt}.</p><p><a href="${base()}${url}">Abrir projetos</a></p>` },
  });
}

/** Erro de servidor com origem nova: avisa o dono (uma vez por origem, até ela ser resolvida e voltar). */
export async function notifyErrorSpike(p: { errorId: string; name: string; message: string; path: string }): Promise<NotifyResult> {
  const title = `Erro novo no servidor: ${p.name}`;
  const body = `${p.message.slice(0, 160)} · ${p.path}`;
  const url = "/admin/erros";
  return notify({
    kind: "error.spike",
    title,
    body,
    url,
    entity: { type: "app_error", id: p.errorId },
    recipients: await activeOwners(),
    mail: { subject: title, text: `${body}\n\nAbrir: ${base()}${url}`, html: `<p>${body.replace(/[<>&]/g, "")}</p><p><a href="${base()}${url}">Abrir erros</a></p>` },
  });
}

/** Backup lógico diário falhou. */
export async function notifyBackupFailed(p: { error: string }): Promise<NotifyResult> {
  const title = "Backup diário falhou";
  const url = "/admin/automacoes";
  return notify({
    kind: "backup.failed",
    title,
    body: p.error.slice(0, 300),
    url,
    recipients: await activeOwners(),
    mail: { subject: title, text: `${p.error}\n\nAbrir: ${base()}${url}`, html: `<p>${p.error.replace(/[<>&]/g, "").slice(0, 600)}</p><p><a href="${base()}${url}">Abrir automações</a></p>` },
  });
}

export async function notifyWebhookDisabled(p: { endpointId: string; url: string; failures: number }): Promise<NotifyResult> {
  const title = "Webhook desativado após falhas seguidas";
  const body = `${p.url} · ${p.failures} falhas`;
  const url = `/admin/api/webhooks/${p.endpointId}`;
  return notify({ kind: "webhook.disabled", title, body, url, entity: { type: "webhook_endpoint", id: p.endpointId }, recipients: await activeOwners(), mail: { subject: title, text: `${body}\n\nAbrir: ${base()}${url}`, html: `<p>${body.replace(/[<>&]/g, "")}</p><p><a href="${base()}${url}">Abrir webhook</a></p>` } });
}

export async function notifyApiKeyExpiring(p: { keyId: string; name: string; prefix: string; daysLeft: number }): Promise<NotifyResult> {
  const title = `Chave de API "${p.name}" expira em ${p.daysLeft} dia${p.daysLeft === 1 ? "" : "s"}`;
  const body = `${p.prefix}… · rotacione em API para não interromper a integração.`;
  const url = "/admin/api";
  return notify({ kind: "api_key.expiring", title, body, url, entity: { type: "api_key", id: p.keyId }, recipients: await activeOwners(), mail: { subject: title, text: `${body}\n\nAbrir: ${base()}${url}`, html: `<p>${body.replace(/[<>&]/g, "")}</p><p><a href="${base()}${url}">Abrir API</a></p>` } });
}
