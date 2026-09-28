import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmCompany,
  crmOpportunity,
  crmProposal,
  files,
  project,
  projectDeliverable,
  projectDeliverableComment,
  projectDeliverableDependency,
  projectExpense,
  projectMilestone,
  projectPhase,
  projectTemplate,
  projectTemplateDeliverable,
  projectTemplatePhase,
  projectTimeEntry,
  users,
} from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { computeFinancials } from "./time-math";

const escapeLike = (q: string) => q.replace(/[\\%_]/g, "\\$&");
const contains = (q: string) => `%${escapeLike(q)}%`;

// ────────────────────────────────────────────────────────────────────────────
// Projetos
// ────────────────────────────────────────────────────────────────────────────

const PROJECT_STATUSES = ["planning", "active", "on_hold", "delivered", "cancelled"] as const;
type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export function listProjects(
  _ctx: AdminContext,
  opts: { status?: ProjectStatus; search?: string; includeArchived?: boolean } = {},
) {
  const filters = [];
  if (!opts.includeArchived) filters.push(isNull(project.archivedAt));
  if (opts.status) filters.push(eq(project.status, opts.status));
  if (opts.search && opts.search.trim()) {
    const p = contains(opts.search.trim());
    filters.push(
      or(
        sql`${project.title} ilike ${p} escape '\\'`,
        sql`${crmCompany.name} ilike ${p} escape '\\'`,
      )!,
    );
  }
  return db
    .select({
      id: project.id,
      title: project.title,
      status: project.status,
      startedAt: project.startedAt,
      endedAt: project.endedAt,
      updatedAt: project.updatedAt,
      archivedAt: project.archivedAt,
      companyId: crmCompany.id,
      companyName: crmCompany.name,
      opportunityId: project.opportunityId,
    })
    .from(project)
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(project.updatedAt))
    .limit(200);
}

export async function getProject(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      project,
      company: crmCompany,
      opportunity: crmOpportunity,
      owner: users,
    })
    .from(project)
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .innerJoin(crmOpportunity, eq(project.opportunityId, crmOpportunity.id))
    .innerJoin(users, eq(project.ownerId, users.id))
    .where(eq(project.id, id))
    .limit(1);
  return row ?? null;
}

