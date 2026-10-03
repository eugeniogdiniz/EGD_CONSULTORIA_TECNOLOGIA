import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { SYSTEM_CONTEXT } from "@/modules/jobs/system-context";
import {
  crmCompany,
  meeting,
  project,
  projectDeliverable,
  projectExpense,
  projectMilestone,
  projectTimeEntry,
  users,
} from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { slugify } from "@/modules/tenancy/slug";
import { getProject, listDeliverables, listMilestones, listPhases, listTimeCostsByDeliverable } from "@/modules/projects/queries";
import type { PortfolioProjectInput, ProjectStatusInput } from "./build";

/**
 * Leitura dos relatórios internos. As funções só juntam linhas; toda conta
 * (progresso, atraso, consumo) fica nos builders puros de `build.ts`.
 */

/** Custo de horas pela mesma fórmula do financeiro: minutos × valor/hora ÷ 60, por lançamento. */
const laborCentsSql = sql<number>`coalesce(sum(case when ${users.hourlyRateCents} is not null then floor(${projectTimeEntry.minutes} * ${users.hourlyRateCents} / 60)::bigint else 0 end), 0)::bigint`;

export async function loadProjectStatus(
  ctx: AdminContext,
  id: string,
): Promise<{ input: ProjectStatusInput; projectId: string; slug: string } | null> {
  if (!isUuid(id)) return null;
  const row = await getProject(ctx, id);
  if (!row) return null;

  const [phases, milestones, deliverables, costs, [expense], [entries], meetings] = await Promise.all([
    listPhases(ctx, id),
    listMilestones(ctx, id),
    listDeliverables(ctx, id, { limit: 5000 }),
    listTimeCostsByDeliverable(ctx, id),
    db
      .select({ cents: sql<number>`coalesce(sum(${projectExpense.amountCents}), 0)::bigint` })
      .from(projectExpense)
      .where(eq(projectExpense.projectId, id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(projectTimeEntry)
      .innerJoin(projectDeliverable, eq(projectTimeEntry.deliverableId, projectDeliverable.id))
      .where(and(eq(projectDeliverable.projectId, id), isNotNull(projectTimeEntry.endedAt))),
    db
      .select({ id: meeting.id, title: meeting.title, heldAt: meeting.heldAt, decisions: meeting.decisions, sharedWithClient: meeting.sharedWithClient })
      .from(meeting)
      .where(eq(meeting.projectId, id))
      .orderBy(desc(meeting.heldAt))
      .limit(3),
  ]);
  const cost = new Map(costs.map((c) => [c.deliverableId, c]));

  return {
    projectId: id,
    slug: slugify(row.project.title) || "projeto",
    input: {
      project: {
        title: row.project.title,
        companyName: row.company.name,
        status: row.project.status,
        startedAt: row.project.startedAt,
        endedAt: row.project.endedAt,
        ownerName: row.owner.name,
        budgetCents: row.project.budgetCents,
      },
      phases: phases.map((p) => ({ id: p.id, name: p.name, position: p.position, startedAt: p.startedAt, endedAt: p.endedAt })),
      milestones: milestones.map((m) => ({ id: m.id, name: m.name, dueAt: m.dueAt, completedAt: m.completedAt, phaseId: m.phaseId })),
      deliverables: deliverables.map((x) => ({
        id: x.id,
        title: x.title,
        status: x.status,
        priority: x.priority,
        dueAt: x.dueAt,
        completedAt: x.completedAt,
        phaseId: x.phaseId,
        assigneeName: x.assigneeName,
        minutes: cost.get(x.id)?.totalMinutes ?? 0,
        laborCents: cost.get(x.id)?.laborCents ?? 0,
      })),
      expenseCents: Number(expense?.cents ?? 0),
      entriesWithoutRate: costs.reduce((s, c) => s + c.entriesWithoutRate, 0),
      entriesCount: entries?.count ?? 0,
      meetings,
    },
  };
}

/**
 * Projetos não arquivados em andamento (planejamento, ativo, pausado), com o
 * necessário para portfólio e semanal. `includeClosed` traz também entregues e
 * cancelados, para o semanal mostrar o que foi concluído na última semana deles.
 */
export async function loadPortfolioData(_ctx: AdminContext, opts: { includeClosed?: boolean } = {}): Promise<PortfolioProjectInput[]> {
  const statuses: PortfolioProjectInput["status"][] = opts.includeClosed
    ? ["planning", "active", "on_hold", "delivered", "cancelled"]
    : ["planning", "active", "on_hold"];
  const projects = await db
    .select({
      id: project.id,
      title: project.title,
      status: project.status,
      budgetCents: project.budgetCents,
      companyName: crmCompany.name,
    })
    .from(project)
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(and(isNull(project.archivedAt), inArray(project.status, statuses)));
  if (projects.length === 0) return [];
  const ids = projects.map((p) => p.id);

  const [deliverables, milestones, time, expenses] = await Promise.all([
    db
      .select({
        id: projectDeliverable.id,
        projectId: projectDeliverable.projectId,
        title: projectDeliverable.title,
        status: projectDeliverable.status,
        dueAt: projectDeliverable.dueAt,
        completedAt: projectDeliverable.completedAt,
      })
      .from(projectDeliverable)
      .where(inArray(projectDeliverable.projectId, ids)),
    db
      .select({
        id: projectMilestone.id,
        projectId: projectMilestone.projectId,
        name: projectMilestone.name,
        dueAt: projectMilestone.dueAt,
        completedAt: projectMilestone.completedAt,
      })
      .from(projectMilestone)
      .where(inArray(projectMilestone.projectId, ids)),
    db
      .select({
        projectId: projectDeliverable.projectId,
        minutes: sql<number>`coalesce(sum(${projectTimeEntry.minutes}), 0)::int`,
        laborCents: laborCentsSql,
      })
      .from(projectTimeEntry)
      .innerJoin(projectDeliverable, eq(projectTimeEntry.deliverableId, projectDeliverable.id))
      .innerJoin(users, eq(projectTimeEntry.userId, users.id))
      .where(and(inArray(projectDeliverable.projectId, ids), isNotNull(projectTimeEntry.endedAt)))
      .groupBy(projectDeliverable.projectId),
    db
      .select({ projectId: projectExpense.projectId, cents: sql<number>`coalesce(sum(${projectExpense.amountCents}), 0)::bigint` })
      .from(projectExpense)
      .where(inArray(projectExpense.projectId, ids))
      .groupBy(projectExpense.projectId),
  ]);
  const timeBy = new Map(time.map((t) => [t.projectId, t]));
  const expenseBy = new Map(expenses.map((e) => [e.projectId, Number(e.cents)]));

  return projects.map((p) => ({
    id: p.id,
    title: p.title,
    slug: slugify(p.title) || "projeto",
    companyName: p.companyName,
    status: p.status as PortfolioProjectInput["status"],
    budgetCents: p.budgetCents,
    minutes: timeBy.get(p.id)?.minutes ?? 0,
    laborCents: Number(timeBy.get(p.id)?.laborCents ?? 0),
    expenseCents: expenseBy.get(p.id) ?? 0,
    deliverables: deliverables
      .filter((x) => x.projectId === p.id)
      .map((x) => ({ id: x.id, title: x.title, status: x.status, dueAt: x.dueAt, completedAt: x.completedAt })),
    milestones: milestones
      .filter((m) => m.projectId === p.id)
      .map((m) => ({ id: m.id, name: m.name, dueAt: m.dueAt, completedAt: m.completedAt })),
  }));
}

// ── Fase 21: snapshot diário ────────────────────────────────────────────────

/** Grava (ou regrava) o snapshot do dia para os projetos abertos. */
export async function writeDailySnapshot(day: string): Promise<number> {
  const { buildPortfolio, snapshotRows } = await import("./build");
  const { projectDailySnapshot } = await import("@/db/schema");
  const rows = snapshotRows(buildPortfolio(await loadPortfolioData(SYSTEM_CONTEXT), day));
  if (rows.length === 0) return 0;
  await db
    .insert(projectDailySnapshot)
    .values(rows.map((r) => ({ projectId: r.projectId, day, doneCount: r.doneCount, openCount: r.openCount, overdueCount: r.overdueCount, progressPct: r.progressPct })))
    .onConflictDoUpdate({ target: [projectDailySnapshot.projectId, projectDailySnapshot.day], set: { doneCount: sql`excluded.done_count`, openCount: sql`excluded.open_count`, overdueCount: sql`excluded.overdue_count`, progressPct: sql`excluded.progress_pct` } });
  return rows.length;
}

/** Snapshot mais recente até `day` (inclusive) por projeto: a referência do Δ. */
export async function loadSnapshotsUpTo(day: string): Promise<Map<string, { projectId: string; doneCount: number; openCount: number; overdueCount: number; progressPct: number; day: string }>> {
  const rows = await db.execute<{ project_id: string; day: string; done_count: number; open_count: number; overdue_count: number; progress_pct: number }>(sql`
    select distinct on (project_id) project_id, day::text as day, done_count, open_count, overdue_count, progress_pct
    from project_daily_snapshot where day <= ${day}::date order by project_id, day desc
  `);
  return new Map(rows.map((r) => [r.project_id, { projectId: r.project_id, day: r.day, doneCount: r.done_count, openCount: r.open_count, overdueCount: r.overdue_count, progressPct: r.progress_pct }]));
}
