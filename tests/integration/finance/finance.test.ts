import { describe, it, expect, beforeAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog, crmCompany, crmOpportunity, notification, project, projectDeliverable, projectInvoice, projectTimeEntry, users } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { cancelInvoice, createInvoice, logManualTime, markInvoicePaid, setProjectRate, updateInvoice } from "@/modules/projects/actions";
import { getProjectFinancials, listHoursByPerson, listInvoices, listProjectRates, listTimeCostsByDeliverable, resolveRateForDeliverable } from "@/modules/projects/queries";
import { loadDailyDigestInput, buildDailyDigest } from "@/modules/jobs/digests/daily";
import { getJob } from "@/modules/jobs/registry";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let projectId: string;
let deliverableId: string;

beforeAll(async () => {
  admin = await ensureTestAdmin();
  const [company] = await db.insert(crmCompany).values({ name: "Fin Co", slug: `fin-${Date.now()}`, ownerId: admin.user.id }).returning({ id: crmCompany.id });
  const [opp] = await db.insert(crmOpportunity).values({ companyId: company.id, title: "Op Fin", stage: "won", ownerId: admin.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id });
  const [p] = await db.insert(project).values({ opportunityId: opp.id, companyId: company.id, title: "Projeto Fin", status: "active", ownerId: admin.user.id, budgetCents: 1_000_000 }).returning({ id: project.id });
  projectId = p.id;
  const [d] = await db.insert(projectDeliverable).values({ projectId, title: "Entrega Fin", ownerId: admin.user.id, estimateMinutes: 600 }).returning({ id: projectDeliverable.id });
  deliverableId = d.id;
  await db.update(users).set({ hourlyRateCents: 10_000 }).where(eq(users.id, admin.user.id));
});

const mk = (description: string, dueAt: string, amountCents = 100_000) => createInvoice(admin, { projectId, description, amountCents: String(amountCents), dueAt, notes: "" });

describe("parcelas", () => {
  it("numera por projeto, lista, edita pendente, paga e cancela com auditoria", async () => {
    const a = await mk("Entrada", "2026-09-01");
    const b = await mk("Parcela 2", "2026-12-01", 50_000);
    expect(a.ok && b.ok).toBe(true);
    let list = await listInvoices(admin, projectId);
    expect(list.map((i) => i.number)).toEqual([1, 2]);
    const aId = (a.ok && a.data.id) as string;
    const bId = (b.ok && b.data.id) as string;
    expect((await updateInvoice(admin, bId, { projectId, description: "Parcela final", amountCents: "60000", dueAt: "2026-12-15", notes: "" })).ok).toBe(true);
    expect((await markInvoicePaid(admin, aId, "2026-09-05")).ok).toBe(true);
    expect((await markInvoicePaid(admin, aId, "2026-09-06")).ok).toBe(false); // já paga
    expect((await updateInvoice(admin, aId, { projectId, description: "x y", amountCents: "1", dueAt: "2026-09-01", notes: "" })).ok).toBe(false);
    expect((await cancelInvoice(admin, bId)).ok).toBe(true);
    list = await listInvoices(admin, projectId);
    expect(list.find((i) => i.id === aId)?.status).toBe("paid");
    expect(list.find((i) => i.id === aId)?.paidAt).toBe("2026-09-05");
    expect(list.find((i) => i.id === bId)?.status).toBe("cancelled");
    const acts = (await db.select({ a: auditLog.action }).from(auditLog).where(eq(auditLog.entityType, "project_invoice"))).map((r) => r.a);
    for (const x of ["project.invoice.created", "project.invoice.updated", "project.invoice.paid", "project.invoice.cancelled"]) expect(acts).toContain(x);
    const c = await mk("Terceira", "2027-01-01");
    expect((await listInvoices(admin, projectId)).find((i) => i.id === (c.ok && c.data.id))?.number).toBe(3);
  });

  it("automação e resumo diário: vencida vira uma notificação ao dono e entra na seção Financeiro", async () => {
    await db.delete(notification);
    await db.delete(projectInvoice);
    await mk("Vencida", "2026-09-01");
    await mk("Em dia", "2030-01-01");
    const job = getJob("parcelas-vencidas")!;
    const r = await job.run({ now: new Date("2026-10-03T12:00:00Z"), today: "2026-10-03", baseUrl: "http://x" });
    expect(r.overdue).toBe(1);
    const notes = await db.select().from(notification).where(eq(notification.kind, "invoice.overdue"));
    expect(notes.length).toBeGreaterThanOrEqual(1);
    expect(notes[0].title).toMatch(/1 parcela vencida/);
    const digest = buildDailyDigest(await loadDailyDigestInput("2026-10-03"), "2026-10-03");
    expect(digest.overdueInvoices.total).toBe(1);
    expect(digest.dueInvoices.total).toBe(0);
    // sem vencida: nada
    await db.update(projectInvoice).set({ status: "paid", paidAt: "2026-10-03" }).where(eq(projectInvoice.description, "Vencida"));
    const r2 = await job.run({ now: new Date("2026-10-03T12:00:00Z"), today: "2026-10-03", baseUrl: "http://x" });
    expect(r2.sent).toBe(0);
  });
});

