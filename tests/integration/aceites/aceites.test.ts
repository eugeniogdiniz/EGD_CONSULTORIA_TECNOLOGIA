import { describe, it, expect, beforeAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog, crmCompany, crmInteraction, crmOpportunity, crmProposal, memberships, notification, organizations, project, projectDeliverable, projectDeliverableComment } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { createProposal, generateProposalPdf, changeProposalStatus } from "@/modules/crm/actions";
import { decideProposal } from "@/modules/portal-proposals/actions";
import { getPortalProposal, getProposalDecision, listPortalProposals } from "@/modules/portal-proposals/queries";
import { decideDeliverable } from "@/modules/portal-projects/actions";
import { listDeliverableAcceptances } from "@/modules/portal-projects/queries";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let ctxA: PortalContext;
let ctxB: PortalContext;
let opportunityId: string;
let projectId: string;
let doneId: string;
let hiddenDoneId: string;

async function client(email: string, name: string) {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name, emailVerified: true, role: "client", active: true }, { method: "admin" });
  return { id: u.id, name, email, role: "client" as const, active: true };
}

beforeAll(async () => {
  admin = await ensureTestAdmin();
  const [orgA] = await db.insert(organizations).values({ name: "Org A", slug: `org-a-${Date.now()}` }).returning();
  const [orgB] = await db.insert(organizations).values({ name: "Org B", slug: `org-b-${Date.now()}` }).returning();
  const a = await client(`ac-a-${Date.now()}@test.local`, "Cliente A");
  const b = await client(`ac-b-${Date.now()}@test.local`, "Cliente B");
  await db.insert(memberships).values([{ userId: a.id, organizationId: orgA.id }, { userId: b.id, organizationId: orgB.id }]);
  ctxA = { kind: "portal", user: a, organization: orgA, organizations: [orgA] };
  ctxB = { kind: "portal", user: b, organization: orgB, organizations: [orgB] };
  const [company] = await db.insert(crmCompany).values({ name: "Empresa A", slug: `emp-a-${Date.now()}`, ownerId: admin.user.id, linkedOrganizationId: orgA.id }).returning({ id: crmCompany.id });
  const [opp] = await db.insert(crmOpportunity).values({ companyId: company.id, title: "Op A", stage: "proposal", ownerId: admin.user.id }).returning({ id: crmOpportunity.id });
  opportunityId = opp.id;
  const [p] = await db.insert(project).values({ opportunityId: opp.id, companyId: company.id, title: "Projeto A", status: "active", ownerId: admin.user.id }).returning({ id: project.id });
  projectId = p.id;
  const [d1] = await db.insert(projectDeliverable).values({ projectId, title: "Laudo", ownerId: admin.user.id, visibleToClient: true, status: "done", completedAt: new Date() }).returning({ id: projectDeliverable.id });
  const [d2] = await db.insert(projectDeliverable).values({ projectId, title: "Interna", ownerId: admin.user.id, visibleToClient: false, status: "done", completedAt: new Date() }).returning({ id: projectDeliverable.id });
  doneId = d1.id;
  hiddenDoneId = d2.id;
});

const evidence = { ip: "10.0.0.1", userAgent: "vitest" };

