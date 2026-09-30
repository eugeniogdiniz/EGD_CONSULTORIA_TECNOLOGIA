import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  crmCompany,
  crmOpportunity,
  organizations,
  project,
  projectDeliverable,
  projectExpense,
  projectPhase,
  projectTimeEntry,
  users,
} from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { createMeeting, setMeetingShared } from "@/modules/meetings/actions";
import { updateProject } from "@/modules/projects/actions";
import { loadPortfolioData, loadProjectStatus } from "@/modules/reports/queries";
import { loadClientReport } from "@/modules/reports/portal-queries";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let ctxA: PortalContext;
let ctxB: PortalContext;
let projA: string;
let projDelivered: string;
let projArchived: string;
let phaseA: string;
let visibleId: string;
let hiddenId: string;

async function client(email: string, name: string) {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name, emailVerified: true, role: "client", active: true }, { method: "admin" });
  return { id: u.id, name, email, role: "client" as const, active: true };
}
async function makeProject(companyId: string, title: string, over: Partial<typeof project.$inferInsert> = {}) {
  const [opp] = await db.insert(crmOpportunity).values({ companyId, title, stage: "won", ownerId: admin.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id });
  const [p] = await db
    .insert(project)
    .values({ opportunityId: opp.id, companyId, title, status: "active", ownerId: admin.user.id, budgetCents: 100_000, ...over })
    .returning({ id: project.id });
  return p.id;
}
async function timeEntry(deliverableId: string, minutes: number) {
  const endedAt = new Date("2026-09-20T15:00:00Z");
  await db.insert(projectTimeEntry).values({
    deliverableId,
    userId: admin.user.id,
    startedAt: new Date(endedAt.getTime() - minutes * 60_000),
    endedAt,
    minutes,
    source: "manual",
  });
}

beforeAll(async () => {
  admin = await ensureTestAdmin();
  await db.update(users).set({ hourlyRateCents: 15_000 }).where(eq(users.id, admin.user.id));
  const [orgA] = await db.insert(organizations).values({ name: "Org Rel A", slug: "org-rel-a" }).returning();
  const [orgB] = await db.insert(organizations).values({ name: "Org Rel B", slug: "org-rel-b" }).returning();
  ctxA = { kind: "portal", user: await client("rel-a@test.local", "Cliente A"), organization: orgA, organizations: [orgA] };
  ctxB = { kind: "portal", user: await client("rel-b@test.local", "Cliente B"), organization: orgB, organizations: [orgB] };
  const [companyA] = await db
    .insert(crmCompany)
    .values({ name: "Construtora Rel", slug: "construtora-rel", ownerId: admin.user.id, linkedOrganizationId: orgA.id })
    .returning({ id: crmCompany.id });

  projA = await makeProject(companyA.id, "Laudo de infra TI");
  projDelivered = await makeProject(companyA.id, "Projeto entregue", { status: "delivered" });
  projArchived = await makeProject(companyA.id, "Projeto arquivado", { archivedAt: new Date() });

  const [ph] = await db.insert(projectPhase).values({ projectId: projA, name: "Diagnóstico", position: 0 }).returning({ id: projectPhase.id });
  phaseA = ph.id;
  const [v] = await db
    .insert(projectDeliverable)
    .values({ projectId: projA, phaseId: phaseA, title: "Mapa de rede visível", ownerId: admin.user.id, visibleToClient: true, status: "doing", dueAt: "2026-09-29" })
    .returning({ id: projectDeliverable.id });
  const [h] = await db
    .insert(projectDeliverable)
    .values({ projectId: projA, title: "Custos internos ocultos", ownerId: admin.user.id, visibleToClient: false, status: "todo" })
    .returning({ id: projectDeliverable.id });
  visibleId = v.id;
  hiddenId = h.id;
  await timeEntry(visibleId, 90);
  await timeEntry(hiddenId, 30);
  await db.insert(projectExpense).values([
    { projectId: projA, description: "Viagem", amountCents: 10_000, dateAt: "2026-09-10", createdBy: admin.user.id },
    { projectId: projA, description: "Cabo", amountCents: 5_000, dateAt: "2026-09-11", createdBy: admin.user.id },
  ]);

  const shared = await createMeeting(admin, { title: "Revisão compartilhada", heldAt: "2026-09-24T10:00", projectId: projA, decisions: "Priorizar o failover." });
  const internal = await createMeeting(admin, { title: "Alinhamento interno", heldAt: "2026-09-25T10:00", projectId: projA });
  if (!shared.ok || !internal.ok) throw new Error("falha ao criar atas");
  await setMeetingShared(admin, shared.data.id, true);
});

