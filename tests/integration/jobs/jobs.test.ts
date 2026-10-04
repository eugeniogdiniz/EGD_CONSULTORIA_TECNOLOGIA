import { describe, it, expect, beforeAll } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  auditLog,
  crmCompany,
  crmOpportunity,
  crmProposal,
  jobRun,
  memberships,
  organizations,
  portalRequest,
  portalRequestMessage,
  project,
  projectDeliverable,
  projectMilestone,
} from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { claimAndRun, runManually } from "@/modules/jobs/runner";
import type { JobDefinition } from "@/modules/jobs/registry";
import { expireProposals } from "@/modules/jobs/digests/proposals";
import { loadDailyDigestInput } from "@/modules/jobs/digests/daily";
import { listDigestRecipients, loadClientDigestInput } from "@/modules/jobs/digests/weekly-client";
import { setJobEnabled, triggerJob } from "@/modules/jobs/actions";
import { listDisabledJobKeys, listJobsWithLastRun, listRuns } from "@/modules/jobs/queries";
import { setOrganizationWeeklyDigest } from "@/modules/tenancy/actions";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let companyA: string;
let companyB: string;
let orgA: string;
let orgB: string;
let clientA: { id: string; email: string };
let projA: string;
let projArchived: string;
let hiddenId: string;

const NOW = new Date("2026-10-02T12:00:00Z"); // sexta, 09:00 em SP
const TODAY = "2026-10-02";

async function client(email: string, name: string, active = true) {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name, emailVerified: true, role: "client", active }, { method: "admin" });
  return { id: u.id, email };
}
async function proposal(companyId: string, number: string, status: "draft" | "sent" | "accepted", validUntil: string | null) {
  const [opp] = await db.insert(crmOpportunity).values({ companyId, title: `Opp ${number}`, stage: "proposal", ownerId: admin.user.id }).returning({ id: crmOpportunity.id });
  const [p] = await db
    .insert(crmProposal)
    .values({ number, opportunityId: opp.id, title: `Proposta ${number}`, valueCents: 1000, status, validUntil, ownerId: admin.user.id, sentAt: status === "sent" ? new Date() : null })
    .returning({ id: crmProposal.id });
  return p.id;
}
async function makeProject(companyId: string, title: string, over: Partial<typeof project.$inferInsert> = {}) {
  const [opp] = await db.insert(crmOpportunity).values({ companyId, title, stage: "won", ownerId: admin.user.id, wonAt: new Date() }).returning({ id: crmOpportunity.id });
  const [p] = await db.insert(project).values({ opportunityId: opp.id, companyId, title, status: "active", ownerId: admin.user.id, ...over }).returning({ id: project.id });
  return p.id;
}

/** Automação de mentira com a chave de uma real: conta quantas vezes rodou. */
function stubJob(run: JobDefinition["run"]): JobDefinition {
  return {
    key: "propostas-expirar",
    name: "stub",
    description: "",
    schedule: { kind: "daily", hour: 7, minute: 30 },
    recipients: async () => "",
    run,
    preview: async () => ({ kind: "table", columns: [], rows: [], note: "" }),
  };
}

