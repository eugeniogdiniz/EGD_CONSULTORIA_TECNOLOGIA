import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectDeliverable, projectDeliverableAcceptance, projectDeliverableComment } from "@/db/schema";
import { z } from "zod";
import { listDeliverableAcceptances } from "./queries";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import { notifyClientComment, notifyDeliverableDecision } from "@/modules/notifications/events";
import type { PortalContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import {
  commentSchema,
  updateCommentSchema,
  type CommentInput,
  type UpdateCommentInput,
} from "@/modules/projects/validation";
import { findVisibleDeliverable } from "./queries";

const NOT_FOUND = "Entrega não encontrada.";

export async function createClientComment(
  ctx: PortalContext,
  input: CommentInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const target = await findVisibleDeliverable(ctx, data.deliverableId);
  if (!target) return fail(NOT_FOUND);

  if (data.parentId) {
    const parent = await db.query.projectDeliverableComment.findFirst({
      where: eq(projectDeliverableComment.id, data.parentId),
      columns: { id: true, deliverableId: true, parentId: true },
    });
    if (!parent || parent.deliverableId !== data.deliverableId)
      return fail("Comentário-pai não encontrado.");
    if (parent.parentId !== null)
      return fail("Não é possível responder a uma resposta. Comente na raiz.");
  }

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
    action: "portal.comment.created",
    entityType: "project_deliverable",
    entityId: data.deliverableId,
    organizationId: ctx.organization.id,
    metadata: { commentId: row.id, isReply: data.parentId !== null },
  });
  // a equipe recebe no sistema e, conforme a preferência de cada admin, por e-mail (nunca lança)
  await notifyClientComment({
    actorId: ctx.user.id,
    actorName: ctx.user.name,
    organizationId: ctx.organization.id,
    organizationName: ctx.organization.name,
    projectId: target.projectId,
    projectTitle: target.projectTitle,
    deliverableId: data.deliverableId,
    deliverableTitle: target.title,
    body: data.body,
  });
  return ok({ id: row.id });
}

async function ownComment(ctx: PortalContext, id: string) {
  if (!isUuid(id)) return null;
  const c = await db.query.projectDeliverableComment.findFirst({
    where: eq(projectDeliverableComment.id, id),
    columns: { id: true, authorId: true, deletedAt: true, deliverableId: true },
  });
  if (!c || c.deletedAt || c.authorId !== ctx.user.id) return null;
  // a entrega ainda precisa estar visível para a organização
  if (!(await findVisibleDeliverable(ctx, c.deliverableId))) return null;
  return c;
}

export async function updateClientComment(
  ctx: PortalContext,
  id: string,
  input: UpdateCommentInput,
): Promise<ActionResult<null>> {
  const parsed = updateCommentSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const c = await ownComment(ctx, id);
  if (!c) return fail("Comentário não encontrado.");

  await db
    .update(projectDeliverableComment)
    .set({ body: parsed.data.body })
    .where(eq(projectDeliverableComment.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "portal.comment.updated",
    entityType: "project_deliverable",
    entityId: c.deliverableId,
    organizationId: ctx.organization.id,
    metadata: { commentId: id },
  });
  return ok(null);
}

export async function deleteClientComment(
  ctx: PortalContext,
  id: string,
): Promise<ActionResult<null>> {
  const c = await ownComment(ctx, id);
  if (!c) return fail("Comentário não encontrado.");

  await db
    .update(projectDeliverableComment)
    .set({ deletedAt: new Date() })
    .where(eq(projectDeliverableComment.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "portal.comment.deleted",
    entityType: "project_deliverable",
    entityId: c.deliverableId,
    organizationId: ctx.organization.id,
    metadata: { commentId: id },
  });
  return ok(null);
}

// ── Fase 22: aprovação da entrega pelo cliente ───────────────────────────────

const acceptanceSchema = z.object({
  deliverableId: z.uuid(),
  decision: z.enum(["approved", "changes_requested"]),
  notes: z.string().trim().max(2000, "Máximo 2000 caracteres").default(""),
}).refine((v) => v.decision === "approved" || v.notes.length >= 5, { path: ["notes"], error: "Descreva o que precisa ser ajustado." });

/** Aprova ou pede ajustes numa entrega concluída e visível. Pedir ajustes volta a entrega para a equipe com o motivo em comentário. */
export async function decideDeliverable(ctx: PortalContext, input: { deliverableId: string; decision: string; notes: string }): Promise<ActionResult<null>> {
  const parsed = acceptanceSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;
  const target = await findVisibleDeliverable(ctx, data.deliverableId);
  if (!target) return fail(NOT_FOUND);
  const current = await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, data.deliverableId), columns: { status: true } });
  if (current?.status !== "done") return fail("Só entregas concluídas podem ser aprovadas ou devolvidas.");
  const last = (await listDeliverableAcceptances(data.deliverableId))[0];
  if (last?.decision === "approved" && data.decision === "approved") return fail("Esta entrega já foi aprovada.");

  await db.transaction(async (tx) => {
    await tx.insert(projectDeliverableAcceptance).values({ deliverableId: data.deliverableId, userId: ctx.user.id, decision: data.decision, notes: data.notes || null });
    if (data.decision === "changes_requested") {
      await tx.update(projectDeliverable).set({ status: "doing", completedAt: null }).where(eq(projectDeliverable.id, data.deliverableId));
      await tx.insert(projectDeliverableComment).values({ deliverableId: data.deliverableId, authorId: ctx.user.id, body: `Ajustes solicitados: ${data.notes}` });
    }
  });
  await audit({
    actorId: ctx.user.id,
    action: data.decision === "approved" ? "portal.deliverable.approved" : "portal.deliverable.changes_requested",
    entityType: "project_deliverable",
    entityId: data.deliverableId,
    organizationId: ctx.organization.id,
    metadata: data.decision === "changes_requested" ? { from: "done", to: "doing" } : undefined,
  });
  await notifyDeliverableDecision({
    deliverableId: data.deliverableId,
    projectId: target.projectId,
    title: target.title,
    projectTitle: target.projectTitle,
    decision: data.decision,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
    organizationName: ctx.organization.name,
    notes: data.notes || null,
  });
  return ok(null);
}
