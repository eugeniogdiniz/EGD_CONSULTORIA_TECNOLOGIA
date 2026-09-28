import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  crmCompany,
  crmOpportunity,
  files,
  organizations,
  project,
  projectDeliverable,
  projectMilestone,
  projectPhase,
  users,
} from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { setDeliverableVisibility } from "@/modules/projects/actions";
import { createComment } from "@/modules/projects/actions";
import {
  findVisibleDeliverable,
  getPortalDeliverable,
  getPortalDeliverableFile,
  getPortalProject,
  listPortalComments,
  listPortalDeliverables,
  listPortalMilestones,
  listPortalPhases,
  listPortalProjects,
} from "@/modules/portal-projects/queries";
import {
  createClientComment,
  deleteClientComment,
  updateClientComment,
} from "@/modules/portal-projects/actions";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let ctxA: PortalContext;
let ctxB: PortalContext;

let projA: string;
let projB: string;
let projArchived: string;
let projUnlinked: string;
let visibleA: string;
let hiddenA: string;
let blockedA: string;
let fileDelA: string;
let visibleB: string;

async function createClientUser(email: string, name: string) {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser(
    { email, name, emailVerified: true, role: "client", active: true },
    { method: "admin" },
  );
  return { id: u.id, name, email, role: "client" as const, active: true };
}

async function makeProject(companyId: string, title: string, opts: { archived?: boolean } = {}) {
  const [opp] = await db
    .insert(crmOpportunity)
    .values({ companyId, title, stage: "won", ownerId: admin.user.id, wonAt: new Date() })
    .returning({ id: crmOpportunity.id });
  const [p] = await db
    .insert(project)
    .values({
      opportunityId: opp.id,
      companyId,
      title,
      status: "active",
      ownerId: admin.user.id,
      archivedAt: opts.archived ? new Date() : null,
    })
    .returning({ id: project.id });
  return p.id;
}

async function makeDeliverable(
  projectId: string,
  title: string,
  extra: Partial<typeof projectDeliverable.$inferInsert> = {},
) {
  const [d] = await db
    .insert(projectDeliverable)
    .values({ projectId, title, ownerId: admin.user.id, ...extra })
    .returning({ id: projectDeliverable.id });
  return d.id;
}

beforeAll(async () => {
  admin = await ensureTestAdmin();

  const [orgA] = await db.insert(organizations).values({ name: "Org A", slug: "org-a" }).returning();
  const [orgB] = await db.insert(organizations).values({ name: "Org B", slug: "org-b" }).returning();
  const userA = await createClientUser("cliente-a@test.local", "Cliente A");
  const userB = await createClientUser("cliente-b@test.local", "Cliente B");
  ctxA = { kind: "portal", user: userA, organization: orgA, organizations: [orgA] };
  ctxB = { kind: "portal", user: userB, organization: orgB, organizations: [orgB] };

  const mkCompany = async (name: string, slug: string, linked: string | null) =>
    (
      await db
        .insert(crmCompany)
        .values({ name, slug, ownerId: admin.user.id, linkedOrganizationId: linked })
        .returning({ id: crmCompany.id })
    )[0].id;
  const companyA = await mkCompany("Empresa A", "empresa-a", orgA.id);
  const companyB = await mkCompany("Empresa B", "empresa-b", orgB.id);
  const companyNone = await mkCompany("Empresa Solta", "empresa-solta", null);

  projA = await makeProject(companyA, "Projeto A");
  projB = await makeProject(companyB, "Projeto B");
  projArchived = await makeProject(companyA, "Projeto A arquivado", { archived: true });
  projUnlinked = await makeProject(companyNone, "Projeto sem vínculo");

  const [file] = await db
    .insert(files)
    .values({
      bucketKey: "test/entrega-a.xlsx",
      originalName: "entrega-a.xlsx",
      mimeType: "application/octet-stream",
      sizeBytes: 100,
      organizationId: null,
      uploadedBy: admin.user.id,
    })
    .returning({ id: files.id });

  visibleA = await makeDeliverable(projA, "Entrega visível A", { visibleToClient: true, status: "doing" });
  hiddenA = await makeDeliverable(projA, "Entrega interna A", { visibleToClient: false });
  blockedA = await makeDeliverable(projA, "Entrega em espera A", {
    visibleToClient: true,
    status: "blocked",
    description: "Texto público.\n\n## Bloqueio\nSegredo interno do bloqueio",
  });
  fileDelA = await makeDeliverable(projA, "Entrega com arquivo A", { visibleToClient: true, fileId: file.id });
  visibleB = await makeDeliverable(projB, "Entrega visível B", { visibleToClient: true });
  await makeDeliverable(projArchived, "Entrega do arquivado", { visibleToClient: true });

  await db.insert(projectPhase).values({ projectId: projA, name: "Fase A", position: 0 });
  await db.insert(projectPhase).values({ projectId: projB, name: "Fase B", position: 0 });
  await db.insert(projectMilestone).values({ projectId: projA, name: "Marco A", dueAt: "2030-01-01" });
  await db.insert(projectMilestone).values({ projectId: projB, name: "Marco B", dueAt: "2030-01-01" });
});

