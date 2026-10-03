import { and, asc, desc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, files, organizations, portalRequest, portalRequestAttachment, portalRequestMessage, project, projectDeliverable, users } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import type { RequestStatus } from "./status";
import { slaState } from "./sla";

/** Mensagens visíveis ao cliente (notas internas não contam). */
const messageCount = sql<number>`(select count(*)::int from portal_request_message m where m.request_id = ${portalRequest.id} and m.internal = false)`;

const assignee = db.$with("assignee").as(db.select({ id: users.id, name: users.name }).from(users));

const listColumns = {
  id: portalRequest.id,
  title: portalRequest.title,
  status: portalRequest.status,
  priority: portalRequest.priority,
  createdAt: portalRequest.createdAt,
  updatedAt: portalRequest.updatedAt,
  projectId: portalRequest.projectId,
  projectTitle: project.title,
  authorName: users.name,
  messages: messageCount,
  firstResponseDueAt: portalRequest.firstResponseDueAt,
  firstResponseAt: portalRequest.firstResponseAt,
  assigneeId: portalRequest.assigneeId,
};

/** Solicitações da organização ativa (qualquer membro vê). */
export function listPortalRequests(ctx: PortalContext) {
  return db
    .select(listColumns)
    .from(portalRequest)
    .innerJoin(users, eq(portalRequest.createdBy, users.id))
    .leftJoin(project, eq(portalRequest.projectId, project.id))
    .where(eq(portalRequest.organizationId, ctx.organization.id))
    .orderBy(desc(portalRequest.updatedAt));
}

const detailColumns = {
  ...listColumns,
  body: portalRequest.body,
  createdBy: portalRequest.createdBy,
  resolvedAt: portalRequest.resolvedAt,
  organizationId: portalRequest.organizationId,
  organizationName: organizations.name,
  authorEmail: users.email,
  deliverableId: portalRequest.deliverableId,
  deliverableTitle: projectDeliverable.title,
  deliverableProjectId: projectDeliverable.projectId,
  deliverableVisible: projectDeliverable.visibleToClient,
  reminderCount: portalRequest.reminderCount,
  lastReminderAt: portalRequest.lastReminderAt,
};

export async function getPortalRequest(ctx: PortalContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select(detailColumns)
    .from(portalRequest)
    .innerJoin(users, eq(portalRequest.createdBy, users.id))
    .innerJoin(organizations, eq(portalRequest.organizationId, organizations.id))
    .leftJoin(project, eq(portalRequest.projectId, project.id))
    .leftJoin(projectDeliverable, eq(portalRequest.deliverableId, projectDeliverable.id))
    .where(and(eq(portalRequest.id, id), eq(portalRequest.organizationId, ctx.organization.id)))
    .limit(1);
  if (!row) return null;
  // entrega interna não vaza para o cliente: só título e projeto quando ela foi compartilhada
  if (!row.deliverableVisible) return { ...row, deliverableTitle: null, deliverableProjectId: null };
  return row;
}

const messageColumns = {
  id: portalRequestMessage.id,
  body: portalRequestMessage.body,
  createdAt: portalRequestMessage.createdAt,
  authorId: portalRequestMessage.authorId,
  authorName: users.name,
  authorRole: users.role,
  internal: portalRequestMessage.internal,
};

/** Mensagens de uma solicitação da organização ativa (sem notas internas). */
export function listPortalRequestMessages(ctx: PortalContext, requestId: string) {
  if (!isUuid(requestId)) return Promise.resolve([]);
  return db
    .select(messageColumns)
    .from(portalRequestMessage)
    .innerJoin(portalRequest, eq(portalRequestMessage.requestId, portalRequest.id))
    .innerJoin(users, eq(portalRequestMessage.authorId, users.id))
    .where(
      and(
        eq(portalRequestMessage.requestId, requestId),
        eq(portalRequest.organizationId, ctx.organization.id),
        eq(portalRequestMessage.internal, false),
      ),
    )
    .orderBy(asc(portalRequestMessage.createdAt));
}

export type RequestAttachment = { fileId: string; messageId: string | null; name: string; sizeBytes: number; mimeType: string; createdAt: Date };

const attachmentColumns = {
  fileId: files.id,
  messageId: portalRequestAttachment.messageId,
  name: files.originalName,
  sizeBytes: files.sizeBytes,
  mimeType: files.mimeType,
  createdAt: portalRequestAttachment.createdAt,
};

/** Anexos de uma solicitação. No portal, só os de mensagens visíveis (ou do texto inicial) da organização ativa. */
export async function listRequestAttachments(ctx: AdminContext | PortalContext, requestId: string): Promise<RequestAttachment[]> {
  if (!isUuid(requestId)) return [];
  const rows = await db
    .select({ ...attachmentColumns, internal: portalRequestMessage.internal, organizationId: portalRequest.organizationId })
    .from(portalRequestAttachment)
    .innerJoin(files, eq(portalRequestAttachment.fileId, files.id))
    .innerJoin(portalRequest, eq(portalRequestAttachment.requestId, portalRequest.id))
    .leftJoin(portalRequestMessage, eq(portalRequestAttachment.messageId, portalRequestMessage.id))
    .where(eq(portalRequestAttachment.requestId, requestId))
    .orderBy(asc(portalRequestAttachment.createdAt));
  return rows
    .filter((r) => ctx.kind === "admin" || (r.organizationId === ctx.organization.id && r.internal !== true))
    .map(({ internal: _i, organizationId: _o, ...rest }) => rest);
}