beforeAll(async () => {
  admin = await ensureTestAdmin();
  const [a] = await db.insert(organizations).values({ name: "Org A", slug: "org-a-jobs", weeklyDigest: true }).returning({ id: organizations.id });
  const [b] = await db.insert(organizations).values({ name: "Org B", slug: "org-b-jobs", weeklyDigest: false }).returning({ id: organizations.id });
  orgA = a.id;
  orgB = b.id;
  const [ca] = await db.insert(crmCompany).values({ name: "Empresa A", slug: "empresa-a-jobs", linkedOrganizationId: orgA, ownerId: admin.user.id }).returning({ id: crmCompany.id });
  const [cb] = await db.insert(crmCompany).values({ name: "Empresa B", slug: "empresa-b-jobs", linkedOrganizationId: orgB, ownerId: admin.user.id }).returning({ id: crmCompany.id });
  companyA = ca.id;
  companyB = cb.id;
  clientA = await client("cliente-a-jobs@test.local", "Cliente A");
  const inactive = await client("cliente-inativo-jobs@test.local", "Inativo", false);
  const clientB = await client("cliente-b-jobs@test.local", "Cliente B");
  await db.insert(memberships).values([
    { userId: clientA.id, organizationId: orgA },
    { userId: inactive.id, organizationId: orgA },
    { userId: clientB.id, organizationId: orgB },
  ]);

  projA = await makeProject(companyA, "Projeto A");
  projArchived = await makeProject(companyA, "Arquivado", { archivedAt: new Date() });
  await makeProject(companyB, "Projeto B");
  await db.insert(projectDeliverable).values([
    { projectId: projA, title: "Visível atrasada", ownerId: admin.user.id, visibleToClient: true, status: "doing", dueAt: "2026-09-28" },
    { projectId: projA, title: "Visível concluída", ownerId: admin.user.id, visibleToClient: true, status: "done", dueAt: "2026-09-29", completedAt: new Date("2026-09-30T12:00:00Z") },
    { projectId: projArchived, title: "Do arquivado", ownerId: admin.user.id, status: "todo", dueAt: "2026-09-01" },
  ]);
  const [h] = await db
    .insert(projectDeliverable)
    .values({ projectId: projA, title: "Interna", ownerId: admin.user.id, visibleToClient: false, status: "todo", dueAt: "2026-10-06" })
    .returning({ id: projectDeliverable.id });
  hiddenId = h.id;
  await db.insert(projectMilestone).values({ projectId: projA, name: "Marco", dueAt: "2026-10-07" });

  const [r1] = await db.insert(portalRequest).values({ organizationId: orgA, createdBy: clientA.id, title: "Sem resposta", body: "x", status: "open" }).returning({ id: portalRequest.id });
  const [r2] = await db.insert(portalRequest).values({ organizationId: orgA, createdBy: clientA.id, title: "Equipe respondeu", body: "x", status: "in_progress" }).returning({ id: portalRequest.id });
  await db.insert(portalRequestMessage).values({ requestId: r2.id, authorId: admin.user.id, body: "resposta" });
  void r1;
});

describe("livro-razão", () => {
  it("duas reivindicações concorrentes do mesmo período executam uma vez", async () => {
    let calls = 0;
    const job = stubJob(async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 50));
      return { text: "ok" };
    });
    const [a, b] = await Promise.all([claimAndRun(job, NOW), claimAndRun(job, NOW)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(calls).toBe(1);
    expect(await claimAndRun(job, NOW)).toBeNull(); // já concluída
    const rows = await db.select().from(jobRun).where(and(eq(jobRun.job, "propostas-expirar"), eq(jobRun.periodKey, TODAY)));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("ok");
    expect(rows[0].summary).toEqual({ text: "ok" });
  });

  it("erro tenta de novo até a terceira; manual não bloqueia a agendada", async () => {
    await db.delete(jobRun);
    const job = stubJob(async () => {
      throw new Error("SMTP caiu");
    });
    const min = (n: number) => new Date(NOW.getTime() + n * 60_000);
    expect((await claimAndRun(job, NOW))?.status).toBe("error");
    // backoff (Fase 21): a 2ª tentativa só depois de 5 min; a 3ª, 15 min depois da 2ª
    expect(await claimAndRun(job, min(2))).toBeNull();
    expect((await claimAndRun(job, min(5)))?.status).toBe("error");
    const manual = await runManually(job, admin.user.id, min(6));
    expect(manual.status).toBe("error");
    expect(manual.error).toContain("SMTP caiu");
    expect(await claimAndRun(job, min(10))).toBeNull();
    expect((await claimAndRun(job, min(20)))?.status).toBe("error");
    expect(await claimAndRun(job, min(60))).toBeNull(); // esgotou as 3 tentativas
    const rows = await db.select({ attempt: jobRun.attempt, trigger: jobRun.trigger }).from(jobRun).orderBy(jobRun.startedAt);
    expect(rows.filter((r) => r.trigger === "schedule").map((r) => r.attempt)).toEqual([1, 2, 3]);
    expect(rows.filter((r) => r.trigger === "manual")).toHaveLength(1);
    const runs = await listRuns(admin);
    expect(runs.find((r) => r.trigger === "manual")?.actorName).toBe("Admin Teste");
  });

  it("liga/desliga e Enviar agora pela action", async () => {
    await db.delete(jobRun);
    expect(await setJobEnabled(admin, "resumo-diario", false)).toEqual({ ok: true, data: null });
    expect([...(await listDisabledJobKeys())]).toEqual(["resumo-diario"]);
    expect((await setJobEnabled(admin, "nao-existe", false)).ok).toBe(false);
    await setJobEnabled(admin, "resumo-diario", true);
    expect((await listDisabledJobKeys()).size).toBe(0);

    const r = await triggerJob(admin, "propostas-expirar");
    expect(r.ok).toBe(true);
    const list = await listJobsWithLastRun(admin);
    const row = list.find((j) => j.key === "propostas-expirar")!;
    expect(row.lastRun?.status).toBe("ok");
    expect(row.running).toBe(false);
    const audits = await db.select({ action: auditLog.action }).from(auditLog).where(eq(auditLog.entityType, "job"));
    expect(audits.map((a) => a.action)).toEqual(expect.arrayContaining(["job.setting.updated", "job.triggered"]));
  });
});

