import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import {
  crmCompany,
  crmOpportunity,
  project,
  projectDeliverable,
  projectMilestone,
  projectPhase,
} from "@/db/schema";
import {
  getProject,
  getProjectByOpportunity,
  listDeliverables,
  listDeliverablesGroupedByStatus,
  listMilestones,
  listPhasesWithCounts,
  listProjects,
  upcomingDeliverables,
} from "@/modules/projects/queries";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "../setup";

let ctx: AdminContext;
let projectId: string;
let phaseIds: [string, string, string];

beforeAll(async () => {
  ctx = await ensureTestAdmin();
  const ownerId = ctx.user.id;

  const [company] = await db
    .insert(crmCompany)
    .values({ name: "Empresa Q", slug: "empresa-q", ownerId })
    .returning({ id: crmCompany.id });

  const [opportunity] = await db
    .insert(crmOpportunity)
    .values({ companyId: company.id, title: "Neg. Q", stage: "won", ownerId, wonAt: new Date() })
    .returning({ id: crmOpportunity.id });

  const [p] = await db
    .insert(project)
    .values({
      opportunityId: opportunity.id,
      companyId: company.id,
      title: "Projeto Q",
      status: "active",
      budgetCents: 5000000,
      ownerId,
    })
    .returning({ id: project.id });
  projectId = p.id;

  const phases = await db
    .insert(projectPhase)
    .values([
      { projectId, name: "Kickoff", position: 0 },
      { projectId, name: "Execução", position: 1 },
      { projectId, name: "Aceite", position: 2 },
    ])
    .returning({ id: projectPhase.id });
  phaseIds = [phases[0].id, phases[1].id, phases[2].id];

  const today = new Date().toISOString().slice(0, 10);
  const soon = "2030-12-31";
  await db.insert(projectMilestone).values([
    { projectId, phaseId: phaseIds[0], name: "Reunião de kickoff", dueAt: today, completedAt: new Date() },
    { projectId, phaseId: phaseIds[0], name: "Aceite do escopo", dueAt: today },
    { projectId, phaseId: phaseIds[2], name: "Aceite formal", dueAt: soon },
  ]);

  await db.insert(projectDeliverable).values([
    { projectId, phaseId: phaseIds[0], title: "Ata do kickoff", status: "done", position: 0, ownerId, completedAt: new Date() },
    { projectId, phaseId: phaseIds[1], title: "Inventário", status: "doing", position: 0, ownerId, dueAt: soon },
    { projectId, phaseId: phaseIds[1], title: "Backup gerenciado", status: "todo", position: 0, ownerId, dueAt: soon },
    { projectId, phaseId: phaseIds[1], title: "Segurança de rede", status: "review", position: 0, ownerId },
    { projectId, phaseId: phaseIds[2], title: "Rascunho do laudo", status: "todo", position: 1, ownerId, dueAt: soon },
    { projectId, phaseId: phaseIds[2], title: "Aguardando aprovação", status: "blocked", position: 0, ownerId },
  ]);
});

describe("listProjects", () => {
  it("mostra apenas os não arquivados por default", async () => {
    const rows = await listProjects(ctx);
    expect(rows.some((r) => r.id === projectId)).toBe(true);
    expect(rows.every((r) => r.archivedAt === null)).toBe(true);
  });
  it("filtra por status", async () => {
    const rows = await listProjects(ctx, { status: "active" });
    expect(rows.every((r) => r.status === "active")).toBe(true);
  });
  it("busca por nome de empresa", async () => {
    const rows = await listProjects(ctx, { search: "Empresa Q" });
    expect(rows.some((r) => r.id === projectId)).toBe(true);
  });
});

describe("getProject e getProjectByOpportunity", () => {
  it("getProject devolve joins de company, opportunity e owner", async () => {
    const row = await getProject(ctx, projectId);
    expect(row?.company.name).toBe("Empresa Q");
    expect(row?.opportunity.title).toBe("Neg. Q");
    expect(row?.owner.email).toBeTruthy();
  });
  it("getProjectByOpportunity encontra pelo id da oportunidade", async () => {
    const p = await getProject(ctx, projectId);
    if (!p) throw new Error("setup");
    const row = await getProjectByOpportunity(ctx, p.opportunity.id);
    expect(row?.id).toBe(projectId);
  });
});

describe("listPhasesWithCounts", () => {
  it("agrega contadores de entregas e marcos por fase", async () => {
    const rows = await listPhasesWithCounts(ctx, projectId);
    expect(rows.map((r) => r.name)).toEqual(["Kickoff", "Execução", "Aceite"]);
    expect(rows[0].milestoneCount).toBe(2);
    expect(rows[0].deliverableCount).toBe(1);
    expect(rows[1].deliverableCount).toBe(3);
    expect(rows[2].deliverableCount).toBe(2);
  });
});

describe("listMilestones", () => {
  it("filtra pendentes quando onlyPending=true", async () => {
    const all = await listMilestones(ctx, projectId);
    const pending = await listMilestones(ctx, projectId, { onlyPending: true });
    expect(all.length).toBe(3);
    expect(pending.length).toBe(2);
    expect(pending.every((m) => m.completedAt === null)).toBe(true);
  });
});

describe("listDeliverables e listDeliverablesGroupedByStatus", () => {
  it("filtra por fase", async () => {
    const rows = await listDeliverables(ctx, projectId, { phaseId: phaseIds[1] });
    expect(rows).toHaveLength(3);
  });
  it("agrupa em 5 colunas com contadores", async () => {
    const cols = await listDeliverablesGroupedByStatus(ctx, projectId);
    expect(cols.map((c) => c.status)).toEqual(["todo", "doing", "review", "done", "blocked"]);
    const by = Object.fromEntries(cols.map((c) => [c.status, c.count]));
    expect(by.todo).toBe(2);
    expect(by.doing).toBe(1);
    expect(by.review).toBe(1);
    expect(by.done).toBe(1);
    expect(by.blocked).toBe(1);
  });
});

describe("upcomingDeliverables", () => {
  it("devolve só as abertas ordenadas por due", async () => {
    const rows = await upcomingDeliverables(ctx, projectId, 5);
    expect(rows.every((r) => r.status !== "done" && r.status !== "blocked")).toBe(true);
  });
});