export async function getProjectByOpportunity(_ctx: AdminContext, opportunityId: string) {
  if (!isUuid(opportunityId)) return null;
  const row = await db.query.project.findFirst({
    where: eq(project.opportunityId, opportunityId),
    columns: { id: true, title: true, status: true },
  });
  return row ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// Fases
// ────────────────────────────────────────────────────────────────────────────

export function listPhases(_ctx: AdminContext, projectId: string) {
  if (!isUuid(projectId)) return Promise.resolve([]);
  return db
    .select()
    .from(projectPhase)
    .where(eq(projectPhase.projectId, projectId))
    .orderBy(asc(projectPhase.position));
}

export async function listPhasesWithCounts(_ctx: AdminContext, projectId: string) {
  if (!isUuid(projectId)) return [];
  // Subqueries com CTE evita depender de placement de column ref dentro de sql``.
  const rows = await db.execute<{
    id: string;
    name: string;
    position: number;
    started_at: string | null;
    ended_at: string | null;
    notes: string | null;
    deliverable_count: number;
    milestone_count: number;
  }>(sql`
    select
      p.id, p.name, p.position, p.started_at, p.ended_at, p.notes,
      coalesce((select count(*)::int from project_deliverable d where d.phase_id = p.id), 0) as deliverable_count,
      coalesce((select count(*)::int from project_milestone m where m.phase_id = p.id), 0) as milestone_count
    from project_phase p
    where p.project_id = ${projectId}
    order by p.position asc
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    position: r.position,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    notes: r.notes,
    deliverableCount: r.deliverable_count,
    milestoneCount: r.milestone_count,
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Marcos
// ────────────────────────────────────────────────────────────────────────────

export function listMilestones(
  _ctx: AdminContext,
  projectId: string,
  opts: { onlyPending?: boolean } = {},
) {
  if (!isUuid(projectId)) return Promise.resolve([]);
  const filters = [eq(projectMilestone.projectId, projectId)];
  if (opts.onlyPending) filters.push(isNull(projectMilestone.completedAt));
  return db
    .select({
      id: projectMilestone.id,
      name: projectMilestone.name,
      dueAt: projectMilestone.dueAt,
      completedAt: projectMilestone.completedAt,
      notes: projectMilestone.notes,
      phaseId: projectMilestone.phaseId,
      phaseName: projectPhase.name,
    })
    .from(projectMilestone)
    .leftJoin(projectPhase, eq(projectMilestone.phaseId, projectPhase.id))
    .where(and(...filters))
    .orderBy(asc(projectMilestone.dueAt));
}

// ────────────────────────────────────────────────────────────────────────────
// Entregas
// ────────────────────────────────────────────────────────────────────────────

const DELIVERABLE_STATUSES = ["todo", "doing", "review", "done", "blocked"] as const;
type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

export function listDeliverables(
  _ctx: AdminContext,
  projectId: string,
  opts: {
    phaseId?: string;
    assigneeId?: string;
    status?: DeliverableStatus;
    limit?: number;
  } = {},
) {
  if (!isUuid(projectId)) return Promise.resolve([]);
  const filters = [eq(projectDeliverable.projectId, projectId)];
  if (opts.phaseId && isUuid(opts.phaseId)) filters.push(eq(projectDeliverable.phaseId, opts.phaseId));
  if (opts.assigneeId && isUuid(opts.assigneeId)) filters.push(eq(projectDeliverable.assigneeId, opts.assigneeId));
  if (opts.status) filters.push(eq(projectDeliverable.status, opts.status));
  return db
    .select({
      id: projectDeliverable.id,
      title: projectDeliverable.title,
      description: projectDeliverable.description,
      status: projectDeliverable.status,
      position: projectDeliverable.position,
      dueAt: projectDeliverable.dueAt,
      completedAt: projectDeliverable.completedAt,
      fileId: projectDeliverable.fileId,
      visibleToClient: projectDeliverable.visibleToClient,
      phaseId: projectDeliverable.phaseId,
      phaseName: projectPhase.name,
      assigneeId: projectDeliverable.assigneeId,
      assigneeName: users.name,
      updatedAt: projectDeliverable.updatedAt,
    })
    .from(projectDeliverable)
    .leftJoin(projectPhase, eq(projectDeliverable.phaseId, projectPhase.id))
    .leftJoin(users, eq(projectDeliverable.assigneeId, users.id))
    .where(and(...filters))
    .orderBy(asc(projectDeliverable.position), desc(projectDeliverable.updatedAt))
    .limit(opts.limit ?? 500);
}

export type DeliverableCard = Awaited<ReturnType<typeof listDeliverables>>[number];

export type KanbanColumn = {
  status: DeliverableStatus;
  items: DeliverableCard[];
  count: number;
};

const STATUS_ORDER: DeliverableStatus[] = ["todo", "doing", "review", "done", "blocked"];

export async function listDeliverablesGroupedByStatus(
  ctx: AdminContext,
  projectId: string,
  opts: { phaseId?: string; assigneeId?: string } = {},
): Promise<KanbanColumn[]> {
  const rows = await listDeliverables(ctx, projectId, opts);
  const grouped = new Map<DeliverableStatus, DeliverableCard[]>();
  for (const s of STATUS_ORDER) grouped.set(s, []);
  for (const row of rows) grouped.get(row.status)!.push(row);
  return STATUS_ORDER.map((s) => {
    const items = grouped.get(s)!;
    return { status: s, items, count: items.length };
  });
}

export function upcomingDeliverables(_ctx: AdminContext, projectId: string, limit = 5) {
  if (!isUuid(projectId)) return Promise.resolve([]);
  return db
    .select({
      id: projectDeliverable.id,
      title: projectDeliverable.title,
      status: projectDeliverable.status,
      dueAt: projectDeliverable.dueAt,
      phaseId: projectDeliverable.phaseId,
      phaseName: projectPhase.name,
      assigneeName: users.name,
    })
    .from(projectDeliverable)
    .leftJoin(projectPhase, eq(projectDeliverable.phaseId, projectPhase.id))
    .leftJoin(users, eq(projectDeliverable.assigneeId, users.id))
    .where(
      and(
        eq(projectDeliverable.projectId, projectId),
        inArray(projectDeliverable.status, ["todo", "doing", "review"] as DeliverableStatus[]),
      ),
    )
    .orderBy(asc(projectDeliverable.dueAt))
    .limit(limit);
}

export async function getDeliverable(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      deliverable: projectDeliverable,
      phase: projectPhase,
      assignee: users,
      file: files,
    })
    .from(projectDeliverable)
    .leftJoin(projectPhase, eq(projectDeliverable.phaseId, projectPhase.id))
    .leftJoin(users, eq(projectDeliverable.assigneeId, users.id))
    .leftJoin(files, eq(projectDeliverable.fileId, files.id))
    .where(eq(projectDeliverable.id, id))
    .limit(1);
  return row ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Dependências
// ────────────────────────────────────────────────────────────────────────────

/** Todas as arestas do projeto: predecessor e sucessor precisam pertencer a ele. */
export async function listDependencies(_ctx: AdminContext, projectId: string) {
  if (!isUuid(projectId)) return [];
  const pred = alias(projectDeliverable, "pred");
  const succ = alias(projectDeliverable, "succ");
  return db
    .select({
      predecessorId: projectDeliverableDependency.predecessorId,
      successorId: projectDeliverableDependency.successorId,
      predecessorTitle: pred.title,
      successorTitle: succ.title,
    })
    .from(projectDeliverableDependency)
    .innerJoin(pred, eq(projectDeliverableDependency.predecessorId, pred.id))
    .innerJoin(succ, eq(projectDeliverableDependency.successorId, succ.id))
    .where(and(eq(pred.projectId, projectId), eq(succ.projectId, projectId)));
}

/** Predecessores de uma entrega (o que ela precisa esperar). */
export async function listPredecessors(_ctx: AdminContext, deliverableId: string) {
  if (!isUuid(deliverableId)) return [];
  return db
    .select({
      id: projectDeliverable.id,
      title: projectDeliverable.title,
      status: projectDeliverable.status,
      dueAt: projectDeliverable.dueAt,
    })
    .from(projectDeliverableDependency)
    .innerJoin(
      projectDeliverable,
      eq(projectDeliverableDependency.predecessorId, projectDeliverable.id),
    )
    .where(eq(projectDeliverableDependency.successorId, deliverableId))
    .orderBy(asc(projectDeliverable.title));
}

/** Sucessores de uma entrega (o que espera por ela). */
export async function listSuccessors(_ctx: AdminContext, deliverableId: string) {
  if (!isUuid(deliverableId)) return [];
  return db
    .select({
      id: projectDeliverable.id,
      title: projectDeliverable.title,
      status: projectDeliverable.status,
      dueAt: projectDeliverable.dueAt,
    })
    .from(projectDeliverableDependency)
    .innerJoin(
      projectDeliverable,
      eq(projectDeliverableDependency.successorId, projectDeliverable.id),
    )
    .where(eq(projectDeliverableDependency.predecessorId, deliverableId))
    .orderBy(asc(projectDeliverable.title));
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Comentários
// ────────────────────────────────────────────────────────────────────────────

/**
 * Thread de 2 níveis; deletados aparecem com `body = null` pra manter a
 * ordem e as respostas encadeadas.
 */
export async function listComments(_ctx: AdminContext, deliverableId: string) {
  if (!isUuid(deliverableId)) return [];
  return db
    .select({
      id: projectDeliverableComment.id,
      parentId: projectDeliverableComment.parentId,
      body: sql<
        string | null
      >`case when ${projectDeliverableComment.deletedAt} is null then ${projectDeliverableComment.body} else null end`,
      deletedAt: projectDeliverableComment.deletedAt,
      authorId: projectDeliverableComment.authorId,
      authorName: users.name,
      createdAt: projectDeliverableComment.createdAt,
      updatedAt: projectDeliverableComment.updatedAt,
    })
    .from(projectDeliverableComment)
    .innerJoin(users, eq(projectDeliverableComment.authorId, users.id))
    .where(eq(projectDeliverableComment.deliverableId, deliverableId))
    .orderBy(asc(projectDeliverableComment.createdAt));
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Horas
// ────────────────────────────────────────────────────────────────────────────

export async function listTimeEntries(_ctx: AdminContext, deliverableId: string) {
  if (!isUuid(deliverableId)) return [];
  return db
    .select({
      id: projectTimeEntry.id,
      userId: projectTimeEntry.userId,
      userName: users.name,
      startedAt: projectTimeEntry.startedAt,
      endedAt: projectTimeEntry.endedAt,
      minutes: projectTimeEntry.minutes,
      source: projectTimeEntry.source,
      notes: projectTimeEntry.notes,
    })
    .from(projectTimeEntry)
    .innerJoin(users, eq(projectTimeEntry.userId, users.id))
    .where(eq(projectTimeEntry.deliverableId, deliverableId))
    .orderBy(desc(projectTimeEntry.startedAt));
}

/** Rate por hora do usuário atual (cents ou null). */
export async function getCurrentUserRateCents(ctx: AdminContext): Promise<number | null> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, ctx.user.id),
    columns: { hourlyRateCents: true },
  });
  return row?.hourlyRateCents ?? null;
}

/** Timer aberto do usuário atual (endedAt null). Devolve null se não há. */
export async function getOpenTimer(ctx: AdminContext) {
  const [row] = await db
    .select({
      id: projectTimeEntry.id,
      deliverableId: projectTimeEntry.deliverableId,
      deliverableTitle: projectDeliverable.title,
      projectId: projectDeliverable.projectId,
      startedAt: projectTimeEntry.startedAt,
      notes: projectTimeEntry.notes,
    })
    .from(projectTimeEntry)
    .innerJoin(projectDeliverable, eq(projectTimeEntry.deliverableId, projectDeliverable.id))
    .where(and(eq(projectTimeEntry.userId, ctx.user.id), isNull(projectTimeEntry.endedAt)))
    .limit(1);
  return row ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Despesas
// ────────────────────────────────────────────────────────────────────────────

export async function listExpenses(_ctx: AdminContext, projectId: string) {
  if (!isUuid(projectId)) return [];
  return db
    .select({
      id: projectExpense.id,
      description: projectExpense.description,
      amountCents: projectExpense.amountCents,
      kind: projectExpense.kind,
      dateAt: projectExpense.dateAt,
      notes: projectExpense.notes,
      createdBy: projectExpense.createdBy,
      createdByName: users.name,
      createdAt: projectExpense.createdAt,
    })
    .from(projectExpense)
    .innerJoin(users, eq(projectExpense.createdBy, users.id))
    .where(eq(projectExpense.projectId, projectId))
    .orderBy(desc(projectExpense.dateAt));
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Financeiro
// ────────────────────────────────────────────────────────────────────────────

/**
 * Consolida orçamento + horas × rate + despesas + propostas (sent/accepted).
 * Números em cents; conversão pra reais fica na UI.
 */
export async function getProjectFinancials(_ctx: AdminContext, projectId: string) {
  if (!isUuid(projectId)) return null;

  const projectRow = await db.query.project.findFirst({
    where: eq(project.id, projectId),
    columns: { id: true, budgetCents: true, opportunityId: true },
  });
  if (!projectRow) return null;

  const entries = await db
    .select({
      minutes: projectTimeEntry.minutes,
      hourlyRateCents: users.hourlyRateCents,
    })
    .from(projectTimeEntry)
    .innerJoin(projectDeliverable, eq(projectTimeEntry.deliverableId, projectDeliverable.id))
    .innerJoin(users, eq(projectTimeEntry.userId, users.id))
    .where(eq(projectDeliverable.projectId, projectId));

  const expenses = await db
    .select({ amountCents: projectExpense.amountCents })
    .from(projectExpense)
    .where(eq(projectExpense.projectId, projectId));

  const proposals = projectRow.opportunityId
    ? await db
        .select({ status: crmProposal.status, valueCents: crmProposal.valueCents })
        .from(crmProposal)
        .where(eq(crmProposal.opportunityId, projectRow.opportunityId))
    : [];

  return computeFinancials({
    budgetCents: projectRow.budgetCents,
    entries,
    expenses,
    proposals,
  });
}

/** Custo agregado por entrega (labor + count de entradas sem rate). Pura leitura. */
export async function listTimeCostsByDeliverable(_ctx: AdminContext, projectId: string) {
  if (!isUuid(projectId)) return [];
  const rows = await db.execute<{
    deliverable_id: string;
    title: string;
    total_minutes: number;
    labor_cents: number;
    entries_without_rate: number;
  }>(sql`
    select
      d.id as deliverable_id,
      d.title,
      coalesce(sum(t.minutes), 0)::int as total_minutes,
      coalesce(sum(case when u.hourly_rate_cents is not null then floor(t.minutes * u.hourly_rate_cents / 60)::bigint else 0 end), 0)::bigint as labor_cents,
      coalesce(sum(case when t.ended_at is not null and u.hourly_rate_cents is null then 1 else 0 end), 0)::int as entries_without_rate
    from project_deliverable d
    left join project_time_entry t on t.deliverable_id = d.id and t.ended_at is not null
    left join users u on u.id = t.user_id
    where d.project_id = ${projectId}
    group by d.id, d.title
    order by d.title asc
  `);
  return rows.map((r) => ({
    deliverableId: r.deliverable_id,
    title: r.title,
    totalMinutes: r.total_minutes,
    laborCents: Number(r.labor_cents),
    entriesWithoutRate: r.entries_without_rate,
  }));
}

/** Propostas ligadas à oportunidade do projeto pra tabela do financeiro. */
export async function listProjectProposals(_ctx: AdminContext, projectId: string) {
  if (!isUuid(projectId)) return [];
  const p = await db.query.project.findFirst({
    where: eq(project.id, projectId),
    columns: { opportunityId: true },
  });
  if (!p?.opportunityId) return [];
  return db
    .select({
      id: crmProposal.id,
      number: crmProposal.number,
      title: crmProposal.title,
      status: crmProposal.status,
      valueCents: crmProposal.valueCents,
      currency: crmProposal.currency,
      sentAt: crmProposal.sentAt,
      decidedAt: crmProposal.decidedAt,
    })
    .from(crmProposal)
    .where(eq(crmProposal.opportunityId, p.opportunityId))
    .orderBy(desc(crmProposal.createdAt));
}

// ────────────────────────────────────────────────────────────────────────────
// Fase 3.5 — Templates
// ────────────────────────────────────────────────────────────────────────────

export async function listTemplates(_ctx: AdminContext) {
  const rows = await db.execute<{
    id: string;
    name: string;
    description: string | null;
    owner_name: string;
    phase_count: number;
    deliverable_count: number;
    created_at: string;
  }>(sql`
    select
      t.id, t.name, t.description, u.name as owner_name,
      coalesce((select count(*)::int from project_template_phase p where p.template_id = t.id), 0) as phase_count,
      coalesce((select count(*)::int from project_template_deliverable d where d.template_id = t.id), 0) as deliverable_count,
      t.created_at
    from project_template t
    inner join users u on u.id = t.owner_id
    order by t.name asc
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    ownerName: r.owner_name,
    phaseCount: r.phase_count,
    deliverableCount: r.deliverable_count,
    createdAt: r.created_at,
  }));
}

export async function getTemplate(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const row = await db.query.projectTemplate.findFirst({
    where: eq(projectTemplate.id, id),
  });
  return row ?? null;
}

export function listTemplatePhases(_ctx: AdminContext, templateId: string) {
  if (!isUuid(templateId)) return Promise.resolve([]);
  return db
    .select()
    .from(projectTemplatePhase)
    .where(eq(projectTemplatePhase.templateId, templateId))
    .orderBy(asc(projectTemplatePhase.position));
}

export function listTemplateDeliverables(_ctx: AdminContext, templateId: string) {
  if (!isUuid(templateId)) return Promise.resolve([]);
  return db
    .select({
      id: projectTemplateDeliverable.id,
      phaseId: projectTemplateDeliverable.phaseId,
      title: projectTemplateDeliverable.title,
      description: projectTemplateDeliverable.description,
      position: projectTemplateDeliverable.position,
    })
    .from(projectTemplateDeliverable)
    .where(eq(projectTemplateDeliverable.templateId, templateId))
    .orderBy(asc(projectTemplateDeliverable.position));
}