describe("expirar propostas", () => {
  it("só as enviadas com validade passada, com auditoria do sistema", async () => {
    const past = await proposal(companyA, "PROP-26-901", "sent", "2026-10-01");
    const today = await proposal(companyA, "PROP-26-902", "sent", "2026-10-02");
    const draft = await proposal(companyA, "PROP-26-903", "draft", "2026-01-01");
    const accepted = await proposal(companyA, "PROP-26-904", "accepted", "2026-01-01");
    const r = await expireProposals(TODAY, NOW);
    expect(r).toEqual({ expired: 1, numbers: ["PROP-26-901"] });
    const statuses = await Promise.all([past, today, draft, accepted].map(async (id) => (await db.query.crmProposal.findFirst({ where: eq(crmProposal.id, id) }))!));
    expect(statuses.map((s) => s.status)).toEqual(["expired", "sent", "draft", "accepted"]);
    expect(statuses[0].decisionNotes).toBe("Expirada automaticamente em 01/10/2026.".replace("01/10/2026", "02/10/2026"));
    const [a] = await db.select().from(auditLog).where(and(eq(auditLog.entityId, past), eq(auditLog.action, "crm.proposal.expired")));
    expect(a.actorId).toBeNull();
    expect(a.metadata).toMatchObject({ automatic: true });
    // segunda passada: nada a fazer
    expect((await expireProposals(TODAY, NOW)).expired).toBe(0);
  });
});

describe("carregadores", () => {
  it("resumo diário ignora projetos arquivados e sabe quem falou por último", async () => {
    const input = await loadDailyDigestInput(TODAY);
    const titles = input.deliverables.map((d) => d.title);
    expect(titles).toContain("Visível atrasada");
    expect(titles).toContain("Interna");
    expect(titles).not.toContain("Do arquivado");
    expect(titles).not.toContain("Visível concluída");
    expect(input.milestones.map((m) => m.name)).toEqual(["Marco"]);
    const byTitle = Object.fromEntries(input.requests.map((r) => [r.title, r.lastAuthor]));
    expect(byTitle).toEqual({ "Sem resposta": null, "Equipe respondeu": "team" });
    expect(input.proposals.some((p) => p.status === "expired")).toBe(true);
  });

  it("andamento do cliente: só a organização dele, só entregas visíveis; destinatários só ativos e com o resumo ligado", async () => {
    const a = (await loadClientDigestInput(orgA))!;
    expect(a.organizationName).toBe("Org A");
    expect(a.projects.map((p) => p.title).sort()).toEqual(["Projeto A"]); // arquivado fora
    const titles = a.projects[0].deliverables.map((d) => d.title);
    expect(titles).toEqual(expect.arrayContaining(["Visível atrasada", "Visível concluída"]));
    expect(titles).not.toContain("Interna");
    expect(JSON.stringify(a)).not.toContain(hiddenId);
    expect(a.requests.map((r) => [r.title, r.lastAuthor])).toEqual(expect.arrayContaining([["Equipe respondeu", "team"]]));

    const b = (await loadClientDigestInput(orgB))!;
    expect(b.projects.map((p) => p.title)).toEqual(["Projeto B"]);

    const recipients = await listDigestRecipients();
    expect(recipients.map((o) => o.name)).toEqual(["Org A"]);
    expect(recipients[0].recipients.map((r) => r.email)).toEqual(["cliente-a-jobs@test.local"]);
  });

  it("membro do portal só liga o resumo da própria organização", async () => {
    const ctx: PortalContext = {
      kind: "portal",
      user: { id: clientA.id, name: "Cliente A", email: clientA.email, role: "client", active: true },
      organization: { id: orgA, name: "Org A", slug: "org-a-jobs", status: "active" },
      organizations: [],
    };
    expect((await setOrganizationWeeklyDigest(ctx, orgB, true)).ok).toBe(false);
    expect((await setOrganizationWeeklyDigest(ctx, orgA, false)).ok).toBe(true);
    expect((await db.query.organizations.findFirst({ where: eq(organizations.id, orgA) }))?.weeklyDigest).toBe(false);
    expect((await listDigestRecipients()).length).toBe(0);
    expect((await setOrganizationWeeklyDigest(admin, orgA, true)).ok).toBe(true);
  });
});
