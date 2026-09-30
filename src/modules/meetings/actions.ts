import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, meeting, meetingActionItem, meetingParticipant, project, projectDeliverable, users } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { formatDate } from "@/lib/format";
import { actionItemSchema, meetingSchema, type ActionItemInput, type MeetingInput } from "./validation";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Descobre a empresa da ata: pelo projeto (quando há) ou pela empresa escolhida.
 * Projeto e empresa, se ambos vierem, precisam bater.
 */
async function resolveOwner(companyId: string | null, projectId: string | null) {
  if (projectId) {
    const [p] = await db
      .select({ id: project.id, companyId: project.companyId, archivedAt: project.archivedAt, linkedOrganizationId: crmCompany.linkedOrganizationId })
      .from(project)
      .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
      .where(eq(project.id, projectId))
      .limit(1);
    if (!p) return fail("Projeto não encontrado.", { projectId: ["Projeto não encontrado."] });
    if (p.archivedAt) return fail("O projeto está arquivado.", { projectId: ["Projeto arquivado."] });
    if (companyId && companyId !== p.companyId)
      return fail("O projeto não é desta empresa.", { projectId: ["Escolha um projeto da empresa."] });
    return ok({ companyId: p.companyId, projectId: p.id, organizationId: p.linkedOrganizationId });
  }
  const [c] = await db
    .select({ id: crmCompany.id, archivedAt: crmCompany.archivedAt, linkedOrganizationId: crmCompany.linkedOrganizationId })
    .from(crmCompany)
    .where(eq(crmCompany.id, companyId!))
    .limit(1);
  if (!c) return fail("Empresa não encontrada.", { companyId: ["Empresa não encontrada."] });
  if (c.archivedAt) return fail("A empresa está arquivada.", { companyId: ["Empresa arquivada."] });
  return ok({ companyId: c.id, projectId: null, organizationId: c.linkedOrganizationId });
}

/** Participantes da equipe (só admins ativos) seguidos dos externos, na ordem digitada. */
async function writeParticipants(
  tx: Tx,
  meetingId: string,
  teamIds: string[],
  externals: { name: string; organization: string | null }[],
) {
  await tx.delete(meetingParticipant).where(eq(meetingParticipant.meetingId, meetingId));
  const team = teamIds.length
    ? await tx
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(and(inArray(users.id, [...new Set(teamIds)]), eq(users.role, "admin"), eq(users.active, true)))
    : [];
  team.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const rows = [
    ...team.map((u) => ({ meetingId, userId: u.id, name: u.name, organization: "EGD" })),
    ...externals.map((e) => ({ meetingId, userId: null, name: e.name, organization: e.organization })),
  ].map((r, position) => ({ ...r, position }));
  if (rows.length) await tx.insert(meetingParticipant).values(rows);
}

export async function createMeeting(ctx: AdminContext, input: MeetingInput): Promise<ActionResult<{ id: string }>> {
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;
  const owner = await resolveOwner(data.companyId, data.projectId);
  if (!owner.ok) return owner;

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(meeting)
      .values({
        companyId: owner.data.companyId,
        projectId: owner.data.projectId,
        title: data.title,
        heldAt: data.heldAt,
        location: data.location,
        agenda: data.agenda,
        discussion: data.discussion,
        decisions: data.decisions,
        ownerId: ctx.user.id,
      })
      .returning({ id: meeting.id });
    await writeParticipants(tx, row.id, data.teamIds, data.externals);
    return row.id;
  });

  await audit({
    actorId: ctx.user.id,
    action: "meeting.created",
    entityType: "meeting",
    entityId: id,
    organizationId: owner.data.organizationId,
    metadata: { projectId: owner.data.projectId, companyId: owner.data.companyId },
  });
  return ok({ id });
}

export async function updateMeeting(ctx: AdminContext, id: string, input: MeetingInput): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Ata não encontrada.");
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const current = await db.query.meeting.findFirst({ where: eq(meeting.id, id), columns: { id: true, companyId: true } });
  if (!current) return fail("Ata não encontrada.");
  const owner = await resolveOwner(data.companyId, data.projectId);
  if (!owner.ok) return owner;

  // itens de ação são entregas de projetos desta empresa: não dá para levar a ata para outra
  if (owner.data.companyId !== current.companyId) {
    const [items] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(meetingActionItem)
      .where(eq(meetingActionItem.meetingId, id));
    if ((items?.n ?? 0) > 0)
      return fail("A ata já tem itens de ação desta empresa; não é possível trocar de empresa.", { projectId: ["Mantenha a mesma empresa."] });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(meeting)
      .set({
        companyId: owner.data.companyId,
        projectId: owner.data.projectId,
        title: data.title,
        heldAt: data.heldAt,
        location: data.location,
        agenda: data.agenda,
        discussion: data.discussion,
        decisions: data.decisions,
      })
      .where(eq(meeting.id, id));
    await writeParticipants(tx, id, data.teamIds, data.externals);
  });

  await audit({
    actorId: ctx.user.id,
    action: "meeting.updated",
    entityType: "meeting",
    entityId: id,
    organizationId: owner.data.organizationId,
  });
  return ok(null);
}

