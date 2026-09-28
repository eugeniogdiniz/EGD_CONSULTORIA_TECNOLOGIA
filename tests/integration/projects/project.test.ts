import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, crmOpportunity, project as projectTable } from "@/db/schema";
import {
  archiveProject,
  changeProjectStatus,
  createProjectFromOpportunity,
  unarchiveProject,
  updateProject,
} from "@/modules/projects/actions";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "../setup";

let ctx: AdminContext;
let companyId: string;
let wonOpp: string;
let qualifiedOpp: string;

beforeAll(async () => {
  ctx = await ensureTestAdmin();
  const [c] = await db.insert(crmCompany).values({ name: "Emp T", slug: "emp-t", ownerId: ctx.user.id }).returning({ id: crmCompany.id });
  companyId = c.id;
  const [won] = await db
    .insert(crmOpportunity)
    .values({ companyId, title: "Won", stage: "won", ownerId: ctx.user.id, wonAt: new Date(), valueCents: 5500000 })
    .returning({ id: crmOpportunity.id });
  wonOpp = won.id;
  const [q] = await db
    .insert(crmOpportunity)
    .values({ companyId, title: "Qualified", stage: "qualified", ownerId: ctx.user.id })
    .returning({ id: crmOpportunity.id });
  qualifiedOpp = q.id;
});

describe("createProjectFromOpportunity", () => {
  it("cria a partir de won com copyValue=true e snapshot do valor", async () => {
    const r = await createProjectFromOpportunity(ctx, wonOpp, { title: "Piloto", copyValue: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const row = await db.query.project.findFirst({ where: eq(projectTable.id, r.data.id) });
    expect(row?.status).toBe("planning");
    expect(row?.budgetCents).toBe(5500000);
    expect(row?.companyId).toBe(companyId);
  });

  it("segunda tentativa falha citando o existente", async () => {
    const r = await createProjectFromOpportunity(ctx, wonOpp, { title: "Duplicado", copyValue: false });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Piloto/);
  });

  it("oportunidade não ganha é recusada", async () => {
    const r = await createProjectFromOpportunity(ctx, qualifiedOpp, { title: "Novo", copyValue: false });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/ganhas/);
  });

  it("opportunityId inexistente é recusado", async () => {
    const r = await createProjectFromOpportunity(ctx, "99999999-9999-4999-8999-999999999999", { title: "X", copyValue: false });
    expect(r.ok).toBe(false);
  });
});

describe("changeProjectStatus", () => {
  it("delivered grava endedAt; reabrir zera", async () => {
    const [p] = await db
      .insert(projectTable)
      .values({ opportunityId: (await db.insert(crmOpportunity).values({ companyId, title: "Won2", stage: "won", ownerId: ctx.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id }))[0].id, companyId, title: "P2", status: "active", ownerId: ctx.user.id })
      .returning({ id: projectTable.id });
    const del = await changeProjectStatus(ctx, p.id, { to: "delivered" });
    expect(del.ok).toBe(true);
    const row1 = await db.query.project.findFirst({ where: eq(projectTable.id, p.id) });
    expect(row1?.status).toBe("delivered");
    expect(row1?.endedAt).not.toBeNull();
    const reopen = await changeProjectStatus(ctx, p.id, { to: "active" });
    expect(reopen.ok).toBe(true);
    const row2 = await db.query.project.findFirst({ where: eq(projectTable.id, p.id) });
    expect(row2?.endedAt).toBeNull();
  });

  it("mesmo status é no-op", async () => {
    const p = await db.query.project.findFirst({ where: eq(projectTable.title, "P2") });
    if (!p) throw new Error("setup");
    const r = await changeProjectStatus(ctx, p.id, { to: "active" });
    expect(r.ok).toBe(true);
  });
});

describe("updateProject e archive", () => {
  it("update grava novos campos", async () => {
    const p = await db.query.project.findFirst({ where: eq(projectTable.title, "Piloto") });
    if (!p) throw new Error("setup");
    const r = await updateProject(ctx, p.id, { title: "Piloto v2", notes: "atualizado" });
    expect(r.ok).toBe(true);
    const row = await db.query.project.findFirst({ where: eq(projectTable.id, p.id) });
    expect(row?.title).toBe("Piloto v2");
    expect(row?.notes).toBe("atualizado");
  });

  it("archive/unarchive marca archivedAt e zera", async () => {
    const p = await db.query.project.findFirst({ where: eq(projectTable.title, "Piloto v2") });
    if (!p) throw new Error("setup");
    expect((await archiveProject(ctx, p.id)).ok).toBe(true);
    expect((await archiveProject(ctx, p.id)).ok).toBe(false);
    expect((await unarchiveProject(ctx, p.id)).ok).toBe(true);
    const row = await db.query.project.findFirst({ where: eq(projectTable.id, p.id) });
    expect(row?.archivedAt).toBeNull();
  });
});