describe("relatório de status (admin)", () => {
  it("junta horas com custo, despesas e atas do projeto", async () => {
    const r = await loadProjectStatus(admin, projA);
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.slug).toBe("laudo-de-infra-ti");
    expect(r.input.project).toMatchObject({ title: "Laudo de infra TI", companyName: "Construtora Rel", budgetCents: 100_000, ownerName: "Admin Teste" });
    const vis = r.input.deliverables.find((x) => x.id === visibleId);
    expect(vis).toMatchObject({ minutes: 90, laborCents: 22_500, phaseId: phaseA, priority: "medium" });
    expect(r.input.deliverables).toHaveLength(2);
    expect(r.input.expenseCents).toBe(15_000);
    expect(r.input.entriesCount).toBe(2);
    expect(r.input.entriesWithoutRate).toBe(0);
    expect(r.input.phases.map((p) => p.name)).toEqual(["Diagnóstico"]);
    expect(r.input.meetings.map((m) => [m.title, m.sharedWithClient])).toEqual([
      ["Alinhamento interno", false],
      ["Revisão compartilhada", true],
    ]);
    expect(r.input.meetings[1].decisions).toBe("Priorizar o failover.");
  });

  it("id inválido ou inexistente devolve null", async () => {
    expect(await loadProjectStatus(admin, "nao-e-uuid")).toBeNull();
    expect(await loadProjectStatus(admin, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});

describe("portfólio (admin)", () => {
  it("só projetos em andamento e não arquivados, com horas e custos agregados", async () => {
    const rows = await loadPortfolioData(admin);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(projA);
    expect(ids).not.toContain(projDelivered);
    expect(ids).not.toContain(projArchived);
    const a = rows.find((r) => r.id === projA);
    expect(a).toMatchObject({ minutes: 120, laborCents: 30_000, expenseCents: 15_000, budgetCents: 100_000, companyName: "Construtora Rel", slug: "laudo-de-infra-ti" });
    expect(a?.deliverables).toHaveLength(2);
  });
});

describe("relatório do cliente (portal)", () => {
  it("só entrega visível e ata compartilhada; horas desligadas por padrão", async () => {
    const r = await loadClientReport(ctxA, projA);
    expect(r).not.toBeNull();
    if (!r) return;
    const json = JSON.stringify(r.input);
    expect(json).not.toContain("Custos internos ocultos");
    expect(json).not.toContain("Alinhamento interno");
    expect(r.input.deliverables.map((x) => x.title)).toEqual(["Mapa de rede visível"]);
    expect(r.input.meetings.map((m) => m.title)).toEqual(["Revisão compartilhada"]);
    expect(r.input.project.showHoursToClient).toBe(false);
    expect(r.input.minutesByPhase).toEqual([]);
  });

  it("com a chave ligada, soma todas as horas do projeto por fase", async () => {
    const res = await updateProject(admin, projA, { title: "Laudo de infra TI", budgetCents: "100000", showHoursToClient: "on" });
    expect(res.ok).toBe(true);
    const row = await db.query.project.findFirst({ where: eq(project.id, projA) });
    expect(row?.showHoursToClient).toBe(true);
    const r = await loadClientReport(ctxA, projA);
    const byPhase = Object.fromEntries((r?.input.minutesByPhase ?? []).map((m) => [m.phaseId ?? "sem", m.minutes]));
    expect(byPhase).toEqual({ [phaseA]: 90, sem: 30 });
    expect(JSON.stringify(r?.input)).not.toContain("Custos internos ocultos");

    const off = await updateProject(admin, projA, { title: "Laudo de infra TI", budgetCents: "100000" });
    expect(off.ok).toBe(true);
    expect((await db.query.project.findFirst({ where: eq(project.id, projA) }))?.showHoursToClient).toBe(false);
  });

  it("outra organização não enxerga o projeto", async () => {
    expect(await loadClientReport(ctxB, projA)).toBeNull();
    expect(await loadClientReport(ctxA, "nao-e-uuid")).toBeNull();
  });
});
