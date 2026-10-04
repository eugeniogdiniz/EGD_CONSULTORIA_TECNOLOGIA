import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, organizations, portalRequest, portalRequestMessage, project, projectDeliverable, users } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { notifyRequestEvent } from "@/modules/notifications/events";
import { getPortalProject } from "@/modules/portal-projects/queries";
import { isUuid } from "@/lib/uuid";
import { convertRequestSchema, messageSchema, requestSchema, type ConvertRequestInput, type MessageInput, type RequestInput } from "./validation";
import { isPriority } from "@/modules/projects/priority";
import { isRequestStatus, statusAfterReply, canClientResolve, type RequestStatus } from "./status";


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
  await notifyRequestEvent({
    kind: "created",
    requestId: row.id,
    organizationId: ctx.organization.id,
    organizationName: ctx.organization.name,
    title: data.title,
    body: data.body,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
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
  await notifyRequestEvent({
    kind: "client_reply",
    requestId: req.id,
    organizationId: ctx.organization.id,
    organizationName: ctx.organization.name,
    title: req.title,
    body: parsed.data.body,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
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
  await notifyRequestEvent({
    kind: "team_reply",
    requestId: req.id,
    organizationId: req.organizationId,
    organizationName: req.organizationName,
    title: req.title,
    body: parsed.data.body,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
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

// ── triagem: prioridade e conversão em entrega ───────────────────────────────

export async function setRequestPriority(ctx: AdminContext, id: string, priority: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Solicitação não encontrada.");
  if (!isPriority(priority)) return fail("Prioridade inválida.");
  const req = await db.query.portalRequest.findFirst({
    where: eq(portalRequest.id, id),
    columns: { id: true, priority: true, organizationId: true },
  });
  if (!req) return fail("Solicitação não encontrada.");
  if (req.priority === priority) return ok(null);
  await db.update(portalRequest).set({ priority }).where(eq(portalRequest.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "request.priority_changed",
    entityType: "portal_request",
    entityId: id,
    organizationId: req.organizationId,
    metadata: { from: req.priority, to: priority },
  });
  return ok(null);
}

/**
 * Transforma a solicitação em uma entrega do projeto escolhido. O projeto precisa ser da empresa
 * vinculada à organização de quem pediu: nunca liga o pedido de um cliente ao projeto de outro.
 * O cliente recebe a mensagem (e o e-mail) dizendo onde o pedido foi registrado.
 */
export async function convertRequestToDeliverable(
  ctx: AdminContext,
  requestId: string,
  input: ConvertRequestInput,
): Promise<ActionResult<{ deliverableId: string }>> {
  if (!isUuid(requestId)) return fail("Solicitação não encontrada.");
  const parsed = convertRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const req = await db.query.portalRequest.findFirst({ where: eq(portalRequest.id, requestId) });
  if (!req) return fail("Solicitação não encontrada.");
  if (req.deliverableId) return fail("Esta solicitação já virou uma entrega.");

  const [proj] = await db
    .select({ id: project.id, title: project.title, linkedOrganizationId: crmCompany.linkedOrganizationId, status: project.status, archivedAt: project.archivedAt })
    .from(project)
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(eq(project.id, data.projectId))
    .limit(1);
  if (!proj) return fail("Projeto não encontrado.", { projectId: ["Projeto não encontrado."] });
  if (proj.linkedOrganizationId !== req.organizationId)
    return fail("O projeto não pertence à organização de quem abriu a solicitação.", { projectId: ["Escolha um projeto desta organização."] });
  if (proj.archivedAt) return fail("O projeto está arquivado.", { projectId: ["Projeto arquivado."] });

  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, req.organizationId)).limit(1);

  const deliverableId = await db.transaction(async (tx) => {
    const [countRow] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(projectDeliverable)
      .where(and(eq(projectDeliverable.projectId, proj.id), eq(projectDeliverable.status, "todo")));
    const [d] = await tx
      .insert(projectDeliverable)
      .values({
        projectId: proj.id,
        title: req.title,
        description: req.body,
        status: "todo",
        priority: data.priority,
        position: countRow?.n ?? 0,
        assigneeId: data.assigneeId,
        dueAt: data.dueAt,
        visibleToClient: data.visibleToClient,
        ownerId: ctx.user.id,
      })
      .returning({ id: projectDeliverable.id });
    await tx
      .update(portalRequest)
      .set({ deliverableId: d.id, priority: data.priority, projectId: req.projectId ?? proj.id })
      .where(eq(portalRequest.id, requestId));
    return d.id;
  });

  await audit({
    actorId: ctx.user.id,
    action: "request.converted",
    entityType: "portal_request",
    entityId: requestId,
    organizationId: req.organizationId,
    metadata: { deliverableId, projectId: proj.id, priority: data.priority },
  });

  // conversa: avisa o cliente onde o pedido foi registrado (e move para "em andamento")
  const body = `Registramos sua solicitação como uma entrega do projeto "${proj.title}"${data.dueAt ? `, com prazo em ${data.dueAt.split("-").reverse().join("/")}` : ""}.${data.visibleToClient ? " Você pode acompanhar o andamento na aba Projetos do portal." : ""}`;
  await addMessage(requestId, ctx.user.id, body, req.status, "team");
  if (org) {
    await notifyRequestEvent({
      kind: "team_reply",
      requestId,
      organizationId: req.organizationId,
      organizationName: org.name,
      title: req.title,
      body,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
    });
  }
  return ok({ deliverableId });
}
