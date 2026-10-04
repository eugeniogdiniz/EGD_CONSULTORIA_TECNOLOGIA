import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, files, project, projectDeliverable, projectDeliverableComment, projectMilestone, projectPhase, users, projectDeliverableAcceptance } from "@/db/schema";
import type { PortalContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { stripInternalNotes, summarizeProject, type ProjectSummary } from "./scope";

/**
 * Toda query daqui parte de `scopedProject`: o projeto só existe para o
 * cliente se a empresa dele está vinculada à organização ativa e o projeto
 * não está arquivado. Nada aqui lê horas, custos, propostas ou dependências.
 */
const inOrganization = (ctx: PortalContext) =>
  and(eq(crmCompany.linkedOrganizationId, ctx.organization.id), isNull(project.archivedAt));

export async function listPortalProjects(ctx: PortalContext) {
  const rows = await db
    .select({
      id: project.id,
      title: project.title,
      status: project.status,
      startedAt: project.startedAt,
      createdAt: project.createdAt,
      companyName: crmCompany.name,
    })
    .from(project)
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(inOrganization(ctx))
    .orderBy(desc(project.updatedAt));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [dels, miles] = await Promise.all([
    db
      .select({
        projectId: projectDeliverable.projectId,
        status: projectDeliverable.status,
        dueAt: projectDeliverable.dueAt,
      })
      .from(projectDeliverable)
      .where(and(inArray(projectDeliverable.projectId, ids), eq(projectDeliverable.visibleToClient, true))),
    db
      .select({
        projectId: projectMilestone.projectId,
        dueAt: projectMilestone.dueAt,
        completedAt: projectMilestone.completedAt,
      })
      .from(projectMilestone)
      .where(inArray(projectMilestone.projectId, ids)),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  return rows.map((r) => {
    const summary: ProjectSummary = summarizeProject(
      dels.filter((d) => d.projectId === r.id),
      miles.filter((m) => m.projectId === r.id),
      today,
    );
    return { ...r, summary };
  });
}

export async function getPortalProject(ctx: PortalContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      id: project.id,
      title: project.title,
      status: project.status,
      startedAt: project.startedAt,
      endedAt: project.endedAt,
      showHoursToClient: project.showHoursToClient,
      companyName: crmCompany.name,
      ownerName: users.name,
    })
    .from(project)
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .innerJoin(users, eq(project.ownerId, users.id))
    .where(and(eq(project.id, id), inOrganization(ctx)))
    .limit(1);
  return row ?? null;
}

export function listPortalPhases(ctx: PortalContext, projectId: string) {
  return db
    .select({
      id: projectPhase.id,
      name: projectPhase.name,
      position: projectPhase.position,
      startedAt: projectPhase.startedAt,
      endedAt: projectPhase.endedAt,
    })
    .from(projectPhase)
    .innerJoin(project, eq(projectPhase.projectId, project.id))
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(and(eq(projectPhase.projectId, projectId), inOrganization(ctx)))
    .orderBy(asc(projectPhase.position));
}

export function listPortalMilestones(ctx: PortalContext, projectId: string) {
  return db
    .select({
      id: projectMilestone.id,
      name: projectMilestone.name,
      dueAt: projectMilestone.dueAt,
      completedAt: projectMilestone.completedAt,
      phaseId: projectMilestone.phaseId,
    })
    .from(projectMilestone)
    .innerJoin(project, eq(projectMilestone.projectId, project.id))
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(and(eq(projectMilestone.projectId, projectId), inOrganization(ctx)))
    .orderBy(asc(projectMilestone.dueAt));
}

/** Só entregas marcadas como visíveis. Sem descrição: a lista não precisa dela. */
export function listPortalDeliverables(ctx: PortalContext, projectId: string) {
  return db
    .select({
      id: projectDeliverable.id,
      title: projectDeliverable.title,
      status: projectDeliverable.status,
      dueAt: projectDeliverable.dueAt,
      completedAt: projectDeliverable.completedAt,
      phaseId: projectDeliverable.phaseId,
    })
    .from(projectDeliverable)
    .innerJoin(project, eq(projectDeliverable.projectId, project.id))
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(
      and(
        eq(projectDeliverable.projectId, projectId),
        eq(projectDeliverable.visibleToClient, true),
        inOrganization(ctx),
      ),
    )
    .orderBy(asc(projectDeliverable.dueAt), asc(projectDeliverable.position));
}

/**
 * Entrega visível de um projeto da organização ativa. A descrição sai sem o
 * motivo de bloqueio (nota interna). Devolve só metadados do arquivo.
 */
export async function getPortalDeliverable(ctx: PortalContext, projectId: string, deliverableId: string) {
  if (!isUuid(projectId) || !isUuid(deliverableId)) return null;
  const [row] = await db
    .select({
      id: projectDeliverable.id,
      projectId: projectDeliverable.projectId,
      title: projectDeliverable.title,
      description: projectDeliverable.description,
      status: projectDeliverable.status,
      dueAt: projectDeliverable.dueAt,
      phaseName: projectPhase.name,
      assigneeName: users.name,
      fileId: projectDeliverable.fileId,
      fileName: files.originalName,
      fileSize: files.sizeBytes,
      fileCreatedAt: files.createdAt,
    })
    .from(projectDeliverable)
    .innerJoin(project, eq(projectDeliverable.projectId, project.id))
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .leftJoin(projectPhase, eq(projectDeliverable.phaseId, projectPhase.id))
    .leftJoin(users, eq(projectDeliverable.assigneeId, users.id))
    .leftJoin(files, eq(projectDeliverable.fileId, files.id))
    .where(
      and(
        eq(projectDeliverable.id, deliverableId),
        eq(projectDeliverable.projectId, projectId),
        eq(projectDeliverable.visibleToClient, true),
        inOrganization(ctx),
      ),
    )
    .limit(1);
  if (!row) return null;
  return { ...row, description: stripInternalNotes(row.description) };
}

/**
 * Comentários de uma entrega visível da organização ativa. Comentário
 * apagado sai com `body = null` para manter a conversa encadeada.
 */
export async function listPortalComments(ctx: PortalContext, deliverableId: string) {
  if (!isUuid(deliverableId)) return [];
  const rows = await db
    .select({
      id: projectDeliverableComment.id,
      parentId: projectDeliverableComment.parentId,
      body: projectDeliverableComment.body,
      deletedAt: projectDeliverableComment.deletedAt,
      authorId: projectDeliverableComment.authorId,
      authorName: users.name,
      authorRole: users.role,
      createdAt: projectDeliverableComment.createdAt,
      updatedAt: projectDeliverableComment.updatedAt,
    })
    .from(projectDeliverableComment)
    .innerJoin(users, eq(projectDeliverableComment.authorId, users.id))
    .innerJoin(projectDeliverable, eq(projectDeliverableComment.deliverableId, projectDeliverable.id))
    .innerJoin(project, eq(projectDeliverable.projectId, project.id))
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(
      and(
        eq(projectDeliverableComment.deliverableId, deliverableId),
        eq(projectDeliverable.visibleToClient, true),
        inOrganization(ctx),
      ),
    )
    .orderBy(asc(projectDeliverableComment.createdAt));
  return rows.map((r) => ({ ...r, body: r.deletedAt ? null : r.body }));
}

/** Entrega visível na organização ativa (ids e títulos). Base das validações de escrita. */
export async function findVisibleDeliverable(ctx: PortalContext, deliverableId: string) {
  if (!isUuid(deliverableId)) return null;
  const [row] = await db
    .select({
      id: projectDeliverable.id,
      projectId: projectDeliverable.projectId,
      title: projectDeliverable.title,
      projectTitle: project.title,
    })
    .from(projectDeliverable)
    .innerJoin(project, eq(projectDeliverable.projectId, project.id))
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(
      and(
        eq(projectDeliverable.id, deliverableId),
        eq(projectDeliverable.visibleToClient, true),
        inOrganization(ctx),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Arquivo anexado a uma entrega visível da organização ativa. O único caminho
 * de download do portal: valida arquivo → entrega visível → projeto → empresa → organização.
 */
export async function getPortalDeliverableFile(ctx: PortalContext, projectId: string, deliverableId: string) {
  if (!isUuid(projectId) || !isUuid(deliverableId)) return null;
  const [row] = await db
    .select({ id: files.id, bucketKey: files.bucketKey, originalName: files.originalName })
    .from(projectDeliverable)
    .innerJoin(project, eq(projectDeliverable.projectId, project.id))
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .innerJoin(files, eq(projectDeliverable.fileId, files.id))
    .where(
      and(
        eq(projectDeliverable.id, deliverableId),
        eq(projectDeliverable.projectId, projectId),
        eq(projectDeliverable.visibleToClient, true),
        inOrganization(ctx),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Decisões do cliente sobre a entrega, da mais recente para a mais antiga (admin e portal). */
export function listDeliverableAcceptances(deliverableId: string) {
  if (!isUuid(deliverableId)) return Promise.resolve([]);
  return db
    .select({ id: projectDeliverableAcceptance.id, decision: projectDeliverableAcceptance.decision, notes: projectDeliverableAcceptance.notes, createdAt: projectDeliverableAcceptance.createdAt, userName: users.name })
    .from(projectDeliverableAcceptance)
    .innerJoin(users, eq(projectDeliverableAcceptance.userId, users.id))
    .where(eq(projectDeliverableAcceptance.deliverableId, deliverableId))
    .orderBy(desc(projectDeliverableAcceptance.createdAt));
}

/** Última decisão do cliente por entrega concluída do projeto (para a lista do portal). */
export async function listLatestAcceptancesByProject(projectId: string): Promise<Map<string, "approved" | "changes_requested">> {
  if (!isUuid(projectId)) return new Map();
  const rows = await db.execute<{ deliverable_id: string; decision: "approved" | "changes_requested" }>(sql`
    select distinct on (a.deliverable_id) a.deliverable_id, a.decision
    from project_deliverable_acceptance a join project_deliverable d on d.id = a.deliverable_id
    where d.project_id = ${projectId} order by a.deliverable_id, a.created_at desc
  `);
  return new Map(rows.map((r) => [r.deliverable_id, r.decision]));
}