// ── admin ────────────────────────────────────────────────────────────────────

export type AdminRequestFilters = { status?: RequestStatus; assigneeId?: string; sla?: "breached" };

/**
 * Lista do admin. Com `sla: "breached"` só as não respondidas com prazo vencido.
 * Ordem: SLA estourado primeiro, depois prazo do SLA mais próximo, depois atualização.
 */
export async function listAllRequests(_ctx: AdminContext, opts: AdminRequestFilters = {}, now = new Date()) {
  const filters = [];
  if (opts.status) filters.push(eq(portalRequest.status, opts.status));
  if (opts.assigneeId && isUuid(opts.assigneeId)) filters.push(eq(portalRequest.assigneeId, opts.assigneeId));
  if (opts.sla === "breached") filters.push(ne(portalRequest.status, "resolved"), isNull(portalRequest.firstResponseAt), lt(portalRequest.firstResponseDueAt, now));
  const rows = await db
    .with(assignee)
    .select({ ...listColumns, organizationName: organizations.name, assigneeName: assignee.name })
    .from(portalRequest)
    .innerJoin(users, eq(portalRequest.createdBy, users.id))
    .innerJoin(organizations, eq(portalRequest.organizationId, organizations.id))
    .leftJoin(project, eq(portalRequest.projectId, project.id))
    .leftJoin(assignee, eq(portalRequest.assigneeId, assignee.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(portalRequest.updatedAt));
  const rank = (r: (typeof rows)[number]) => {
    const s = slaState(r, now);
    return s.kind === "breached" ? 0 : s.kind === "pending" ? 1 : 2;
  };
  return rows.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra < 2 && a.firstResponseDueAt && b.firstResponseDueAt && a.firstResponseDueAt.getTime() !== b.firstResponseDueAt.getTime())
      return a.firstResponseDueAt.getTime() - b.firstResponseDueAt.getTime();
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

export async function getRequestForAdmin(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .with(assignee)
    .select({ ...detailColumns, assigneeName: assignee.name })
    .from(portalRequest)
    .innerJoin(users, eq(portalRequest.createdBy, users.id))
    .innerJoin(organizations, eq(portalRequest.organizationId, organizations.id))
    .leftJoin(project, eq(portalRequest.projectId, project.id))
    .leftJoin(projectDeliverable, eq(portalRequest.deliverableId, projectDeliverable.id))
    .leftJoin(assignee, eq(portalRequest.assigneeId, assignee.id))
    .where(eq(portalRequest.id, id))
    .limit(1);
  return row ?? null;
}

/** Todas as mensagens, inclusive notas internas. */
export function listRequestMessagesForAdmin(_ctx: AdminContext, requestId: string) {
  if (!isUuid(requestId)) return Promise.resolve([]);
  return db
    .select(messageColumns)
    .from(portalRequestMessage)
    .innerJoin(users, eq(portalRequestMessage.authorId, users.id))
    .where(eq(portalRequestMessage.requestId, requestId))
    .orderBy(asc(portalRequestMessage.createdAt));
}

/** Solicitações que ainda pedem ação da equipe (abertas ou em andamento). */
export async function countActiveRequests(): Promise<number> {
  const [r] = await db.execute<{ n: number }>(sql`select count(*)::int as n from portal_request where status <> 'resolved'`);
  return r.n;
}

/** Não resolvidas, sem primeira resposta e com o prazo do SLA vencido. */
export async function countBreachedSla(now = new Date()): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(portalRequest)
    .where(and(ne(portalRequest.status, "resolved"), isNull(portalRequest.firstResponseAt), lt(portalRequest.firstResponseDueAt, now)));
  return r?.n ?? 0;
}

/** Projetos da empresa vinculada à organização (destino possível da conversão de uma solicitação). */
export function listOrgProjectsForAdmin(_ctx: AdminContext, organizationId: string) {
  if (!isUuid(organizationId)) return Promise.resolve([]);
  return db
    .select({ id: project.id, title: project.title })
    .from(project)
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(and(eq(crmCompany.linkedOrganizationId, organizationId), sql`${project.archivedAt} is null`))
    .orderBy(asc(project.title));
}

/** Para a lista do admin: ids de admins em uso como responsável (evita opções mortas no filtro). */
export function listAssignees(_ctx: AdminContext) {
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true), inArray(users.id, db.selectDistinct({ id: portalRequest.assigneeId }).from(portalRequest).where(sql`${portalRequest.assigneeId} is not null`))))
    .orderBy(asc(users.name));
}