describe("rate por projeto e histórico", () => {
  it("entrada fechada congela o rate; mudar o rate do projeto só afeta entradas novas", async () => {
    await db.delete(projectTimeEntry);
    expect(await resolveRateForDeliverable(deliverableId, admin.user.id)).toBe(10_000);
    const e1 = await logManualTime(admin, { deliverableId, startedAt: "2026-10-01T09:00", endedAt: "2026-10-01T10:00", notes: "" });
    expect(e1.ok).toBe(true);
    expect((await setProjectRate(admin, { projectId, userId: admin.user.id, hourlyRateCents: "20000" })).ok).toBe(true);
    expect(await resolveRateForDeliverable(deliverableId, admin.user.id)).toBe(20_000);
    const e2 = await logManualTime(admin, { deliverableId, startedAt: "2026-10-02T09:00", endedAt: "2026-10-02T10:00", notes: "" });
    expect(e2.ok).toBe(true);
    const rows = await db.select({ rate: projectTimeEntry.rateCents }).from(projectTimeEntry).where(eq(projectTimeEntry.deliverableId, deliverableId)).orderBy(projectTimeEntry.startedAt);
    expect(rows.map((r) => r.rate)).toEqual([10_000, 20_000]);
    const fin = await getProjectFinancials(admin, projectId);
    expect(fin?.laborCents).toBe(30_000);
    const costs = await listTimeCostsByDeliverable(admin, projectId);
    expect(costs.find((c) => c.deliverableId === deliverableId)).toMatchObject({ totalMinutes: 120, laborCents: 30_000, estimateMinutes: 600 });
    // entradas antigas sem snapshot usam o rate do projeto, senão o da pessoa
    await db.update(projectTimeEntry).set({ rateCents: null }).where(eq(projectTimeEntry.id, (e1.ok && e1.data.id) as string));
    expect((await getProjectFinancials(admin, projectId))?.laborCents).toBe(40_000);
    const rates = await listProjectRates(admin, projectId);
    expect(rates.find((r) => r.userId === admin.user.id)).toMatchObject({ personalRateCents: 10_000, projectRateCents: 20_000 });
    expect((await setProjectRate(admin, { projectId, userId: admin.user.id, hourlyRateCents: "" })).ok).toBe(true);
    expect((await listProjectRates(admin, projectId)).find((r) => r.userId === admin.user.id)?.projectRateCents).toBeNull();
  });

  it("horas por pessoa respeita período, pessoa e projeto", async () => {
    const all = await listHoursByPerson(admin, { from: "2026-10-01", to: "2026-10-31" });
    const mine = all.find((r) => r.userId === admin.user.id && r.projectId === projectId);
    expect(mine?.minutes).toBe(120);
    expect((await listHoursByPerson(admin, { from: "2026-10-02", to: "2026-10-02" })).find((r) => r.projectId === projectId)?.minutes).toBe(60);
    expect((await listHoursByPerson(admin, { from: "2026-11-01", to: "2026-11-30" })).filter((r) => r.projectId === projectId)).toHaveLength(0);
    expect((await listHoursByPerson(admin, { from: "2026-10-01", to: "2026-10-31", userId: "00000000-0000-4000-8000-000000000000" })).length).toBe(0);
    const c = await auth.$context;
    void c;
    expect(await db.select().from(projectDeliverable).where(and(eq(projectDeliverable.id, deliverableId), eq(projectDeliverable.estimateMinutes, 600)))).toHaveLength(1);
  });
});
