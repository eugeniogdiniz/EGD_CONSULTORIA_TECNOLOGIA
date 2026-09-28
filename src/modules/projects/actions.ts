import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmOpportunity,
  project,
} from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import {
  changeProjectStatusSchema,
  createProjectFromOpportunitySchema,
  projectSchema,
  type ChangeProjectStatusInput,
  type CreateProjectFromOpportunityInput,
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
