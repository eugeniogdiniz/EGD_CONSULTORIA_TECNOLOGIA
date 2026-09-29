import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { crmCompany, crmOpportunity, project, projectDeliverable, projectDeliverableComment } from "@/db/schema";
import { createComment } from "@/modules/projects/actions";
import { getAdminOverview, listDeadlines, listRecentClientComments } from "@/modules/dashboard/queries";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "../setup";

let ctx: AdminContext;
let projectId: string;
let overdueId: string;
let soonId: string;
let clientUserId: string;

const TODAY = "2026-10-15";

async function newProject(companyId: string, title: string, status: "planning" | "active" | "delivered", archived = false) {
  const [opp] = await db
    .insert(crmOpportunity)
    .values({ companyId, title, stage: "won", ownerId: ctx.user.id, wonAt: new Date() })
    .returning({ id: crmOpportunity.id });
  const [p] = await db
    .insert(project)
    .values({ opportunityId: opp.id, companyId, title, status, ownerId: ctx.user.id, archivedAt: archived ? new Date() : null })
    .returning({ id: project.id });
  return p.id;
}

const deliverable = async (pid: string, title: string, extra: Partial<typeof projectDeliverable.$inferInsert>) =>
  (await db.insert(projectDeliverable).values({ projectId: pid, title, ownerId: ctx.user.id, ...extra }).returning({ id: projectDeliverable.id }))[0].id;

beforeAll(async () => {
  ctx = await ensureTestAdmin();
  const [company] = await db.insert(crmCompany).values({ name: "Empresa Painel", slug: "empresa-painel", ownerId: ctx.user.id }).returning({ id: crmCompany.id });

  // funil: 2 abertas (valor 1.000,00 + 2.500,00), 1 perdida e 1 ganha (não contam)
  const open = { companyId: company.id, ownerId: ctx.user.id };
  await db.insert(crmOpportunity).values({ ...open, title: "A", stage: "qualified", valueCents: 100000 });
  await db.insert(crmOpportunity).values({ ...open, title: "B", stage: "proposal", valueCents: 250000 });
  await db.insert(crmOpportunity).values({ ...open, title: "C", stage: "lost", valueCents: 999999, lostAt: new Date() });
  await db.insert(crmOpportunity).values({ ...open, title: "D", stage: "won", valueCents: 888888, wonAt: new Date() });

  projectId = await newProject(company.id, "Projeto Ativo", "active");
  const done = await newProject(company.id, "Projeto Entregue", "delivered");
  const archived = await newProject(company.id, "Projeto Arquivado", "active", true);

  overdueId = await deliverable(projectId, "Atrasada", { dueAt: "2026-10-10" });
  soonId = await deliverable(projectId, "Vence logo", { dueAt: "2026-10-20" });
  await deliverable(projectId, "Longe", { dueAt: "2026-12-01" });
  await deliverable(projectId, "Feita e vencida", { dueAt: "2026-10-01", status: "done" });
  await deliverable(projectId, "Sem prazo", {});
  await deliverable(done, "De projeto entregue", { dueAt: "2026-10-05" });
  await deliverable(archived, "De projeto arquivado", { dueAt: "2026-10-05" });

  const c = await auth.$context;
  const u = await c.internalAdapter.createUser(
    { email: "cliente-painel@test.local", name: "Cliente Painel", emailVerified: true, role: "client", active: true },
    { method: "admin" },
  );
  clientUserId = u.id;
});

describe("getAdminOverview", () => {
  it("conta funil aberto e soma o valor, ignorando ganhas e perdidas", async () => {
    const o = await getAdminOverview(ctx, TODAY);
    expect(o.openOpportunities).toBe(2);
    expect(o.pipelineCents).toBe(350000);
  });

  it("conta só projetos ativos não arquivados", async () => {
    expect((await getAdminOverview(ctx, TODAY)).activeProjects).toBe(1);
  });

  it("atrasadas e da semana ignoram feitas, sem prazo, entregues e arquivados", async () => {
    const o = await getAdminOverview(ctx, TODAY);
    expect(o.overdueDeliverables).toBe(1);
    expect(o.dueThisWeek).toBe(1);
  });

  it("a janela de 7 dias inclui o dia de hoje e o sétimo dia", async () => {
    await db.update(projectDeliverable).set({ dueAt: TODAY }).where(sql`${projectDeliverable.id} = ${soonId}`);
    expect((await getAdminOverview(ctx, TODAY)).dueThisWeek).toBe(1);
    await db.update(projectDeliverable).set({ dueAt: "2026-10-22" }).where(sql`${projectDeliverable.id} = ${soonId}`);
    expect((await getAdminOverview(ctx, TODAY)).dueThisWeek).toBe(1);
    await db.update(projectDeliverable).set({ dueAt: "2026-10-23" }).where(sql`${projectDeliverable.id} = ${soonId}`);
    expect((await getAdminOverview(ctx, TODAY)).dueThisWeek).toBe(0);
    await db.update(projectDeliverable).set({ dueAt: "2026-10-20" }).where(sql`${projectDeliverable.id} = ${soonId}`);
  });
});

describe("listDeadlines", () => {
  it("lista atrasadas e da semana, mais antigas primeiro, marcando atraso", async () => {
    const list = await listDeadlines(ctx, TODAY);
    expect(list.map((d) => d.title)).toEqual(["Atrasada", "Vence logo"]);
    expect(list[0]).toMatchObject({ id: overdueId, overdue: true, projectTitle: "Projeto Ativo", projectId });
    expect(list[1].overdue).toBe(false);
  });

  it("respeita o limite", async () => {
    expect(await listDeadlines(ctx, TODAY, 1)).toHaveLength(1);
  });
});

describe("listRecentClientComments", () => {
  it("mostra comentários de cliente, não os da equipe nem os apagados", async () => {
    await db.insert(projectDeliverableComment).values({ deliverableId: soonId, authorId: clientUserId, body: "Dúvida do cliente" });
    await db.insert(projectDeliverableComment).values({ deliverableId: soonId, authorId: clientUserId, body: "Apagado", deletedAt: new Date() });
    await createComment(ctx, { deliverableId: soonId, parentId: "", body: "Resposta da equipe" });

    const list = await listRecentClientComments(ctx);
    expect(list.map((c) => c.body)).toEqual(["Dúvida do cliente"]);
    expect(list[0]).toMatchObject({ authorName: "Cliente Painel", deliverableId: soonId, deliverableTitle: "Vence logo", projectId });
  });

  it("ignora comentários com mais de 14 dias", async () => {
    await db
      .update(projectDeliverableComment)
      .set({ createdAt: new Date(Date.now() - 15 * 86_400_000) })
      .where(sql`${projectDeliverableComment.body} = 'Dúvida do cliente'`);
    expect(await listRecentClientComments(ctx)).toEqual([]);
  });
});