/** Exclui a ata. As entregas criadas a partir dela continuam nos projetos. */
export async function deleteMeeting(ctx: AdminContext, id: string): Promise<ActionResult<{ projectId: string | null }>> {
  if (!isUuid(id)) return fail("Ata não encontrada.");
  const [row] = await db
    .delete(meeting)
    .where(eq(meeting.id, id))
    .returning({ id: meeting.id, projectId: meeting.projectId, title: meeting.title });
  if (!row) return fail("Ata não encontrada.");
  await audit({
    actorId: ctx.user.id,
    action: "meeting.deleted",
    entityType: "meeting",
    entityId: id,
    metadata: { title: row.title, projectId: row.projectId },
  });
  return ok({ projectId: row.projectId });
}

/** Compartilha (ou deixa de compartilhar) a ata com o cliente no portal. */
export async function setMeetingShared(ctx: AdminContext, id: string, shared: boolean): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Ata não encontrada.");
  const [m] = await db
    .select({ id: meeting.id, organizationId: crmCompany.linkedOrganizationId })
    .from(meeting)
    .innerJoin(crmCompany, eq(meeting.companyId, crmCompany.id))
    .where(eq(meeting.id, id))
    .limit(1);
  if (!m) return fail("Ata não encontrada.");
  if (shared && !m.organizationId)
    return fail("A empresa não tem acesso ao portal. Vincule-a a uma organização para compartilhar.");

  await db.update(meeting).set({ sharedWithClient: shared }).where(eq(meeting.id, id));
  await audit({
    actorId: ctx.user.id,
    action: shared ? "meeting.shared" : "meeting.unshared",
    entityType: "meeting",
    entityId: id,
    organizationId: m.organizationId,
  });
  return ok(null);
}

/**
 * Item de ação: cria uma entrega "A fazer" num projeto da empresa da ata e
 * guarda o vínculo. A entrega entra no kanban e nas demandas como qualquer outra.
 */
export async function addActionItem(ctx: AdminContext, input: ActionItemInput): Promise<ActionResult<{ deliverableId: string }>> {
  const parsed = actionItemSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const m = await db.query.meeting.findFirst({
    where: eq(meeting.id, data.meetingId),
    columns: { id: true, companyId: true, title: true, heldAt: true },
  });
  if (!m) return fail("Ata não encontrada.");

  const p = await db.query.project.findFirst({
    where: eq(project.id, data.projectId),
    columns: { id: true, companyId: true, archivedAt: true },
  });
  if (!p || p.companyId !== m.companyId)
    return fail("O projeto não é da empresa da ata.", { projectId: ["Escolha um projeto desta empresa."] });
  if (p.archivedAt) return fail("O projeto está arquivado.", { projectId: ["Projeto arquivado."] });

  const deliverableId = await db.transaction(async (tx) => {
    const [countRow] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(projectDeliverable)
      .where(and(eq(projectDeliverable.projectId, p.id), eq(projectDeliverable.status, "todo")));
    const [d] = await tx
      .insert(projectDeliverable)
      .values({
        projectId: p.id,
        title: data.title,
        description: `Item de ação da reunião "${m.title}" (${formatDate(m.heldAt)}).`,
        status: "todo",
        priority: data.priority,
        position: countRow?.n ?? 0,
        assigneeId: data.assigneeId,
        dueAt: data.dueAt,
        visibleToClient: data.visibleToClient,
        ownerId: ctx.user.id,
      })
      .returning({ id: projectDeliverable.id });
    await tx.insert(meetingActionItem).values({ meetingId: m.id, deliverableId: d.id });
    return d.id;
  });

  await audit({
    actorId: ctx.user.id,
    action: "meeting.action_item.created",
    entityType: "meeting",
    entityId: m.id,
    metadata: { deliverableId, projectId: p.id, priority: data.priority },
  });
  return ok({ deliverableId });
}
