import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { organizations, portalRequest, portalRequestMessage, users } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { sendRequestNotification } from "@/modules/mail/send";
import { getPortalProject } from "@/modules/portal-projects/queries";
import { isUuid } from "@/lib/uuid";
import { messageSchema, requestSchema, type MessageInput, type RequestInput } from "./validation";
import { isRequestStatus, statusAfterReply, canClientResolve, type RequestStatus } from "./status";

const base = () => env.BETTER_AUTH_URL.replace(/\/$/, "");
const excerpt = (s: string) => (s.length > 800 ? `${s.slice(0, 800)}…` : s);

// ── cliente (portal) ─────────────────────────────────────────────────────────

export async function createRequest(
  ctx: PortalContext,
  input: RequestInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  if (data.projectId && !(await getPortalProject(ctx, data.projectId)))
    return fail("Projeto não encontrado.", { projectId: ["Projeto não encontrado."] });

  const [row] = await db
    .insert(portalRequest)
    .values({
      organizationId: ctx.organization.id,
      projectId: data.projectId,
      createdBy: ctx.user.id,
      title: data.title,
      body: data.body,
    })
    .returning({ id: portalRequest.id });

  await audit({
    actorId: ctx.user.id,
    action: "portal.request.created",
    entityType: "portal_request",
    entityId: row.id,
    organizationId: ctx.organization.id,
    metadata: { projectId: data.projectId },
  });
  await sendRequestNotification({
    kind: "created",
    actorName: ctx.user.name,
    organizationName: ctx.organization.name,
    title: data.title,
    body: excerpt(data.body),
    url: `${base()}/admin/solicitacoes/${row.id}`,
  });
  return ok({ id: row.id });
}

async function ownRequest(ctx: PortalContext, id: string) {
  if (!isUuid(id)) return null;
  const r = await db.query.portalRequest.findFirst({
    where: and(eq(portalRequest.id, id), eq(portalRequest.organizationId, ctx.organization.id)),
    columns: { id: true, title: true, status: true },
  });
  return r ?? null;
}

/** Grava a mensagem e aplica a regra de status numa transação. */
async function addMessage(requestId: string, authorId: string, body: string, current: RequestStatus, author: "team" | "client") {
  const next = statusAfterReply(current, author);
  await db.transaction(async (tx) => {
    await tx.insert(portalRequestMessage).values({ requestId, authorId, body });
    // sempre atualiza a linha: assim `updatedAt` marca a última atividade
    await tx
      .update(portalRequest)
      .set({ status: next, resolvedAt: next === "resolved" ? undefined : null })
      .where(eq(portalRequest.id, requestId));
  });
  return next;
}

export async function replyAsClient(ctx: PortalContext, input: MessageInput): Promise<ActionResult<null>> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const req = await ownRequest(ctx, parsed.data.requestId);
  if (!req) return fail("Solicitação não encontrada.");

  const next = await addMessage(req.id, ctx.user.id, parsed.data.body, req.status, "client");
  await audit({
    actorId: ctx.user.id,
    action: "portal.request.replied",
    entityType: "portal_request",
    entityId: req.id,
    organizationId: ctx.organization.id,
    metadata: next !== req.status ? { from: req.status, to: next } : undefined,
  });
  await sendRequestNotification({
    kind: "client_reply",
    actorName: ctx.user.name,
    organizationName: ctx.organization.name,
    title: req.title,
    body: excerpt(parsed.data.body),
    url: `${base()}/admin/solicitacoes/${req.id}`,
  });
  return ok(null);
}

export async function resolveAsClient(ctx: PortalContext, id: string): Promise<ActionResult<null>> {
  const req = await ownRequest(ctx, id);
  if (!req) return fail("Solicitação não encontrada.");
  if (!canClientResolve(req.status)) return ok(null);
  await db.update(portalRequest).set({ status: "resolved", resolvedAt: new Date() }).where(eq(portalRequest.id, req.id));
  await audit({
    actorId: ctx.user.id,
    action: "portal.request.resolved",
    entityType: "portal_request",
    entityId: req.id,
    organizationId: ctx.organization.id,
    metadata: { from: req.status },
  });
  return ok(null);
}

// ── equipe (admin) ───────────────────────────────────────────────────────────

export async function replyAsTeam(ctx: AdminContext, input: MessageInput): Promise<ActionResult<null>> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const [req] = await db
    .select({
      id: portalRequest.id,
      title: portalRequest.title,
      status: portalRequest.status,
      organizationId: portalRequest.organizationId,
      organizationName: organizations.name,
      authorEmail: users.email,
    })
    .from(portalRequest)
    .innerJoin(organizations, eq(portalRequest.organizationId, organizations.id))
    .innerJoin(users, eq(portalRequest.createdBy, users.id))
    .where(eq(portalRequest.id, parsed.data.requestId))
    .limit(1);
  if (!req) return fail("Solicitação não encontrada.");

  const next = await addMessage(req.id, ctx.user.id, parsed.data.body, req.status, "team");
  await audit({
    actorId: ctx.user.id,
    action: "request.replied",
    entityType: "portal_request",
    entityId: req.id,
    organizationId: req.organizationId,
    metadata: next !== req.status ? { from: req.status, to: next } : undefined,
  });
  await sendRequestNotification({
    kind: "team_reply",
    to: req.authorEmail,
    actorName: "A equipe da EGD",
    organizationName: req.organizationName,
    title: req.title,
    body: excerpt(parsed.data.body),
    url: `${base()}/portal/solicitacoes/${req.id}`,
  });
  return ok(null);
}

export async function setRequestStatus(ctx: AdminContext, id: string, status: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Solicitação não encontrada.");
  if (!isRequestStatus(status)) return fail("Status inválido.");
  const req = await db.query.portalRequest.findFirst({
    where: eq(portalRequest.id, id),
    columns: { id: true, status: true, organizationId: true },
  });
  if (!req) return fail("Solicitação não encontrada.");
  if (req.status === status) return ok(null);
  await db
    .update(portalRequest)
    .set({ status, resolvedAt: status === "resolved" ? new Date() : null })
    .where(eq(portalRequest.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "request.status_changed",
    entityType: "portal_request",
    entityId: id,
    organizationId: req.organizationId,
    metadata: { from: req.status, to: status },
  });
  return ok(null);
}
