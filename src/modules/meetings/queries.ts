import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, meeting, meetingActionItem, meetingParticipant, project, projectDeliverable, users } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";

// ────────────────────────────────────────────────────────────────────────────
// Admin
// ────────────────────────────────────────────────────────────────────────────

export type MeetingFilters = { projectId?: string; companyId?: string; limit?: number };

/** Atas mais recentes primeiro, com contagem de participantes e de itens de ação. */
export function listMeetings(_ctx: AdminContext, f: MeetingFilters = {}) {
  const filters = [];
  if (f.projectId && isUuid(f.projectId)) filters.push(eq(meeting.projectId, f.projectId));
  if (f.companyId && isUuid(f.companyId)) filters.push(eq(meeting.companyId, f.companyId));
  return db
    .select({
      id: meeting.id,
      title: meeting.title,
      heldAt: meeting.heldAt,
      location: meeting.location,
      sharedWithClient: meeting.sharedWithClient,
      projectId: meeting.projectId,
      projectTitle: project.title,
      companyId: meeting.companyId,
      companyName: crmCompany.name,
      participantCount: sql<number>`(select count(*)::int from ${meetingParticipant} where ${meetingParticipant.meetingId} = ${meeting.id})`,
      actionItemCount: sql<number>`(select count(*)::int from ${meetingActionItem} where ${meetingActionItem.meetingId} = ${meeting.id})`,
    })
    .from(meeting)
    .innerJoin(crmCompany, eq(meeting.companyId, crmCompany.id))
    .leftJoin(project, eq(meeting.projectId, project.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(meeting.heldAt))
    .limit(f.limit ?? 500);
}

export type MeetingListItem = Awaited<ReturnType<typeof listMeetings>>[number];

export async function getMeeting(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      meeting,
      companyName: crmCompany.name,
      linkedOrganizationId: crmCompany.linkedOrganizationId,
      projectTitle: project.title,
      ownerName: users.name,
    })
    .from(meeting)
    .innerJoin(crmCompany, eq(meeting.companyId, crmCompany.id))
    .leftJoin(project, eq(meeting.projectId, project.id))
    .innerJoin(users, eq(meeting.ownerId, users.id))
    .where(eq(meeting.id, id))
    .limit(1);
  return row ?? null;
}

export function listParticipants(_ctx: AdminContext, meetingId: string) {
  return db
    .select({
      id: meetingParticipant.id,
      userId: meetingParticipant.userId,
      name: meetingParticipant.name,
      organization: meetingParticipant.organization,
    })
    .from(meetingParticipant)
    .where(eq(meetingParticipant.meetingId, meetingId))
    .orderBy(asc(meetingParticipant.position));
}

/** Itens de ação com o estado atual da entrega (o kanban é a fonte da verdade). */
export function listActionItems(_ctx: AdminContext, meetingId: string) {
  return db
    .select({
      deliverableId: projectDeliverable.id,
      title: projectDeliverable.title,
      status: projectDeliverable.status,
      priority: projectDeliverable.priority,
      dueAt: projectDeliverable.dueAt,
      visibleToClient: projectDeliverable.visibleToClient,
      projectId: project.id,
      projectTitle: project.title,
      assigneeName: users.name,
    })
    .from(meetingActionItem)
    .innerJoin(projectDeliverable, eq(meetingActionItem.deliverableId, projectDeliverable.id))
    .innerJoin(project, eq(projectDeliverable.projectId, project.id))
    .leftJoin(users, eq(projectDeliverable.assigneeId, users.id))
    .where(eq(meetingActionItem.meetingId, meetingId))
    .orderBy(asc(meetingActionItem.createdAt));
}

/** Ata de onde a entrega saiu, se saiu de uma. */
export async function getDeliverableOrigin(_ctx: AdminContext, deliverableId: string) {
  if (!isUuid(deliverableId)) return null;
  const [row] = await db
    .select({ id: meeting.id, title: meeting.title, heldAt: meeting.heldAt })
    .from(meetingActionItem)
    .innerJoin(meeting, eq(meetingActionItem.meetingId, meeting.id))
    .where(eq(meetingActionItem.deliverableId, deliverableId))
    .limit(1);
  return row ?? null;
}

