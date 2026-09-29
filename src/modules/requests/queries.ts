import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, portalRequest, portalRequestMessage, project, users } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import type { RequestStatus } from "./status";

const messageCount = sql<number>`(select count(*)::int from portal_request_message m where m.request_id = ${portalRequest.id})`;

const listColumns = {
  id: portalRequest.id,
  title: portalRequest.title,
  status: portalRequest.status,
  createdAt: portalRequest.createdAt,
  updatedAt: portalRequest.updatedAt,
  projectId: portalRequest.projectId,
  projectTitle: project.title,
  authorName: users.name,
  messages: messageCount,
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
};

export async function getPortalRequest(ctx: PortalContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select(detailColumns)
    .from(portalRequest)
    .innerJoin(users, eq(portalRequest.createdBy, users.id))
    .innerJoin(organizations, eq(portalRequest.organizationId, organizations.id))
    .leftJoin(project, eq(portalRequest.projectId, project.id))
    .where(and(eq(portalRequest.id, id), eq(portalRequest.organizationId, ctx.organization.id)))
    .limit(1);
  return row ?? null;
}

const messageColumns = {
  id: portalRequestMessage.id,
  body: portalRequestMessage.body,
  createdAt: portalRequestMessage.createdAt,
  authorId: portalRequestMessage.authorId,
  authorName: users.name,
  authorRole: users.role,
};

/** Mensagens de uma solicitação da organização ativa. */
export function listPortalRequestMessages(ctx: PortalContext, requestId: string) {
  if (!isUuid(requestId)) return Promise.resolve([]);
  return db
    .select(messageColumns)
    .from(portalRequestMessage)
    .innerJoin(portalRequest, eq(portalRequestMessage.requestId, portalRequest.id))
    .innerJoin(users, eq(portalRequestMessage.authorId, users.id))
    .where(and(eq(portalRequestMessage.requestId, requestId), eq(portalRequest.organizationId, ctx.organization.id)))
    .orderBy(asc(portalRequestMessage.createdAt));
}

// ── admin ────────────────────────────────────────────────────────────────────

export function listAllRequests(_ctx: AdminContext, opts: { status?: RequestStatus } = {}) {
  return db
    .select({ ...listColumns, organizationName: organizations.name })
    .from(portalRequest)
    .innerJoin(users, eq(portalRequest.createdBy, users.id))
    .innerJoin(organizations, eq(portalRequest.organizationId, organizations.id))
    .leftJoin(project, eq(portalRequest.projectId, project.id))
    .where(opts.status ? eq(portalRequest.status, opts.status) : undefined)
    .orderBy(desc(portalRequest.updatedAt));
}

export async function getRequestForAdmin(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select(detailColumns)
    .from(portalRequest)
    .innerJoin(users, eq(portalRequest.createdBy, users.id))
    .innerJoin(organizations, eq(portalRequest.organizationId, organizations.id))
    .leftJoin(project, eq(portalRequest.projectId, project.id))
    .where(eq(portalRequest.id, id))
    .limit(1);
  return row ?? null;
}

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
