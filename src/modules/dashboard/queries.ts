import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { AdminContext } from "@/modules/auth/context";

/** Dia corrente em São Paulo ('YYYY-MM-DD'): prazos são datas sem hora. */
export const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

/** Números do painel: funil aberto, projetos ativos, prazos e cases publicados. */
export async function getAdminOverview(_ctx: AdminContext, today = todayInSaoPaulo()) {
  const [row] = await db.execute<{
    open_opportunities: number;
    pipeline_cents: string;
    active_projects: number;
    overdue_deliverables: number;
    due_this_week: number;
    published_cases: number;
    active_requests: number;
  }>(sql`
    select
      (select count(*)::int from crm_opportunity where stage not in ('won', 'lost')) as open_opportunities,
      (select coalesce(sum(value_cents), 0)::text from crm_opportunity where stage not in ('won', 'lost')) as pipeline_cents,
      (select count(*)::int from project where status = 'active' and archived_at is null) as active_projects,
      (select count(*)::int from project_deliverable d join project p on p.id = d.project_id
         where d.status <> 'done' and d.due_at < ${today}::date
           and p.archived_at is null and p.status in ('planning', 'active')) as overdue_deliverables,
      (select count(*)::int from project_deliverable d join project p on p.id = d.project_id
         where d.status <> 'done' and d.due_at between ${today}::date and (${today}::date + 7)
           and p.archived_at is null and p.status in ('planning', 'active')) as due_this_week,
      (select count(*)::int from site_case where published) as published_cases,
      (select count(*)::int from portal_request where status <> 'resolved') as active_requests
  `);
  return {
    openOpportunities: row.open_opportunities,
    pipelineCents: Number(row.pipeline_cents),
    activeProjects: row.active_projects,
    overdueDeliverables: row.overdue_deliverables,
    dueThisWeek: row.due_this_week,
    publishedCases: row.published_cases,
    activeRequests: row.active_requests,
  };
}

/** Entregas em aberto atrasadas ou com prazo nos próximos 7 dias, mais urgentes primeiro. */
export async function listDeadlines(_ctx: AdminContext, today = todayInSaoPaulo(), limit = 8) {
  const rows = await db.execute<{
    id: string;
    title: string;
    due_at: string;
    status: string;
    project_id: string;
    project_title: string;
  }>(sql`
    select d.id, d.title, d.due_at::text as due_at, d.status::text as status,
           p.id as project_id, p.title as project_title
    from project_deliverable d
    join project p on p.id = d.project_id
    where d.status <> 'done'
      and d.due_at <= (${today}::date + 7)
      and p.archived_at is null and p.status in ('planning', 'active')
    order by d.due_at asc, d.title asc
    limit ${limit}
  `);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    dueAt: r.due_at,
    status: r.status,
    projectId: r.project_id,
    projectTitle: r.project_title,
    overdue: r.due_at < today,
  }));
}

/**
 * Comentários de clientes nas entregas (últimos 14 dias). O portal não notifica
 * a equipe, então este bloco é o aviso.
 */
export async function listRecentClientComments(_ctx: AdminContext, limit = 6) {
  const rows = await db.execute<{
    id: string;
    body: string;
    created_at: Date;
    author_name: string;
    deliverable_id: string;
    deliverable_title: string;
    project_id: string;
    project_title: string;
  }>(sql`
    select c.id, c.body, c.created_at, u.name as author_name,
           d.id as deliverable_id, d.title as deliverable_title,
           p.id as project_id, p.title as project_title
    from project_deliverable_comment c
    join users u on u.id = c.author_id
    join project_deliverable d on d.id = c.deliverable_id
    join project p on p.id = d.project_id
    where u.role = 'client' and c.deleted_at is null
      and c.created_at > now() - interval '14 days'
    order by c.created_at desc
    limit ${limit}
  `);
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: new Date(r.created_at),
    authorName: r.author_name,
    deliverableId: r.deliverable_id,
    deliverableTitle: r.deliverable_title,
    projectId: r.project_id,
    projectTitle: r.project_title,
  }));
}
