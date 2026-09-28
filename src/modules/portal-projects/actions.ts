import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectDeliverableComment } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
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