/** Empresas ativas (para a ata sem projeto). */
export function listCompaniesForMeeting(_ctx: AdminContext) {
  return db
    .select({ id: crmCompany.id, name: crmCompany.name })
    .from(crmCompany)
    .where(isNull(crmCompany.archivedAt))
    .orderBy(asc(crmCompany.name));
}

/** Projetos não arquivados, com a empresa (para escolher onde a ata ou o item de ação ficam). */
export function listProjectsForMeeting(_ctx: AdminContext, companyId?: string) {
  const filters = [isNull(project.archivedAt)];
  if (companyId) filters.push(eq(project.companyId, companyId));
  return db
    .select({ id: project.id, title: project.title, companyId: project.companyId, companyName: crmCompany.name })
    .from(project)
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(and(...filters))
    .orderBy(asc(crmCompany.name), asc(project.title));
}

// ────────────────────────────────────────────────────────────────────────────
// Portal: só atas compartilhadas de empresas vinculadas à organização ativa
// ────────────────────────────────────────────────────────────────────────────

const sharedInOrganization = (ctx: PortalContext) =>
  and(eq(meeting.sharedWithClient, true), eq(crmCompany.linkedOrganizationId, ctx.organization.id));

/** Projeto arquivado some do portal; a ata dele também. */
const projectVisible = sql`(${meeting.projectId} is null or ${project.archivedAt} is null)`;

export function listPortalMeetings(ctx: PortalContext) {
  return db
    .select({
      id: meeting.id,
      title: meeting.title,
      heldAt: meeting.heldAt,
      location: meeting.location,
      projectTitle: project.title,
    })
    .from(meeting)
    .innerJoin(crmCompany, eq(meeting.companyId, crmCompany.id))
    .leftJoin(project, eq(meeting.projectId, project.id))
    .where(and(sharedInOrganization(ctx), projectVisible))
    .orderBy(desc(meeting.heldAt));
}

/** A ata compartilhada, sem campos internos (dono, data de criação). */
export async function getPortalMeeting(ctx: PortalContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      id: meeting.id,
      title: meeting.title,
      heldAt: meeting.heldAt,
      location: meeting.location,
      agenda: meeting.agenda,
      discussion: meeting.discussion,
      decisions: meeting.decisions,
      projectId: meeting.projectId,
      projectTitle: project.title,
      companyName: crmCompany.name,
    })
    .from(meeting)
    .innerJoin(crmCompany, eq(meeting.companyId, crmCompany.id))
    .leftJoin(project, eq(meeting.projectId, project.id))
    .where(and(eq(meeting.id, id), sharedInOrganization(ctx), projectVisible))
    .limit(1);
  if (!row) return null;
  const participants = await db
    .select({ name: meetingParticipant.name, organization: meetingParticipant.organization })
    .from(meetingParticipant)
    .where(eq(meetingParticipant.meetingId, row.id))
    .orderBy(asc(meetingParticipant.position));
  return { ...row, participants };
}

/**
 * Itens de ação que o cliente pode ver: só entregas visíveis de projetos não
 * arquivados. Uma entrega interna não aparece nem pelo título.
 */
export function listPortalActionItems(ctx: PortalContext, meetingId: string) {
  if (!isUuid(meetingId)) return Promise.resolve([]);
  return db
    .select({
      deliverableId: projectDeliverable.id,
      title: projectDeliverable.title,
      status: projectDeliverable.status,
      dueAt: projectDeliverable.dueAt,
      projectId: project.id,
      assigneeName: users.name,
    })
    .from(meetingActionItem)
    .innerJoin(meeting, eq(meetingActionItem.meetingId, meeting.id))
    .innerJoin(crmCompany, eq(meeting.companyId, crmCompany.id))
    .innerJoin(projectDeliverable, eq(meetingActionItem.deliverableId, projectDeliverable.id))
    .innerJoin(project, eq(projectDeliverable.projectId, project.id))
    .leftJoin(users, eq(projectDeliverable.assigneeId, users.id))
    .where(
      and(
        eq(meetingActionItem.meetingId, meetingId),
        sharedInOrganization(ctx),
        eq(projectDeliverable.visibleToClient, true),
        isNull(project.archivedAt),
      ),
    )
    .orderBy(asc(meetingActionItem.createdAt));
}