describe("escopo por organização", () => {
  it("lista só os projetos da própria organização", async () => {
    const a = await listPortalProjects(ctxA);
    const b = await listPortalProjects(ctxB);
    expect(a.map((p) => p.title)).toEqual(["Projeto A"]);
    expect(b.map((p) => p.title)).toEqual(["Projeto B"]);
  });

  it("não lista projeto arquivado nem de empresa sem vínculo", async () => {
    const all = [...(await listPortalProjects(ctxA)), ...(await listPortalProjects(ctxB))].map((p) => p.id);
    expect(all).not.toContain(projArchived);
    expect(all).not.toContain(projUnlinked);
  });

  it("resumo conta só entregas visíveis", async () => {
    const [a] = await listPortalProjects(ctxA);
    // visível, em espera e com arquivo (a interna fica de fora)
    expect(a.summary.total).toBe(3);
  });

  it("getPortalProject devolve null para projeto de outra organização", async () => {
    expect(await getPortalProject(ctxA, projA)).not.toBeNull();
    expect(await getPortalProject(ctxA, projB)).toBeNull();
    expect(await getPortalProject(ctxB, projA)).toBeNull();
    expect(await getPortalProject(ctxA, projArchived)).toBeNull();
    expect(await getPortalProject(ctxA, projUnlinked)).toBeNull();
    expect(await getPortalProject(ctxA, "não-é-uuid")).toBeNull();
  });

  it("fases, marcos e entregas de outra organização vêm vazios", async () => {
    expect((await listPortalPhases(ctxA, projB)).length).toBe(0);
    expect((await listPortalMilestones(ctxA, projB)).length).toBe(0);
    expect((await listPortalDeliverables(ctxA, projB)).length).toBe(0);
    expect((await listPortalPhases(ctxA, projA)).map((p) => p.name)).toEqual(["Fase A"]);
    expect((await listPortalMilestones(ctxA, projA)).map((m) => m.name)).toEqual(["Marco A"]);
  });
});

describe("visibilidade de entregas", () => {
  it("entrega interna não aparece na lista nem no detalhe", async () => {
    const list = await listPortalDeliverables(ctxA, projA);
    expect(list.map((d) => d.id)).not.toContain(hiddenA);
    expect(list.map((d) => d.id)).toContain(visibleA);
    expect(await getPortalDeliverable(ctxA, projA, hiddenA)).toBeNull();
  });

  it("entrega de outra organização é inacessível pelo id", async () => {
    expect(await getPortalDeliverable(ctxA, projB, visibleB)).toBeNull();
    expect(await getPortalDeliverable(ctxA, projA, visibleB)).toBeNull();
    expect(await getPortalDeliverable(ctxB, projA, visibleA)).toBeNull();
  });

  it("remove o motivo de bloqueio da descrição", async () => {
    const d = await getPortalDeliverable(ctxA, projA, blockedA);
    expect(d?.status).toBe("blocked");
    expect(d?.description).toBe("Texto público.");
    expect(JSON.stringify(d)).not.toContain("Segredo interno");
  });

  it("admin compartilha e oculta; o portal acompanha", async () => {
    expect(await findVisibleDeliverable(ctxA, hiddenA)).toBeNull();
    expect((await setDeliverableVisibility(admin, hiddenA, true)).ok).toBe(true);
    expect(await findVisibleDeliverable(ctxA, hiddenA)).not.toBeNull();
    expect((await setDeliverableVisibility(admin, hiddenA, false)).ok).toBe(true);
    expect(await findVisibleDeliverable(ctxA, hiddenA)).toBeNull();
  });
});

