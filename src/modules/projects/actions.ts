import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmOpportunity,
  files as filesTable,
  project,
  projectDeliverable,
  projectMilestone,
  projectPhase,
} from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { uploadFile } from "@/modules/files/actions";
import { reorderPositions } from "./reorder";
import {
  changeDeliverableStatusSchema,
  changeProjectStatusSchema,
  createProjectFromOpportunitySchema,
  deliverableSchema,
  milestoneSchema,
  phaseSchema,
  projectSchema,
  type ChangeDeliverableStatusInput,
  type ChangeProjectStatusInput,
  type CreateProjectFromOpportunityInput,
  type DeliverableInput,
  type MilestoneInput,
  type PhaseInput,
  type ProjectInput,
} from "./validation";

/**
 * Cria projeto a partir de uma oportunidade ganha. Unique constraint em
 * opportunity_id garante 1:1; interceptamos `23505` pra devolver mensagem
 * amigável com o projeto existente.
 */
export async function createProjectFromOpportunity(
  ctx: AdminContext,
  opportunityId: string,
  input: CreateProjectFromOpportunityInput,
): Promise<ActionResult<{ id: string }>> {
  if (!isUuid(opportunityId)) return fail("Oportunidade não encontrada.");
  const parsed = createProjectFromOpportunitySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const opp = await db.query.crmOpportunity.findFirst({
    where: eq(crmOpportunity.id, opportunityId),
    columns: { id: true, stage: true, companyId: true, valueCents: true, currency: true },
  });
  if (!opp) return fail("Oportunidade não encontrada.");
  if (opp.stage !== "won") return fail("Só oportunidades ganhas viram projeto.");

  const existing = await db.query.project.findFirst({
    where: eq(project.opportunityId, opportunityId),
    columns: { id: true, title: true },
  });
  if (existing)
    return fail(`Esta oportunidade já tem um projeto: "${existing.title}".`);

  try {
    const [row] = await db
      .insert(project)
      .values({
        opportunityId: opp.id,
        companyId: opp.companyId,
        title: parsed.data.title,
        status: "planning",
        budgetCents: parsed.data.copyValue ? opp.valueCents : null,
        currency: opp.currency,
        ownerId: ctx.user.id,
      })
      .returning({ id: project.id });

    await audit({
      actorId: ctx.user.id,
      action: "project.created_from_opportunity",
      entityType: "project",
      entityId: row.id,
      metadata: { opportunityId: opp.id, companyId: opp.companyId },
    });
    return ok({ id: row.id });
  } catch (err) {
    // 23505 = unique_violation. Se dois cliques rápidos criam duas vezes.
    if ((err as { code?: string } | undefined)?.code === "23505") {
      const dup = await db.query.project.findFirst({
        where: eq(project.opportunityId, opportunityId),
        columns: { id: true, title: true },
      });
      return fail(
        `Esta oportunidade já tem um projeto${dup ? `: "${dup.title}"` : ""}.`,
      );
    }
    throw err;
  }
}

export async function updateProject(
  ctx: AdminContext,
  id: string,
  input: ProjectInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Projeto não encontrado.");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const existing = await db.query.project.findFirst({ where: eq(project.id, id) });
  if (!existing) return fail("Projeto não encontrado.");

  await db
    .update(project)
    .set({
      title: data.title,
      budgetCents: data.budgetCents,
      currency: data.currency,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      notes: data.notes,
    })
    .where(eq(project.id, id));

  await audit({
    actorId: ctx.user.id,
    action: "project.updated",
    entityType: "project",
    entityId: id,
    metadata: { title: data.title },
  });
  return ok(null);
}

/**
 * Muda o status. Delivered/cancelled gravam endedAt = hoje; reabrir zera.
 * Mesmo status devolve ok(null) sem gravar audit.
 */
