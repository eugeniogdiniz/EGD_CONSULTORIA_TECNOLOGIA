import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog, crmCompany, crmOpportunity, organizations, portalRequest, project, projectDeliverable } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { createDeliverable, setDeliverablePriority } from "@/modules/projects/actions";
import { listBacklog } from "@/modules/projects/queries";
import { convertRequestToDeliverable, createRequest, setRequestPriority } from "@/modules/requests/actions";
import { getPortalRequest, listPortalRequestMessages } from "@/modules/requests/queries";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let ctxA: PortalContext;
let ctxB: PortalContext;
let projA: string;
let projB: string;
let projArchived: string;
let projDelivered: string;
const TODAY = "2026-10-15";

async function client(email: string, name: string) {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name, emailVerified: true, role: "client", active: true }, { method: "admin" });
  return { id: u.id, name, email, role: "client" as const, active: true };
}
async function makeProject(companyId: string, title: string, status: "active" | "delivered" = "active", archived = false) {
  const [opp] = await db.insert(crmOpportunity).values({ companyId, title, stage: "won", ownerId: admin.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id });
  const [p] = await db.insert(project).values({ opportunityId: opp.id, companyId, title, status, ownerId: admin.user.id, archivedAt: archived ? new Date() : null }).returning({ id: project.id });
  return p.id;
}
const deliv = async (projectId: string, title: string, priority: "urgent" | "high" | "medium" | "low", dueAt: string | null = null, status: "todo" | "doing" | "done" = "todo", assigneeId: string | null = null) =>
  (await db.insert(projectDeliverable).values({ projectId, title, priority, dueAt, status, assigneeId, ownerId: admin.user.id }).returning({ id: projectDeliverable.id }))[0].id;

beforeAll(async () => {
  admin = await ensureTestAdmin();
  const [orgA] = await db.insert(organizations).values({ name: "Org A", slug: "org-a" }).returning();
  const [orgB] = await db.insert(organizations).values({ name: "Org B", slug: "org-b" }).returning();
  ctxA = { kind: "portal", user: await client("dem-a@test.local", "Cliente A"), organization: orgA, organizations: [orgA] };
  ctxB = { kind: "portal", user: await client("dem-b@test.local", "Cliente B"), organization: orgB, organizations: [orgB] };
  const mk = async (name: string, slug: string, org: string) =>
    (await db.insert(crmCompany).values({ name, slug, ownerId: admin.user.id, linkedOrganizationId: org }).returning({ id: crmCompany.id }))[0].id;
  const cA = await mk("Empresa A", "empresa-a", orgA.id);
  const cB = await mk("Empresa B", "empresa-b", orgB.id);
  projA = await makeProject(cA, "Projeto A");
  projB = await makeProject(cB, "Projeto B");
  projArchived = await makeProject(cA, "Projeto A arquivado", "active", true);
  projDelivered = await makeProject(cA, "Projeto A entregue", "delivered");
});

describe("backlog", () => {
  beforeAll(async () => {
    await deliv(projA, "Baixa vencendo", "low", "2026-10-16");
    await deliv(projA, "Urgente sem prazo", "urgent");
    await deliv(projA, "Alta cedo", "high", "2026-10-10");
    await deliv(projB, "Alta tarde", "high", "2026-12-01", "doing", admin.user.id);
    await deliv(projA, "Já feita", "urgent", "2026-10-01", "done");
    await deliv(projArchived, "Do arquivado", "urgent");
    await deliv(projDelivered, "Do projeto entregue", "urgent");
  });

  it("ordena por prioridade e depois prazo; ignora feitas, arquivados e projetos entregues", async () => {
    const list = await listBacklog(admin, { today: TODAY });
    expect(list.map((i) => i.title)).toEqual(["Urgente sem prazo", "Alta cedo", "Alta tarde", "Baixa vencendo"]);
  });

  it("marca atrasadas com base em hoje", async () => {
    const list = await listBacklog(admin, { today: TODAY });
    expect(list.find((i) => i.title === "Alta cedo")?.overdue).toBe(true);
    expect(list.find((i) => i.title === "Baixa vencendo")?.overdue).toBe(false);
    expect((await listBacklog(admin, { today: TODAY, overdueOnly: true })).map((i) => i.title)).toEqual(["Alta cedo"]);
  });

  it("filtra por projeto, prioridade, status e responsável", async () => {
    expect((await listBacklog(admin, { today: TODAY, projectId: projB })).map((i) => i.title)).toEqual(["Alta tarde"]);
    expect((await listBacklog(admin, { today: TODAY, priority: "high" })).map((i) => i.title)).toEqual(["Alta cedo", "Alta tarde"]);
    expect((await listBacklog(admin, { today: TODAY, status: "doing" })).map((i) => i.title)).toEqual(["Alta tarde"]);
    expect((await listBacklog(admin, { today: TODAY, assigneeId: admin.user.id })).map((i) => i.title)).toEqual(["Alta tarde"]);
    expect((await listBacklog(admin, { today: TODAY, assigneeId: "none" })).map((i) => i.title)).toEqual(["Urgente sem prazo", "Alta cedo", "Baixa vencendo"]);
  });

  it("includeDone traz as concluídas", async () => {
    const list = await listBacklog(admin, { today: TODAY, includeDone: true });
    expect(list.map((i) => i.title)).toContain("Já feita");
  });
});

