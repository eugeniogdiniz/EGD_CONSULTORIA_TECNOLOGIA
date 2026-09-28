import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmCompany,
  crmOpportunity,
  files,
  project,
  projectDeliverable,
  projectMilestone,
  projectPhase,
  users,
} from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";

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
