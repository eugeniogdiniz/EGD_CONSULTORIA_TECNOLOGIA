import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog, crmCompany, crmOpportunity, organizations, portalRequest, project } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { createRequest, replyAsClient, replyAsTeam, resolveAsClient, setRequestStatus } from "@/modules/requests/actions";
import {
  countActiveRequests,
  getPortalRequest,
  getRequestForAdmin,
  listAllRequests,
  listPortalRequestMessages,
  listPortalRequests,
} from "@/modules/requests/queries";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let ctxA: PortalContext;
let ctxA2: PortalContext; // segundo membro da organização A
let ctxB: PortalContext;
let projA: string;
let projB: string;

async function client(email: string, name: string) {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name, emailVerified: true, role: "client", active: true }, { method: "admin" });
  return { id: u.id, name, email, role: "client" as const, active: true };
}

async function makeProject(companyId: string, title: string) {
  const [opp] = await db.insert(crmOpportunity).values({ companyId, title, stage: "won", ownerId: admin.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id });
  const [p] = await db.insert(project).values({ opportunityId: opp.id, companyId, title, status: "active", ownerId: admin.user.id }).returning({ id: project.id });
  return p.id;
}

beforeAll(async () => {
  admin = await ensureTestAdmin();
  const [orgA] = await db.insert(organizations).values({ name: "Org A", slug: "org-a" }).returning();
  const [orgB] = await db.insert(organizations).values({ name: "Org B", slug: "org-b" }).returning();
  ctxA = { kind: "portal", user: await client("sol-a@test.local", "Cliente A"), organization: orgA, organizations: [orgA] };
  ctxA2 = { kind: "portal", user: await client("sol-a2@test.local", "Cliente A2"), organization: orgA, organizations: [orgA] };
  ctxB = { kind: "portal", user: await client("sol-b@test.local", "Cliente B"), organization: orgB, organizations: [orgB] };

  const mk = async (name: string, slug: string, org: string) =>
    (await db.insert(crmCompany).values({ name, slug, ownerId: admin.user.id, linkedOrganizationId: org }).returning({ id: crmCompany.id }))[0].id;
  projA = await makeProject(await mk("Empresa A", "empresa-a", orgA.id), "Projeto A");
  projB = await makeProject(await mk("Empresa B", "empresa-b", orgB.id), "Projeto B");
});

const base = { title: "Preciso de acesso", body: "Preciso de acesso ao servidor de arquivos.", projectId: "" };
const open = async (ctx: PortalContext, extra: Partial<typeof base> = {}) => {
  const r = await createRequest(ctx, { ...base, ...extra });
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.data.id;
};

describe("criação", () => {
  it("cria aberta, com auditoria e escopo da organização", async () => {
    const id = await open(ctxA, { projectId: projA });
    const row = await db.query.portalRequest.findFirst({ where: eq(portalRequest.id, id) });
    expect(row).toMatchObject({ status: "open", organizationId: ctxA.organization.id, projectId: projA, createdBy: ctxA.user.id });
    const audits = await db.select().from(auditLog).where(eq(auditLog.action, "portal.request.created"));
    expect(audits.some((a) => a.entityId === id && a.organizationId === ctxA.organization.id)).toBe(true);
  });

  it("recusa projeto de outra organização e dados inválidos", async () => {
    const r = await createRequest(ctxA, { ...base, projectId: projB });
    expect(r.ok).toBe(false);
    expect((await createRequest(ctxA, { title: "ab", body: "curto", projectId: "" })).ok).toBe(false);
  });
});

describe("isolamento entre organizações", () => {
  it("cada organização vê só as próprias; qualquer membro vê as da organização", async () => {
    const idA = await open(ctxA, { title: "Pedido da A" });
    const idB = await open(ctxB, { title: "Pedido da B" });
    const a = (await listPortalRequests(ctxA)).map((r) => r.id);
    const a2 = (await listPortalRequests(ctxA2)).map((r) => r.id);
    const b = (await listPortalRequests(ctxB)).map((r) => r.id);
    expect(a).toContain(idA);
    expect(a).not.toContain(idB);
    expect(a2).toContain(idA);
    expect(b).toContain(idB);
    expect(b).not.toContain(idA);
  });

  it("detalhe, mensagens, resposta e resolução de outra organização não funcionam", async () => {
    const id = await open(ctxA, { title: "Só da A" });
    expect(await getPortalRequest(ctxB, id)).toBeNull();
    expect(await listPortalRequestMessages(ctxB, id)).toEqual([]);
    expect((await replyAsClient(ctxB, { requestId: id, body: "invasão" })).ok).toBe(false);
    expect((await resolveAsClient(ctxB, id)).ok).toBe(false);
    expect((await getPortalRequest(ctxA2, id))?.id).toBe(id);
  });
});

describe("conversa e status", () => {
  it("resposta da equipe em aberta vira em andamento; cliente vê a resposta", async () => {
    const id = await open(ctxA);
    expect((await replyAsTeam(admin, { requestId: id, body: "Já estamos vendo." })).ok).toBe(true);
    expect((await getPortalRequest(ctxA, id))?.status).toBe("in_progress");
    const msgs = await listPortalRequestMessages(ctxA, id);
    expect(msgs.map((m) => [m.body, m.authorRole])).toEqual([["Já estamos vendo.", "admin"]]);
  });

  it("cliente resolve; resposta do cliente reabre; equipe não reabre sozinha", async () => {
    const id = await open(ctxA);
    await resolveAsClient(ctxA, id);
    let row = await getPortalRequest(ctxA, id);
    expect(row?.status).toBe("resolved");
    expect(row?.resolvedAt).not.toBeNull();

    await replyAsTeam(admin, { requestId: id, body: "Ok, segue resolvida." });
    expect((await getPortalRequest(ctxA, id))?.status).toBe("resolved");

    await replyAsClient(ctxA2, { requestId: id, body: "Voltou o problema." });
    row = await getPortalRequest(ctxA, id);
    expect(row?.status).toBe("open");
    expect(row?.resolvedAt).toBeNull();
  });

  it("admin muda status, com auditoria; mesmo status não repete o log; status inválido é recusado", async () => {
    const id = await open(ctxA);
    expect((await setRequestStatus(admin, id, "resolved")).ok).toBe(true);
    expect((await getRequestForAdmin(admin, id))?.resolvedAt).not.toBeNull();
    expect((await setRequestStatus(admin, id, "resolved")).ok).toBe(true);
    expect((await setRequestStatus(admin, id, "arquivada")).ok).toBe(false);
    const audits = (await db.select().from(auditLog).where(eq(auditLog.action, "request.status_changed"))).filter((a) => a.entityId === id);
    expect(audits).toHaveLength(1);
  });

  it("recusa mensagem vazia e solicitação inexistente", async () => {
    const id = await open(ctxA);
    expect((await replyAsClient(ctxA, { requestId: id, body: "   " })).ok).toBe(false);
    expect((await replyAsTeam(admin, { requestId: "00000000-0000-4000-8000-000000000000", body: "x" })).ok).toBe(false);
  });
});

describe("visão do admin", () => {
  it("lista de todas as organizações, filtro por status e contagem de ativas", async () => {
    const all = await listAllRequests(admin);
    expect(new Set(all.map((r) => r.organizationName))).toEqual(new Set(["Org A", "Org B"]));
    const resolved = await listAllRequests(admin, { status: "resolved" });
    expect(resolved.every((r) => r.status === "resolved")).toBe(true);
    expect(await countActiveRequests()).toBe(all.filter((r) => r.status !== "resolved").length);
  });
});