describe("download de arquivo", () => {
  it("devolve o arquivo só para a organização dona e com entrega visível", async () => {
    const f = await getPortalDeliverableFile(ctxA, projA, fileDelA);
    expect(f?.originalName).toBe("entrega-a.xlsx");
    expect(await getPortalDeliverableFile(ctxB, projA, fileDelA)).toBeNull();
    expect(await getPortalDeliverableFile(ctxA, projB, fileDelA)).toBeNull();
  });

  it("some quando a entrega deixa de ser visível", async () => {
    await db.update(projectDeliverable).set({ visibleToClient: false }).where(eq(projectDeliverable.id, fileDelA));
    expect(await getPortalDeliverableFile(ctxA, projA, fileDelA)).toBeNull();
    await db.update(projectDeliverable).set({ visibleToClient: true }).where(eq(projectDeliverable.id, fileDelA));
    expect(await getPortalDeliverableFile(ctxA, projA, fileDelA)).not.toBeNull();
  });
});

describe("comentários do cliente", () => {
  it("cliente comenta em entrega visível e o admin enxerga na mesma tabela", async () => {
    const r = await createClientComment(ctxA, { deliverableId: visibleA, parentId: "", body: "Olá equipe" });
    expect(r.ok).toBe(true);
    const list = await listPortalComments(ctxA, visibleA);
    expect(list.map((c) => c.body)).toContain("Olá equipe");
    expect(list.find((c) => c.body === "Olá equipe")?.authorRole).toBe("client");
  });

  it("recusa comentar em entrega interna ou de outra organização", async () => {
    expect((await createClientComment(ctxA, { deliverableId: hiddenA, parentId: "", body: "x" })).ok).toBe(false);
    expect((await createClientComment(ctxA, { deliverableId: visibleB, parentId: "", body: "x" })).ok).toBe(false);
    expect((await createClientComment(ctxB, { deliverableId: visibleA, parentId: "", body: "x" })).ok).toBe(false);
  });

  it("não lê comentários de entrega fora do escopo", async () => {
    expect(await listPortalComments(ctxB, visibleA)).toEqual([]);
    expect(await listPortalComments(ctxA, hiddenA)).toEqual([]);
  });

  it("respeita dois níveis: responde à raiz, não à resposta", async () => {
    const root = await createClientComment(ctxA, { deliverableId: visibleA, parentId: "", body: "Raiz" });
    if (!root.ok) throw new Error("falhou");
    const reply = await createClientComment(ctxA, { deliverableId: visibleA, parentId: root.data.id, body: "Resposta" });
    expect(reply.ok).toBe(true);
    if (!reply.ok) return;
    const grand = await createClientComment(ctxA, { deliverableId: visibleA, parentId: reply.data.id, body: "Neto" });
    expect(grand.ok).toBe(false);
  });

  it("cliente edita e apaga só os próprios; comentário apagado perde o corpo", async () => {
    const mine = await createClientComment(ctxA, { deliverableId: visibleA, parentId: "", body: "Meu" });
    if (!mine.ok) throw new Error("falhou");
    expect((await updateClientComment(ctxA, mine.data.id, { body: "Meu editado" })).ok).toBe(true);
    // outro cliente (mesmo com id certo) não mexe
    expect((await updateClientComment(ctxB, mine.data.id, { body: "invasão" })).ok).toBe(false);
    expect((await deleteClientComment(ctxB, mine.data.id)).ok).toBe(false);

    expect((await deleteClientComment(ctxA, mine.data.id)).ok).toBe(true);
    const row = (await listPortalComments(ctxA, visibleA)).find((c) => c.id === mine.data.id);
    expect(row?.body).toBeNull();
  });

  it("cliente não edita comentário da equipe", async () => {
    const team = await createComment(admin, { deliverableId: visibleA, parentId: "", body: "Da equipe" });
    if (!team.ok) throw new Error("falhou");
    expect((await updateClientComment(ctxA, team.data.id, { body: "x" })).ok).toBe(false);
    expect((await deleteClientComment(ctxA, team.data.id)).ok).toBe(false);
    const row = (await listPortalComments(ctxA, visibleA)).find((c) => c.id === team.data.id);
    expect(row?.authorRole).toBe("admin");
  });

  it("perde acesso a editar quando a entrega deixa de ser visível", async () => {
    const mine = await createClientComment(ctxA, { deliverableId: visibleA, parentId: "", body: "Some" });
    if (!mine.ok) throw new Error("falhou");
    await db.update(projectDeliverable).set({ visibleToClient: false }).where(eq(projectDeliverable.id, visibleA));
    expect((await updateClientComment(ctxA, mine.data.id, { body: "tarde" })).ok).toBe(false);
    await db.update(projectDeliverable).set({ visibleToClient: true }).where(eq(projectDeliverable.id, visibleA));
  });
});

describe("usuário client", () => {
  it("existe como client no banco de teste", async () => {
    const u = await db.query.users.findFirst({ where: eq(users.email, "cliente-a@test.local") });
    expect(u?.role).toBe("client");
  });
});