describe("propostas no portal", () => {
  it("rascunho e sem arquivo não aparecem; enviada com PDF aparece só para a organização dona", async () => {
    const c = await createProposal(admin, { opportunityId, title: "Proposta A", valueCents: "100000", currency: "BRL", validUntil: "2030-12-31" });
    const id = (c.ok ? c.data.id : null)!;
    expect(await listPortalProposals(ctxA)).toHaveLength(0);
    await generateProposalPdf(admin, id);
    expect(await listPortalProposals(ctxA)).toHaveLength(0); // ainda rascunho
    await db.delete(notification);
    expect((await changeProposalStatus(admin, id, { to: "sent" })).ok).toBe(true);
    expect((await listPortalProposals(ctxA)).map((p) => p.id)).toEqual([id]);
    expect(await listPortalProposals(ctxB)).toHaveLength(0);
    expect(await getPortalProposal(ctxB, id)).toBeNull();
    // membros avisados do envio
    const notes = await db.select().from(notification).where(and(eq(notification.kind, "proposal.sent"), eq(notification.userId, ctxA.user.id)));
    expect(notes).toHaveLength(1);
    expect(notes[0].url).toBe(`/portal/propostas/${id}`);
  });

  it("aceitar muda o status, grava evidência, interação, auditoria e avisa o dono; segunda decisão é recusada", async () => {
    const c = await createProposal(admin, { opportunityId, title: "Proposta B", valueCents: "250000", currency: "BRL", validUntil: "2030-12-31" });
    const id = (c.ok ? c.data.id : null)!;
    await generateProposalPdf(admin, id);
    await changeProposalStatus(admin, id, { to: "sent" });
    await db.delete(notification);
    expect((await decideProposal(ctxB, id, { decision: "accepted", name: "Fulano de Tal", agree: true }, evidence)).ok).toBe(false);
    expect((await decideProposal(ctxA, id, { decision: "accepted", name: "Fu", agree: true }, evidence)).ok).toBe(false);
    const r = await decideProposal(ctxA, id, { decision: "accepted", name: "Maria Souza", agree: true, notes: "Ok para começar em novembro." }, evidence);
    expect(r).toEqual({ ok: true, data: null });
    const row = await db.query.crmProposal.findFirst({ where: eq(crmProposal.id, id) });
    expect(row?.status).toBe("accepted");
    expect(row?.decidedAt).not.toBeNull();
    const ev = await getProposalDecision(admin, id);
    expect(ev).toMatchObject({ decision: "accepted", name: "Maria Souza", documentVersion: 1, userAgent: "vitest" });
    expect(ev?.ipHash).toMatch(/^[0-9a-f]{32}$/);
    expect(ev?.fileName).toMatch(/-v1\.pdf$/);
    expect((await db.select().from(crmInteraction).where(eq(crmInteraction.opportunityId, opportunityId))).some((i) => i.summary.includes("aceita pelo cliente"))).toBe(true);
    const acts = (await db.select({ a: auditLog.action }).from(auditLog).where(eq(auditLog.entityId, id))).map((x) => x.a);
    expect(acts).toEqual(expect.arrayContaining(["portal.proposal.accepted", "crm.proposal.accepted"]));
    expect((await db.select().from(notification).where(eq(notification.kind, "proposal.decided"))).length).toBeGreaterThan(0);
    expect((await decideProposal(ctxA, id, { decision: "rejected", notes: "mudei de ideia" }, evidence)).ok).toBe(false);
    const portal = await getPortalProposal(ctxA, id);
    expect(portal?.decision).toBe("accepted");
    expect(portal?.decisionName).toBe("Maria Souza");
  });

  it("recusar exige motivo e grava; expirada não decide", async () => {
    const c = await createProposal(admin, { opportunityId, title: "Proposta C", valueCents: "1000", currency: "BRL", validUntil: "2030-12-31" });
    const id = (c.ok ? c.data.id : null)!;
    await generateProposalPdf(admin, id);
    await changeProposalStatus(admin, id, { to: "sent" });
    expect((await decideProposal(ctxA, id, { decision: "rejected", notes: "" }, evidence)).ok).toBe(false);
    expect((await decideProposal(ctxA, id, { decision: "rejected", notes: "Acima do orçamento deste ano." }, evidence)).ok).toBe(true);
    expect((await db.query.crmProposal.findFirst({ where: eq(crmProposal.id, id) }))?.status).toBe("rejected");
    const e = await createProposal(admin, { opportunityId, title: "Proposta D", valueCents: "1000", currency: "BRL", validUntil: "2020-01-01" });
    const eid = (e.ok ? e.data.id : null)!;
    await generateProposalPdf(admin, eid);
    await changeProposalStatus(admin, eid, { to: "sent" });
    await db.update(crmProposal).set({ status: "expired" }).where(eq(crmProposal.id, eid));
    const exp = await decideProposal(ctxA, eid, { decision: "accepted", name: "Maria Souza", agree: true }, evidence);
    expect(exp.ok).toBe(false);
    expect(!exp.ok && exp.error).toMatch(/expirou/);
  });
});

describe("aprovação de entrega", () => {
  it("aprova só concluída e visível; pedir ajustes volta para a equipe com comentário e aviso", async () => {
    await db.delete(notification);
    expect((await decideDeliverable(ctxB, { deliverableId: doneId, decision: "approved", notes: "" })).ok).toBe(false);
    expect((await decideDeliverable(ctxA, { deliverableId: hiddenDoneId, decision: "approved", notes: "" })).ok).toBe(false);
    expect((await decideDeliverable(ctxA, { deliverableId: doneId, decision: "changes_requested", notes: "" })).ok).toBe(false);
    expect((await decideDeliverable(ctxA, { deliverableId: doneId, decision: "changes_requested", notes: "Falta a assinatura na última página." })).ok).toBe(true);
    expect((await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, doneId) }))?.status).toBe("doing");
    expect((await db.select().from(projectDeliverableComment).where(eq(projectDeliverableComment.deliverableId, doneId))).some((c) => c.body?.includes("Falta a assinatura"))).toBe(true);
    expect((await db.select().from(notification).where(eq(notification.kind, "deliverable.changes_requested"))).length).toBeGreaterThan(0);
    // não concluída: não aprova
    expect((await decideDeliverable(ctxA, { deliverableId: doneId, decision: "approved", notes: "" })).ok).toBe(false);
    // equipe conclui de novo → cliente aprova
    await db.update(projectDeliverable).set({ status: "done", completedAt: new Date() }).where(eq(projectDeliverable.id, doneId));
    expect((await decideDeliverable(ctxA, { deliverableId: doneId, decision: "approved", notes: "Agora sim." })).ok).toBe(true);
    const list = await listDeliverableAcceptances(doneId);
    expect(list.map((x) => x.decision)).toEqual(["approved", "changes_requested"]);
    expect((await decideDeliverable(ctxA, { deliverableId: doneId, decision: "approved", notes: "" })).ok).toBe(false); // já aprovada
    expect((await db.select().from(notification).where(eq(notification.kind, "deliverable.approved"))).length).toBeGreaterThan(0);
    const acts = (await db.select({ a: auditLog.action }).from(auditLog).where(eq(auditLog.entityId, doneId))).map((x) => x.a);
    expect(acts).toEqual(expect.arrayContaining(["portal.deliverable.changes_requested", "portal.deliverable.approved"]));
  });
});