export async function changeProjectStatus(
  ctx: AdminContext,
  id: string,
  input: ChangeProjectStatusInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Projeto não encontrado.");
  const parsed = changeProjectStatusSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { to } = parsed.data;

  const existing = await db.query.project.findFirst({ where: eq(project.id, id) });
  if (!existing) return fail("Projeto não encontrado.");
  if (existing.status === to) return ok(null);

  const today = new Date().toISOString().slice(0, 10);
  const patch: { status: typeof to; endedAt: string | null } = {
    status: to,
    endedAt: existing.endedAt,
  };
  if (to === "delivered" || to === "cancelled") patch.endedAt = today;
  else patch.endedAt = null;

  await db.update(project).set(patch).where(eq(project.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "project.status_changed",
    entityType: "project",
    entityId: id,
    metadata: { from: existing.status, to },
  });
  return ok(null);
}

export async function archiveProject(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Projeto não encontrado.");
  const [row] = await db
    .update(project)
    .set({ archivedAt: new Date() })
    .where(and(eq(project.id, id), isNull(project.archivedAt)))
    .returning({ id: project.id });
  if (!row) return fail("Projeto não encontrado ou já arquivado.");
  await audit({
    actorId: ctx.user.id,
    action: "project.archived",
    entityType: "project",
    entityId: id,
  });
  return ok(null);
}

