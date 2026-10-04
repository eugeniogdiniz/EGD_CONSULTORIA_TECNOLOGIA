/**
 * Quem recebe cada evento. Só usuários ativos; para clientes, só membros de
 * organização ativa, resolvidos pela cadeia item → projeto/ata → empresa →
 * organização vinculada (o mesmo escopo do portal).
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, meeting, memberships, organizations, project, projectDeliverable, users } from "@/db/schema";
import type { Recipient } from "./kinds";

const person = { id: users.id, email: users.email, name: users.name };

export function activeAdmins(): Promise<Recipient[]> {
  return db
    .select(person)
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true)));
}

export function organizationMembers(organizationId: string): Promise<Recipient[]> {
  return db
    .select(person)
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.organizationId, organizationId), eq(users.active, true), eq(organizations.status, "active")));
}

/**
 * Cliente de uma entrega: só se ela estiver visível e o projeto for de empresa
 * vinculada a uma organização. Devolve também o que o título do aviso precisa.
 */
export async function deliverableAudience(deliverableId: string) {
  const [row] = await db
    .select({
      id: projectDeliverable.id,
      title: projectDeliverable.title,
      visible: projectDeliverable.visibleToClient,
      projectId: project.id,
      projectTitle: project.title,
      organizationId: crmCompany.linkedOrganizationId,
    })
    .from(projectDeliverable)
    .innerJoin(project, eq(projectDeliverable.projectId, project.id))
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(eq(projectDeliverable.id, deliverableId))
    .limit(1);
  if (!row || !row.visible || !row.organizationId) return null;
  return { ...row, organizationId: row.organizationId, recipients: await organizationMembers(row.organizationId) };
}

/** Cliente de uma ata compartilhada. */
export async function meetingAudience(meetingId: string) {
  const [row] = await db
    .select({
      id: meeting.id,
      title: meeting.title,
      shared: meeting.sharedWithClient,
      projectId: meeting.projectId,
      organizationId: crmCompany.linkedOrganizationId,
    })
    .from(meeting)
    .innerJoin(crmCompany, eq(meeting.companyId, crmCompany.id))
    .where(eq(meeting.id, meetingId))
    .limit(1);
  if (!row || !row.shared || !row.organizationId) return null;
  return { ...row, organizationId: row.organizationId, recipients: await organizationMembers(row.organizationId) };
}
