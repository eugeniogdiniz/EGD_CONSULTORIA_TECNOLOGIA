import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmOpportunity,
  files as filesTable,
  project,
  projectDeliverable,
  projectDeliverableComment,
  projectDeliverableDependency,
  projectExpense,
  projectMilestone,
  projectPhase,
  projectTemplate,
  projectTemplateDeliverable,
  projectTemplatePhase,
  projectTimeEntry,
  users,
} from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { uploadFile } from "@/modules/files/actions";
import { reorderPositions } from "./reorder";
import { detectDependencyCycle } from "./dependency";
import { computeMinutes } from "./time-math";
import {
  changeDeliverableStatusSchema,
  changeProjectStatusSchema,
  commentSchema,
  createProjectFromOpportunitySchema,
  createTemplateFromProjectSchema,
  deliverableSchema,
  dependencySchema,
  expenseSchema,
  manualTimeSchema,
  milestoneSchema,
  phaseSchema,
  projectSchema,
  reorderDeliverableSchema,
  startTimerSchema,
  templateSchema,
  updateAccountRateSchema,
  updateCommentSchema,
  type ChangeDeliverableStatusInput,
  type ChangeProjectStatusInput,
  type CommentInput,
  type CreateProjectFromOpportunityInput,
  type CreateTemplateFromProjectInput,
  type DeliverableInput,
  type DependencyInput,
  type ExpenseInput,
  type ManualTimeInput,
  type MilestoneInput,
  type PhaseInput,
  type ProjectInput,
  type ReorderDeliverableInput,
  type StartTimerInput,
  type TemplateInput,
  type UpdateAccountRateInput,
  type UpdateCommentInput,
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

  const templateId = parsed.data.templateId;
  let template: { id: string; name: string } | null = null;
  if (templateId) {
    const found = await db.query.projectTemplate.findFirst({
      where: eq(projectTemplate.id, templateId),
      columns: { id: true, name: true },
    });
    if (!found) return fail("Modelo não encontrado.");
    template = found;
  }

  try {
    const projectId = await db.transaction(async (tx) => {
      const [row] = await tx
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

      if (template) {
        const tphases = await tx
          .select()
          .from(projectTemplatePhase)
          .where(eq(projectTemplatePhase.templateId, template.id))
          .orderBy(asc(projectTemplatePhase.position));

        const phaseIdByTemplatePhase = new Map<string, string>();
        for (const tp of tphases) {
          const [newPhase] = await tx
            .insert(projectPhase)
            .values({
              projectId: row.id,
              name: tp.name,
              position: tp.position,
              notes: tp.notes,
            })
            .returning({ id: projectPhase.id });
          phaseIdByTemplatePhase.set(tp.id, newPhase.id);
        }

        const tdels = await tx
          .select()
          .from(projectTemplateDeliverable)
          .where(eq(projectTemplateDeliverable.templateId, template.id))
          .orderBy(asc(projectTemplateDeliverable.position));

        for (const td of tdels) {
          await tx.insert(projectDeliverable).values({
            projectId: row.id,
            phaseId: td.phaseId ? phaseIdByTemplatePhase.get(td.phaseId) ?? null : null,
            title: td.title,
            description: td.description,
            status: "todo",
            position: td.position,
            assigneeId: ctx.user.id,
            ownerId: ctx.user.id,
          });
        }
      }

      return row.id;
    });

    await audit({
      actorId: ctx.user.id,
      action: template ? "project.created_from_template" : "project.created_from_opportunity",
      entityType: "project",
      entityId: projectId,
      metadata: template
        ? { opportunityId: opp.id, companyId: opp.companyId, templateId: template.id }
        : { opportunityId: opp.id, companyId: opp.companyId },
    });
    return ok({ id: projectId });
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

export async function setDeliverableVisibility(
  ctx: AdminContext,
  id: string,
  visible: boolean,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Entrega não encontrada.");
  const [row] = await db
    .update(projectDeliverable)
    .set({ visibleToClient: visible })
    .where(eq(projectDeliverable.id, id))
    .returning({ id: projectDeliverable.id });
  if (!row) return fail("Entrega não encontrada.");
  await audit({
    actorId: ctx.user.id,
    action: visible ? "project.deliverable.shared_with_client" : "project.deliverable.hidden_from_client",
    entityType: "project_deliverable",
    entityId: id,
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

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Dependências
// ────────────────────────────────────────────────────────────────────────────

export async function createDependency(
  ctx: AdminContext,
  input: DependencyInput,
): Promise<ActionResult<null>> {
  const parsed = dependencySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { predecessorId, successorId } = parsed.data;

  const both = await db
    .select({ id: projectDeliverable.id, projectId: projectDeliverable.projectId })
    .from(projectDeliverable)
    .where(sql`${projectDeliverable.id} in (${predecessorId}, ${successorId})`);
  if (both.length !== 2) return fail("Entrega não encontrada.");
  if (both[0].projectId !== both[1].projectId)
    return fail("Dependência precisa ser entre entregas do mesmo projeto.");

  const projectId = both[0].projectId;
  const edges = await db
    .select({
      predecessorId: projectDeliverableDependency.predecessorId,
      successorId: projectDeliverableDependency.successorId,
    })
    .from(projectDeliverableDependency)
    .innerJoin(
      projectDeliverable,
      eq(projectDeliverableDependency.successorId, projectDeliverable.id),
    )
    .where(eq(projectDeliverable.projectId, projectId));

  if (detectDependencyCycle(edges, predecessorId, successorId))
    return fail("Esta dependência criaria um ciclo.");

  try {
    await db.insert(projectDeliverableDependency).values({ predecessorId, successorId });
  } catch (err) {
    if ((err as { code?: string } | undefined)?.code === "23505")
      return fail("Essa dependência já existe.");
    throw err;
  }

  await audit({
    actorId: ctx.user.id,
    action: "project.dependency.created",
    entityType: "project_deliverable",
    entityId: successorId,
    metadata: { predecessorId },
  });
  return ok(null);
}

export async function deleteDependency(
  ctx: AdminContext,
  input: DependencyInput,
): Promise<ActionResult<null>> {
  const parsed = dependencySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { predecessorId, successorId } = parsed.data;

  const [row] = await db
    .delete(projectDeliverableDependency)
    .where(
      and(
        eq(projectDeliverableDependency.predecessorId, predecessorId),
        eq(projectDeliverableDependency.successorId, successorId),
      ),
    )
    .returning({ successorId: projectDeliverableDependency.successorId });
  if (!row) return fail("Dependência não encontrada.");

  await audit({
    actorId: ctx.user.id,
    action: "project.dependency.deleted",
    entityType: "project_deliverable",
    entityId: successorId,
    metadata: { predecessorId },
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Comentários
// ────────────────────────────────────────────────────────────────────────────

export async function createComment(
  ctx: AdminContext,
  input: CommentInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const target = await db.query.projectDeliverable.findFirst({
    where: eq(projectDeliverable.id, data.deliverableId),
    columns: { id: true },
  });
  if (!target) return fail("Entrega não encontrada.");

  if (data.parentId) {
    const parent = await db.query.projectDeliverableComment.findFirst({
      where: eq(projectDeliverableComment.id, data.parentId),
      columns: { id: true, deliverableId: true, parentId: true },
    });
    if (!parent) return fail("Comentário-pai não encontrado.");
    if (parent.deliverableId !== data.deliverableId)
      return fail("Comentário-pai não pertence a esta entrega.");
    if (parent.parentId !== null)
      return fail("Não é possível responder a uma resposta. Comente na raiz.");
  }

  try {
    const [row] = await db
      .insert(projectDeliverableComment)
      .values({
        deliverableId: data.deliverableId,
        parentId: data.parentId,
        authorId: ctx.user.id,
        body: data.body,
      })
      .returning({ id: projectDeliverableComment.id });

    await audit({
      actorId: ctx.user.id,
      action: "project.comment.created",
      entityType: "project_deliverable",
      entityId: data.deliverableId,
      metadata: { commentId: row.id, isReply: data.parentId !== null },
    });
    return ok({ id: row.id });
  } catch (err) {
    const msg = (err as { message?: string } | undefined)?.message ?? "";
    if (msg.includes("comment threading limited"))
      return fail("Não é possível responder a uma resposta. Comente na raiz.");
    throw err;
  }
}

export async function updateComment(
  ctx: AdminContext,
  id: string,
  input: UpdateCommentInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Comentário não encontrado.");
  const parsed = updateCommentSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  const existing = await db.query.projectDeliverableComment.findFirst({
    where: eq(projectDeliverableComment.id, id),
    columns: { id: true, authorId: true, deletedAt: true, deliverableId: true },
  });
  if (!existing || existing.deletedAt) return fail("Comentário não encontrado.");
  if (existing.authorId !== ctx.user.id) return fail("Só o autor pode editar.");

  await db
    .update(projectDeliverableComment)
    .set({ body: parsed.data.body })
    .where(eq(projectDeliverableComment.id, id));

  await audit({
    actorId: ctx.user.id,
    action: "project.comment.updated",
    entityType: "project_deliverable",
    entityId: existing.deliverableId,
    metadata: { commentId: id },
  });
  return ok(null);
}

export async function deleteComment(
  ctx: AdminContext,
  id: string,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Comentário não encontrado.");
  const existing = await db.query.projectDeliverableComment.findFirst({
    where: eq(projectDeliverableComment.id, id),
    columns: { id: true, authorId: true, deletedAt: true, deliverableId: true },
  });
  if (!existing || existing.deletedAt) return fail("Comentário não encontrado.");
  if (existing.authorId !== ctx.user.id) return fail("Só o autor pode deletar.");

  await db
    .update(projectDeliverableComment)
    .set({ deletedAt: new Date() })
    .where(eq(projectDeliverableComment.id, id));

  await audit({
    actorId: ctx.user.id,
    action: "project.comment.deleted",
    entityType: "project_deliverable",
    entityId: existing.deliverableId,
    metadata: { commentId: id },
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Timer + entrada manual
// ────────────────────────────────────────────────────────────────────────────

/**
 * Se já existe entrada aberta pra este usuário, é fechada em transação
 * antes de abrir a nova. Devolve `wasRunningElsewhere: true` quando isso
 * acontece pra UI conseguir avisar.
 */
export async function startTimer(
  ctx: AdminContext,
  input: StartTimerInput,
): Promise<ActionResult<{ id: string; wasRunningElsewhere: boolean }>> {
  const parsed = startTimerSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const target = await db.query.projectDeliverable.findFirst({
    where: eq(projectDeliverable.id, data.deliverableId),
    columns: { id: true },
  });
  if (!target) return fail("Entrega não encontrada.");

  const result = await db.transaction(async (tx) => {
    const open = await tx
      .select({
        id: projectTimeEntry.id,
        startedAt: projectTimeEntry.startedAt,
        deliverableId: projectTimeEntry.deliverableId,
      })
      .from(projectTimeEntry)
      .where(
        and(eq(projectTimeEntry.userId, ctx.user.id), isNull(projectTimeEntry.endedAt)),
      )
      .limit(1);

    let closed: { id: string; deliverableId: string } | null = null;
    if (open.length > 0) {
      const openEntry = open[0];
      const endedAt = new Date();
      const minutes = computeMinutes(openEntry.startedAt, endedAt);
      await tx
        .update(projectTimeEntry)
        .set({ endedAt, minutes })
        .where(eq(projectTimeEntry.id, openEntry.id));
      closed = { id: openEntry.id, deliverableId: openEntry.deliverableId };
    }

    const [row] = await tx
      .insert(projectTimeEntry)
      .values({
        deliverableId: data.deliverableId,
        userId: ctx.user.id,
        startedAt: new Date(),
        source: "timer",
        notes: data.notes,
      })
      .returning({ id: projectTimeEntry.id });
    return { newId: row.id, closed };
  });

  if (result.closed) {
    await audit({
      actorId: ctx.user.id,
      action: "project.time.stopped",
      entityType: "project_deliverable",
      entityId: result.closed.deliverableId,
      metadata: { entryId: result.closed.id, reason: "replaced_by_new_timer" },
    });
  }
  await audit({
    actorId: ctx.user.id,
    action: "project.time.started",
    entityType: "project_deliverable",
    entityId: data.deliverableId,
    metadata: { entryId: result.newId },
  });
  return ok({ id: result.newId, wasRunningElsewhere: result.closed !== null });
}

export async function stopTimer(
  ctx: AdminContext,
  entryId: string,
): Promise<ActionResult<{ minutes: number }>> {
  if (!isUuid(entryId)) return fail("Entrada não encontrada.");
  const existing = await db.query.projectTimeEntry.findFirst({
    where: eq(projectTimeEntry.id, entryId),
    columns: { id: true, userId: true, startedAt: true, endedAt: true, deliverableId: true },
  });
  if (!existing) return fail("Entrada não encontrada.");
  if (existing.userId !== ctx.user.id) return fail("Você não é dono desta entrada.");
  if (existing.endedAt) return fail("Esta entrada já foi parada.");

  const endedAt = new Date();
  const minutes = computeMinutes(existing.startedAt, endedAt);
  await db
    .update(projectTimeEntry)
    .set({ endedAt, minutes })
    .where(eq(projectTimeEntry.id, entryId));

  await audit({
    actorId: ctx.user.id,
    action: "project.time.stopped",
    entityType: "project_deliverable",
    entityId: existing.deliverableId,
    metadata: { entryId, minutes },
  });
  return ok({ minutes });
}

export async function logManualTime(
  ctx: AdminContext,
  input: ManualTimeInput,
): Promise<ActionResult<{ id: string; minutes: number }>> {
  const parsed = manualTimeSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const target = await db.query.projectDeliverable.findFirst({
    where: eq(projectDeliverable.id, data.deliverableId),
    columns: { id: true },
  });
  if (!target) return fail("Entrega não encontrada.");

  const minutes = computeMinutes(data.startedAt, data.endedAt);
  const [row] = await db
    .insert(projectTimeEntry)
    .values({
      deliverableId: data.deliverableId,
      userId: ctx.user.id,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      minutes,
      source: "manual",
      notes: data.notes,
    })
    .returning({ id: projectTimeEntry.id });

  await audit({
    actorId: ctx.user.id,
    action: "project.time.logged",
    entityType: "project_deliverable",
    entityId: data.deliverableId,
    metadata: { entryId: row.id, minutes },
  });
  return ok({ id: row.id, minutes });
}

export async function deleteTimeEntry(
  ctx: AdminContext,
  entryId: string,
): Promise<ActionResult<null>> {
  if (!isUuid(entryId)) return fail("Entrada não encontrada.");
  const existing = await db.query.projectTimeEntry.findFirst({
    where: eq(projectTimeEntry.id, entryId),
    columns: { id: true, userId: true, deliverableId: true },
  });
  if (!existing) return fail("Entrada não encontrada.");
  if (existing.userId !== ctx.user.id) return fail("Você não é dono desta entrada.");

  await db.delete(projectTimeEntry).where(eq(projectTimeEntry.id, entryId));
  await audit({
    actorId: ctx.user.id,
    action: "project.time.deleted",
    entityType: "project_deliverable",
    entityId: existing.deliverableId,
    metadata: { entryId },
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Despesas
// ────────────────────────────────────────────────────────────────────────────

export async function createExpense(
  ctx: AdminContext,
  input: ExpenseInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const proj = await db.query.project.findFirst({
    where: eq(project.id, data.projectId),
    columns: { id: true },
  });
  if (!proj) return fail("Projeto não encontrado.");

  const [row] = await db
    .insert(projectExpense)
    .values({
      projectId: data.projectId,
      description: data.description,
      amountCents: data.amountCents,
      kind: data.kind,
      dateAt: data.dateAt,
      notes: data.notes,
      createdBy: ctx.user.id,
    })
    .returning({ id: projectExpense.id });

  await audit({
    actorId: ctx.user.id,
    action: "project.expense.created",
    entityType: "project_expense",
    entityId: row.id,
    metadata: { projectId: data.projectId, amountCents: data.amountCents },
  });
  return ok({ id: row.id });
}

export async function updateExpense(
  ctx: AdminContext,
  id: string,
  input: ExpenseInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Despesa não encontrada.");
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const [row] = await db
    .update(projectExpense)
    .set({
      description: data.description,
      amountCents: data.amountCents,
      kind: data.kind,
      dateAt: data.dateAt,
      notes: data.notes,
    })
    .where(and(eq(projectExpense.id, id), eq(projectExpense.projectId, data.projectId)))
    .returning({ id: projectExpense.id });
  if (!row) return fail("Despesa não encontrada.");

  await audit({
    actorId: ctx.user.id,
    action: "project.expense.updated",
    entityType: "project_expense",
    entityId: id,
    metadata: { projectId: data.projectId, amountCents: data.amountCents },
  });
  return ok(null);
}

export async function deleteExpense(
  ctx: AdminContext,
  id: string,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Despesa não encontrada.");
  const [row] = await db
    .delete(projectExpense)
    .where(eq(projectExpense.id, id))
    .returning({ id: projectExpense.id, projectId: projectExpense.projectId });
  if (!row) return fail("Despesa não encontrada.");

  await audit({
    actorId: ctx.user.id,
    action: "project.expense.deleted",
    entityType: "project_expense",
    entityId: id,
    metadata: { projectId: row.projectId },
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Templates
// ────────────────────────────────────────────────────────────────────────────

export async function createTemplateFromProject(
  ctx: AdminContext,
  projectId: string,
  input: CreateTemplateFromProjectInput,
): Promise<ActionResult<{ id: string }>> {
  if (!isUuid(projectId)) return fail("Projeto não encontrado.");
  const parsed = createTemplateFromProjectSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const proj = await db.query.project.findFirst({
    where: eq(project.id, projectId),
    columns: { id: true },
  });
  if (!proj) return fail("Projeto não encontrado.");

  try {
    const result = await db.transaction(async (tx) => {
      const [tmpl] = await tx
        .insert(projectTemplate)
        .values({ name: data.name, description: data.description, ownerId: ctx.user.id })
        .returning({ id: projectTemplate.id });

      const phases = await tx
        .select()
        .from(projectPhase)
        .where(eq(projectPhase.projectId, projectId))
        .orderBy(asc(projectPhase.position));

      const phaseMap = new Map<string, string>();
      for (const p of phases) {
        const [tp] = await tx
          .insert(projectTemplatePhase)
          .values({ templateId: tmpl.id, name: p.name, position: p.position, notes: p.notes })
          .returning({ id: projectTemplatePhase.id });
        phaseMap.set(p.id, tp.id);
      }

      const dels = await tx
        .select()
        .from(projectDeliverable)
        .where(eq(projectDeliverable.projectId, projectId))
        .orderBy(asc(projectDeliverable.position));

      let deliverableCount = 0;
      for (const d of dels) {
        await tx.insert(projectTemplateDeliverable).values({
          templateId: tmpl.id,
          phaseId: d.phaseId ? phaseMap.get(d.phaseId) ?? null : null,
          title: d.title,
          description: d.description,
          position: d.position,
        });
        deliverableCount += 1;
      }

      return { id: tmpl.id, deliverableCount };
    });

    await audit({
      actorId: ctx.user.id,
      action: "project.template.created",
      entityType: "project_template",
      entityId: result.id,
      metadata: { fromProjectId: projectId, deliverableCount: result.deliverableCount },
    });
    return ok({ id: result.id });
  } catch (err) {
    if ((err as { code?: string } | undefined)?.code === "23505")
      return fail("Já existe um template com esse nome.");
    throw err;
  }
}

export async function updateTemplate(
  ctx: AdminContext,
  id: string,
  input: TemplateInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Modelo não encontrado.");
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  try {
    const [row] = await db
      .update(projectTemplate)
      .set({ name: data.name, description: data.description })
      .where(eq(projectTemplate.id, id))
      .returning({ id: projectTemplate.id });
    if (!row) return fail("Modelo não encontrado.");
  } catch (err) {
    if ((err as { code?: string } | undefined)?.code === "23505")
      return fail("Já existe um template com esse nome.");
    throw err;
  }

  await audit({
    actorId: ctx.user.id,
    action: "project.template.updated",
    entityType: "project_template",
    entityId: id,
    metadata: { name: data.name },
  });
  return ok(null);
}

export async function deleteTemplate(
  ctx: AdminContext,
  id: string,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Modelo não encontrado.");
  const [row] = await db
    .delete(projectTemplate)
    .where(eq(projectTemplate.id, id))
    .returning({ id: projectTemplate.id });
  if (!row) return fail("Modelo não encontrado.");

  await audit({
    actorId: ctx.user.id,
    action: "project.template.deleted",
    entityType: "project_template",
    entityId: id,
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Reorder de entrega (kanban drag)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Move uma entrega para `toStatus` na posição `toPosition` da coluna alvo,
 * renumerando com two-pass (bump negativo → posições finais) pra não
 * colidir com a ordem estável dentro da coluna. Preserva a regra do
 * kanban: mover pra `blocked` exige motivo mínimo.
 */
export async function reorderDeliverable(
  ctx: AdminContext,
  input: ReorderDeliverableInput,
): Promise<ActionResult<null>> {
  const parsed = reorderDeliverableSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { deliverableId, toStatus, toPosition, blockReason } = parsed.data;

  if (toStatus === "blocked" && (blockReason ?? "").length < 3)
    return fail("Descreva o motivo do bloqueio.", {
      blockReason: ["Descreva o motivo do bloqueio."],
    });

  const existing = await db.query.projectDeliverable.findFirst({
    where: eq(projectDeliverable.id, deliverableId),
    columns: {
      id: true,
      projectId: true,
      status: true,
      description: true,
      completedAt: true,
    },
  });
  if (!existing) return fail("Entrega não encontrada.");

  const statusChanged = existing.status !== toStatus;

  await db.transaction(async (tx) => {
    if (statusChanged) {
      const patch: {
        status: typeof toStatus;
        completedAt: Date | null;
        description: string | null;
      } = {
        status: toStatus,
        completedAt: existing.completedAt,
        description: existing.description,
      };
      if (toStatus === "done") patch.completedAt = new Date();
      else patch.completedAt = null;
      if (toStatus === "blocked" && blockReason) {
        const prev = existing.description ?? "";
        patch.description = prev
          ? `${prev}\n\n## Bloqueio\n${blockReason}`
          : `## Bloqueio\n${blockReason}`;
      }
      await tx.update(projectDeliverable).set(patch).where(eq(projectDeliverable.id, deliverableId));
    }

    const columnItems = await tx
      .select({ id: projectDeliverable.id, position: projectDeliverable.position })
      .from(projectDeliverable)
      .where(
        and(
          eq(projectDeliverable.projectId, existing.projectId),
          eq(projectDeliverable.status, toStatus),
        ),
      )
      .orderBy(asc(projectDeliverable.position));

    const withoutMoved = columnItems.filter((item) => item.id !== deliverableId);
    const clampedPos = Math.max(0, Math.min(toPosition, withoutMoved.length));
    const final = [
      ...withoutMoved.slice(0, clampedPos),
      { id: deliverableId, position: -1 },
      ...withoutMoved.slice(clampedPos),
    ].map((item, i) => ({ id: item.id, position: i }));

    for (const [i, item] of final.entries()) {
      await tx
        .update(projectDeliverable)
        .set({ position: -1 - i })
        .where(eq(projectDeliverable.id, item.id));
    }
    for (const item of final) {
      await tx
        .update(projectDeliverable)
        .set({ position: item.position })
        .where(eq(projectDeliverable.id, item.id));
    }
  });

  if (statusChanged) {
    await audit({
      actorId: ctx.user.id,
      action: "project.deliverable.status_changed",
      entityType: "project_deliverable",
      entityId: deliverableId,
      metadata:
        toStatus === "blocked"
          ? { from: existing.status, to: toStatus, reason: blockReason, via: "drag" }
          : { from: existing.status, to: toStatus, via: "drag" },
    });
  } else {
    await audit({
      actorId: ctx.user.id,
      action: "project.deliverable.reordered",
      entityType: "project_deliverable",
      entityId: deliverableId,
      metadata: { toPosition, via: "drag" },
    });
  }
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Conta: rate por hora
// ────────────────────────────────────────────────────────────────────────────

export async function updateAccountRate(
  ctx: AdminContext,
  input: UpdateAccountRateInput,
): Promise<ActionResult<null>> {
  const parsed = updateAccountRateSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const rate = parsed.data.hourlyRateCents;

  await db.update(users).set({ hourlyRateCents: rate }).where(eq(users.id, ctx.user.id));
  await audit({
    actorId: ctx.user.id,
    action: "project.account.rate_updated",
    entityType: "user",
    entityId: ctx.user.id,
    metadata: { hourlyRateCents: rate },
  });
  return ok(null);
}