describe("prioridade da entrega", () => {
  it("nasce média, aceita prioridade ao criar e muda com auditoria", async () => {
    const c = await createDeliverable(admin, { projectId: projA, phaseId: "", title: "Nova entrega", description: "", assigneeId: "", dueAt: "" });
    if (!c.ok) throw new Error("falhou");
    const row = await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, c.data.id) });
    expect(row?.priority).toBe("medium");
    expect((await setDeliverablePriority(admin, c.data.id, "urgent")).ok).toBe(true);
    expect((await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, c.data.id) }))?.priority).toBe("urgent");
    expect((await setDeliverablePriority(admin, c.data.id, "critica")).ok).toBe(false);
    expect((await setDeliverablePriority(admin, "nao-uuid", "low")).ok).toBe(false);
    const audits = (await db.select().from(auditLog).where(eq(auditLog.entityId, c.data.id))).map((a) => a.action);
    expect(audits).toContain("project.deliverable.priority_changed");
  });
});

describe("solicitação → entrega", () => {
  const open = async (ctx: PortalContext, title = "Preciso de um relatório novo") => {
    const r = await createRequest(ctx, { title, body: "Gostaríamos de um relatório mensal de custos por obra.", projectId: "" });
    if (!r.ok) throw new Error("falhou");
    return r.data.id;
  };

  it("triagem: define a prioridade da solicitação", async () => {
    const id = await open(ctxA);
    expect((await setRequestPriority(admin, id, "high")).ok).toBe(true);
    expect((await db.query.portalRequest.findFirst({ where: eq(portalRequest.id, id) }))?.priority).toBe("high");
    expect((await setRequestPriority(admin, id, "x")).ok).toBe(false);
  });

  it("converte: cria a entrega com os dados do pedido, vincula, avisa o cliente e audita", async () => {
    const id = await open(ctxA, "Relatório mensal de custos");
    const r = await convertRequestToDeliverable(admin, id, { projectId: projA, assigneeId: admin.user.id, dueAt: "2026-11-30", priority: "high", visibleToClient: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const d = await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, r.data.deliverableId) });
    expect(d).toMatchObject({ title: "Relatório mensal de custos", priority: "high", dueAt: "2026-11-30", assigneeId: admin.user.id, visibleToClient: true, status: "todo", projectId: projA });
    expect(d?.description).toContain("relatório mensal de custos por obra");
    const req = await db.query.portalRequest.findFirst({ where: eq(portalRequest.id, id) });
    expect(req).toMatchObject({ deliverableId: r.data.deliverableId, priority: "high", status: "in_progress", projectId: projA });
    const msgs = await listPortalRequestMessages(ctxA, id);
    expect(msgs.at(-1)?.body).toContain('Projeto A');
    expect(msgs.at(-1)?.body).toContain("30/11/2026");
    const audits = (await db.select().from(auditLog).where(eq(auditLog.entityId, id))).map((a) => a.action);
    expect(audits).toContain("request.converted");
  });

  it("não converte duas vezes", async () => {
    const id = await open(ctxA);
    expect((await convertRequestToDeliverable(admin, id, { projectId: projA, priority: "medium", visibleToClient: true })).ok).toBe(true);
    const again = await convertRequestToDeliverable(admin, id, { projectId: projA, priority: "medium", visibleToClient: true });
    expect(again.ok).toBe(false);
  });

  it("recusa projeto de outra organização, arquivado ou inexistente", async () => {
    const id = await open(ctxA);
    expect((await convertRequestToDeliverable(admin, id, { projectId: projB, priority: "medium", visibleToClient: true })).ok).toBe(false);
    expect((await convertRequestToDeliverable(admin, id, { projectId: projArchived, priority: "medium", visibleToClient: true })).ok).toBe(false);
    expect((await convertRequestToDeliverable(admin, id, { projectId: "00000000-0000-4000-8000-000000000000", priority: "medium", visibleToClient: true })).ok).toBe(false);
    expect((await db.query.portalRequest.findFirst({ where: eq(portalRequest.id, id) }))?.deliverableId).toBeNull();
  });

  it("o cliente só vê o vínculo quando a entrega foi compartilhada", async () => {
    const shared = await open(ctxA, "Compartilhada");
    await convertRequestToDeliverable(admin, shared, { projectId: projA, priority: "medium", visibleToClient: true });
    const hidden = await open(ctxA, "Interna");
    await convertRequestToDeliverable(admin, hidden, { projectId: projA, priority: "medium", visibleToClient: false });

    const s = await getPortalRequest(ctxA, shared);
    expect(s?.deliverableTitle).toBe("Compartilhada");
    const h = await getPortalRequest(ctxA, hidden);
    expect(h?.deliverableId).not.toBeNull(); // o vínculo existe...
    expect(h?.deliverableTitle).toBeNull(); // ...mas o título da entrega interna não vaza
    expect(h?.deliverableProjectId).toBeNull();
    // e a outra organização não enxerga a solicitação
    expect(await getPortalRequest(ctxB, shared)).toBeNull();
  });
});