export async function unarchiveProject(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Projeto não encontrado.");
  const [row] = await db
    .update(project)
    .set({ archivedAt: null })
    .where(eq(project.id, id))
    .returning({ id: project.id });
  if (!row) return fail("Projeto não encontrado.");
  await audit({
    actorId: ctx.user.id,
    action: "project.unarchived",
    entityType: "project",
    entityId: id,
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Fase
// ────────────────────────────────────────────────────────────────────────────

export async function createPhase(
  ctx: AdminContext,
  input: PhaseInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = phaseSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const proj = await db.query.project.findFirst({
    where: eq(project.id, data.projectId),
    columns: { id: true },
  });
  if (!proj) return fail("Projeto não encontrado.");

  const result = await db.transaction(async (tx) => {
    const [countRow] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(projectPhase)
      .where(eq(projectPhase.projectId, data.projectId));
    const position = countRow?.n ?? 0;

    const [row] = await tx
      .insert(projectPhase)
      .values({
        projectId: data.projectId,
        name: data.name,
        position,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        notes: data.notes,
      })
      .returning({ id: projectPhase.id });
    return row;
  });

  await audit({
    actorId: ctx.user.id,
    action: "project.phase.created",
    entityType: "project_phase",
    entityId: result.id,
    metadata: { projectId: data.projectId },
  });
  return ok({ id: result.id });
}

export async function updatePhase(
  ctx: AdminContext,
  id: string,
  input: PhaseInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Fase não encontrada.");
  const parsed = phaseSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const existing = await db.query.projectPhase.findFirst({ where: eq(projectPhase.id, id) });
  if (!existing) return fail("Fase não encontrada.");
  if (existing.projectId !== data.projectId)
    return fail("Não é possível mover fase entre projetos.");

  await db
    .update(projectPhase)
    .set({ name: data.name, startedAt: data.startedAt, endedAt: data.endedAt, notes: data.notes })
    .where(eq(projectPhase.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "project.phase.updated",
    entityType: "project_phase",
    entityId: id,
  });
  return ok(null);
}

export async function movePhase(
  ctx: AdminContext,
  id: string,
  direction: "up" | "down",
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Fase não encontrada.");
  const existing = await db.query.projectPhase.findFirst({ where: eq(projectPhase.id, id) });
  if (!existing) return fail("Fase não encontrada.");

  await db.transaction(async (tx) => {
    const items = await tx
      .select({ id: projectPhase.id, position: projectPhase.position })
      .from(projectPhase)
      .where(eq(projectPhase.projectId, existing.projectId))
      .orderBy(asc(projectPhase.position));
    const reordered = reorderPositions(items, id, direction);
    // Two-pass: primeiro bump para posições negativas (não colide com o unique
    // parcial em positivos), depois para as finais.
    for (const [i, item] of reordered.entries()) {
      await tx.update(projectPhase).set({ position: -1 - i }).where(eq(projectPhase.id, item.id));
    }
    for (const item of reordered) {
      await tx.update(projectPhase).set({ position: item.position }).where(eq(projectPhase.id, item.id));
    }
  });
  await audit({
    actorId: ctx.user.id,
    action: "project.phase.reordered",
    entityType: "project_phase",
    entityId: id,
    metadata: { direction },
  });
  return ok(null);
}

export async function deletePhase(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Fase não encontrada.");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(projectDeliverable)
    .where(eq(projectDeliverable.phaseId, id));
  if (n > 0)
    return fail(`Esta fase tem ${n} entrega${n === 1 ? "" : "s"}. Mova antes de deletar.`);

  const existing = await db.query.projectPhase.findFirst({ where: eq(projectPhase.id, id) });
  if (!existing) return fail("Fase não encontrada.");

  await db.transaction(async (tx) => {
    await tx.delete(projectPhase).where(eq(projectPhase.id, id));
    const remaining = await tx
      .select({ id: projectPhase.id, position: projectPhase.position })
      .from(projectPhase)
      .where(eq(projectPhase.projectId, existing.projectId))
      .orderBy(asc(projectPhase.position));
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].position !== i) {
        await tx.update(projectPhase).set({ position: i }).where(eq(projectPhase.id, remaining[i].id));
      }
    }
  });
  await audit({
    actorId: ctx.user.id,
    action: "project.phase.deleted",
    entityType: "project_phase",
    entityId: id,
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Marco
// ────────────────────────────────────────────────────────────────────────────

export async function createMilestone(
  ctx: AdminContext,
  input: MilestoneInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;
  const [row] = await db
    .insert(projectMilestone)
    .values({
      projectId: data.projectId,
      phaseId: data.phaseId,
      name: data.name,
      dueAt: data.dueAt,
      notes: data.notes,
    })
    .returning({ id: projectMilestone.id });
  await audit({
    actorId: ctx.user.id,
    action: "project.milestone.created",
    entityType: "project_milestone",
    entityId: row.id,
    metadata: { projectId: data.projectId },
  });
  return ok({ id: row.id });
}

export async function updateMilestone(
  ctx: AdminContext,
  id: string,
  input: MilestoneInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Marco não encontrado.");
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;
  const [row] = await db
    .update(projectMilestone)
    .set({ name: data.name, phaseId: data.phaseId, dueAt: data.dueAt, notes: data.notes })
    .where(eq(projectMilestone.id, id))
    .returning({ id: projectMilestone.id });
  if (!row) return fail("Marco não encontrado.");
  await audit({
    actorId: ctx.user.id,
    action: "project.milestone.updated",
    entityType: "project_milestone",
    entityId: id,
  });
  return ok(null);
}

export async function completeMilestone(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Marco não encontrado.");
  const [row] = await db
    .update(projectMilestone)
    .set({ completedAt: new Date() })
    .where(and(eq(projectMilestone.id, id), isNull(projectMilestone.completedAt)))
    .returning({ id: projectMilestone.id });
  if (!row) return fail("Marco não encontrado ou já concluído.");
  await audit({
    actorId: ctx.user.id,
    action: "project.milestone.completed",
    entityType: "project_milestone",
    entityId: id,
  });
  return ok(null);
}

export async function uncompleteMilestone(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Marco não encontrado.");
  await db.update(projectMilestone).set({ completedAt: null }).where(eq(projectMilestone.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "project.milestone.uncompleted",
    entityType: "project_milestone",
    entityId: id,
  });
  return ok(null);
}

export async function deleteMilestone(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Marco não encontrado.");
  await db.delete(projectMilestone).where(eq(projectMilestone.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "project.milestone.deleted",
    entityType: "project_milestone",
    entityId: id,
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Entrega
// ────────────────────────────────────────────────────────────────────────────

export async function createDeliverable(
  ctx: AdminContext,
  input: DeliverableInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = deliverableSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(projectDeliverable)
    .where(and(eq(projectDeliverable.projectId, data.projectId), eq(projectDeliverable.status, "todo")));

  const [row] = await db
    .insert(projectDeliverable)
    .values({
      projectId: data.projectId,
      phaseId: data.phaseId,
      title: data.title,
      description: data.description,
      status: "todo",
      position: countRow?.n ?? 0,
      assigneeId: data.assigneeId,
      dueAt: data.dueAt,
      ownerId: ctx.user.id,
    })
    .returning({ id: projectDeliverable.id });

  await audit({
    actorId: ctx.user.id,
    action: "project.deliverable.created",
    entityType: "project_deliverable",
    entityId: row.id,
    metadata: { projectId: data.projectId },
  });
  return ok({ id: row.id });
}

export async function updateDeliverable(
  ctx: AdminContext,
  id: string,
  input: DeliverableInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Entrega não encontrada.");
  const parsed = deliverableSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;
  const [row] = await db
    .update(projectDeliverable)
    .set({
      title: data.title,
      description: data.description,
      phaseId: data.phaseId,
      assigneeId: data.assigneeId,
      dueAt: data.dueAt,
    })
    .where(eq(projectDeliverable.id, id))
    .returning({ id: projectDeliverable.id });
  if (!row) return fail("Entrega não encontrada.");
  await audit({
    actorId: ctx.user.id,
    action: "project.deliverable.updated",
    entityType: "project_deliverable",
    entityId: id,
  });
  return ok(null);
}

export async function changeDeliverableStatus(
  ctx: AdminContext,
  id: string,
  input: ChangeDeliverableStatusInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Entrega não encontrada.");
  const parsed = changeDeliverableStatusSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { to, blockReason } = parsed.data;

  const existing = await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, id) });
  if (!existing) return fail("Entrega não encontrada.");
  if (existing.status === to) return ok(null);

  const patch: {
    status: typeof to;
    completedAt: Date | null;
    description: string | null;
  } = {
    status: to,
    completedAt: existing.completedAt,
    description: existing.description,
  };
  if (to === "done") patch.completedAt = new Date();
  else patch.completedAt = null;

  if (to === "blocked" && blockReason) {
    const previous = existing.description ?? "";
    patch.description = previous
      ? `${previous}\n\n## Bloqueio\n${blockReason}`
      : `## Bloqueio\n${blockReason}`;
  }

  await db.update(projectDeliverable).set(patch).where(eq(projectDeliverable.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "project.deliverable.status_changed",
    entityType: "project_deliverable",
    entityId: id,
    metadata: to === "blocked" ? { from: existing.status, to, reason: blockReason } : { from: existing.status, to },
  });
  return ok(null);
}

export async function assignDeliverable(
  ctx: AdminContext,
  id: string,
  userId: string | null,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Entrega não encontrada.");
  if (userId !== null && !isUuid(userId)) return fail("Usuário inválido.");
  await db.update(projectDeliverable).set({ assigneeId: userId }).where(eq(projectDeliverable.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "project.deliverable.assigned",
    entityType: "project_deliverable",
    entityId: id,
    metadata: { to_user_id: userId },
  });
  return ok(null);
}

export async function attachDeliverableFile(
  ctx: AdminContext,
  id: string,
  formData: FormData,
): Promise<ActionResult<{ fileId: string }>> {
  if (!isUuid(id)) return fail("Entrega não encontrada.");
  const existing = await db.query.projectDeliverable.findFirst({
    where: eq(projectDeliverable.id, id),
    columns: { id: true },
  });
  if (!existing) return fail("Entrega não encontrada.");

  if (!formData.has("organizationId")) formData.append("organizationId", "");
  const upload = await uploadFile(ctx, formData);
  if (!upload.ok) return upload;

  await db.update(projectDeliverable).set({ fileId: upload.data.id }).where(eq(projectDeliverable.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "project.deliverable.file_attached",
    entityType: "project_deliverable",
    entityId: id,
    metadata: { fileId: upload.data.id },
  });
  return ok({ fileId: upload.data.id });
}

export async function deleteDeliverable(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Entrega não encontrada.");
  await db.delete(projectDeliverable).where(eq(projectDeliverable.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "project.deliverable.deleted",
    entityType: "project_deliverable",
    entityId: id,
  });
  return ok(null);
}
