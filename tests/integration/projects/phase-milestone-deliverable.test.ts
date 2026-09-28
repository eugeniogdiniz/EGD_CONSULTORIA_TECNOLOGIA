import { describe, it, expect, beforeAll } from "vitest";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmCompany,
  crmOpportunity,
  project as projectTable,
  projectDeliverable,
  projectMilestone,
  projectPhase,
} from "@/db/schema";
import {
  changeDeliverableStatus,
  completeMilestone,
  createDeliverable,
  createMilestone,
  createPhase,
  deletePhase,
  movePhase,
  uncompleteMilestone,
} from "@/modules/projects/actions";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "../setup";

let ctx: AdminContext;
let projectId: string;

beforeAll(async () => {
  ctx = await ensureTestAdmin();
  const [c] = await db.insert(crmCompany).values({ name: "Emp PMD", slug: "emp-pmd", ownerId: ctx.user.id }).returning({ id: crmCompany.id });
  const [o] = await db.insert(crmOpportunity).values({ companyId: c.id, title: "PMD", stage: "won", ownerId: ctx.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id });
  const [p] = await db.insert(projectTable).values({ opportunityId: o.id, companyId: c.id, title: "Projeto PMD", ownerId: ctx.user.id }).returning({ id: projectTable.id });
  projectId = p.id;
});

describe("createPhase / movePhase", () => {
  it("cria 3 fases com position 0, 1, 2 sequenciais", async () => {
    for (const name of ["Kickoff", "Execução", "Aceite"]) {
      const r = await createPhase(ctx, { projectId, name });
      expect(r.ok).toBe(true);
    }
    const rows = await db
      .select({ id: projectPhase.id, name: projectPhase.name, position: projectPhase.position })
      .from(projectPhase)
      .where(eq(projectPhase.projectId, projectId))
      .orderBy(asc(projectPhase.position));
    expect(rows.map((r) => r.name)).toEqual(["Kickoff", "Execução", "Aceite"]);
    expect(rows.map((r) => r.position)).toEqual([0, 1, 2]);
  });

  it("movePhase down troca com o próximo e mantém 0..n-1", async () => {
    const phases = await db.select().from(projectPhase).where(eq(projectPhase.projectId, projectId)).orderBy(asc(projectPhase.position));
    const kickoff = phases.find((p) => p.name === "Kickoff")!;
    const r = await movePhase(ctx, kickoff.id, "down");
    expect(r.ok).toBe(true);
    const after = await db.select().from(projectPhase).where(eq(projectPhase.projectId, projectId)).orderBy(asc(projectPhase.position));
    expect(after.map((p) => p.name)).toEqual(["Execução", "Kickoff", "Aceite"]);
    expect(after.map((p) => p.position)).toEqual([0, 1, 2]);
  });
});

describe("deletePhase", () => {
  it("bloqueia deletar fase com entregas", async () => {
    const phase = await db.query.projectPhase.findFirst({ where: eq(projectPhase.name, "Execução") });
    if (!phase) throw new Error("setup");
    await createDeliverable(ctx, { projectId, phaseId: phase.id, title: "Uma entrega" });
    const r = await deletePhase(ctx, phase.id);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/entrega/);
  });

  it("deleta fase sem entregas e renumera as remanescentes", async () => {
    // "Aceite" está sem entregas
    const phase = await db.query.projectPhase.findFirst({ where: eq(projectPhase.name, "Aceite") });
    if (!phase) throw new Error("setup");
    const r = await deletePhase(ctx, phase.id);
    expect(r.ok).toBe(true);
    const remaining = await db.select({ name: projectPhase.name, position: projectPhase.position }).from(projectPhase).where(eq(projectPhase.projectId, projectId)).orderBy(asc(projectPhase.position));
    expect(remaining.map((r) => r.position)).toEqual([0, 1]);
  });
});

describe("Milestones", () => {
  it("createMilestone exige dueAt", async () => {
    // schema captura antes; ok se dueAt não vier
    const r = await createMilestone(ctx, { projectId, name: "M sem data", dueAt: "" });
    expect(r.ok).toBe(false);
  });

  it("complete e uncomplete", async () => {
    const r = await createMilestone(ctx, { projectId, name: "Marco final", dueAt: "2030-01-01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await completeMilestone(ctx, r.data.id);
    const done = await db.query.projectMilestone.findFirst({ where: eq(projectMilestone.id, r.data.id) });
    expect(done?.completedAt).not.toBeNull();
    await uncompleteMilestone(ctx, r.data.id);
    const undone = await db.query.projectMilestone.findFirst({ where: eq(projectMilestone.id, r.data.id) });
    expect(undone?.completedAt).toBeNull();
  });
});

describe("Deliverable status transitions", () => {
  it("todo → done grava completedAt; sair de done zera", async () => {
    const phase = await db.query.projectPhase.findFirst({ where: eq(projectPhase.projectId, projectId) });
    if (!phase) throw new Error("setup");
    const r = await createDeliverable(ctx, { projectId, phaseId: phase.id, title: "Ata" });
    if (!r.ok) throw new Error("setup");

    const done = await changeDeliverableStatus(ctx, r.data.id, { to: "done" });
    expect(done.ok).toBe(true);
    const row1 = await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, r.data.id) });
    expect(row1?.completedAt).not.toBeNull();

    const back = await changeDeliverableStatus(ctx, r.data.id, { to: "doing" });
    expect(back.ok).toBe(true);
    const row2 = await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, r.data.id) });
    expect(row2?.completedAt).toBeNull();
  });

  it("blocked sem motivo falha; com motivo grava no description", async () => {
    const phase = await db.query.projectPhase.findFirst({ where: eq(projectPhase.projectId, projectId) });
    if (!phase) throw new Error("setup");
    const r = await createDeliverable(ctx, { projectId, phaseId: phase.id, title: "Bloqueio", description: "descrição inicial" });
    if (!r.ok) throw new Error("setup");

    const sem = await changeDeliverableStatus(ctx, r.data.id, { to: "blocked" });
    expect(sem.ok).toBe(false);

    const com = await changeDeliverableStatus(ctx, r.data.id, { to: "blocked", blockReason: "espera aprovação" });
    expect(com.ok).toBe(true);
    const row = await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, r.data.id) });
    expect(row?.description).toMatch(/## Bloqueio\nespera aprovação/);
  });
});
