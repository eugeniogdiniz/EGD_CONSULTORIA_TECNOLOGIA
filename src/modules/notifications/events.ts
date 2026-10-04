/**
 * Os eventos que geram notificação, um por função, chamados pelas actions
 * depois de gravarem. Cada um resolve destinatários, monta título e e-mail e
 * delega ao `notify()`. Nenhum lança.
 */
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import {
  renderClientCommentNotification,
  renderDeliverableDoneNotification,
  renderLeadNotification,
  renderMeetingSharedNotification,
  renderRequestNotification,
  renderTeamCommentNotification,
  type RequestNotificationKind,
} from "@/modules/mail/templates";
import { excerpt } from "./kinds";
import { notify, type NotifyResult } from "./notify";
import { activeAdmins, deliverableAudience, meetingAudience, organizationMembers } from "./recipients";

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
    recipients: toTeam ? await activeAdmins() : await organizationMembers(p.organizationId),
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
    recipients: await activeAdmins(),
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
    recipients: await activeAdmins(),
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
    recipients: await activeAdmins(),
  });
}
