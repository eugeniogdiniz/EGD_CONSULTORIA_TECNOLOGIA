/**
 * Andamento semanal para o cliente. O tipo de entrada não tem custo, horas,
 * prioridade nem responsável: o builder não tem como vazar o que não recebe.
 * O carregador usa o mesmo escopo do portal (empresa vinculada à organização,
 * projeto não arquivado, só entregas visíveis).
 */
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, memberships, organizations, portalRequest, project, projectDeliverable, projectMilestone, users } from "@/db/schema";
import { addDays, dateInSaoPaulo, mondayOf } from "@/modules/reports/dates";

export type ClientDigestProject = {
  id: string;
  title: string;
  deliverables: { title: string; status: string; dueAt: string | null; completedAt: Date | null }[];
  milestones: { name: string; dueAt: string; completedAt: Date | null }[];
};
export type ClientDigestRequest = { id: string; title: string; status: "open" | "in_progress" | "resolved"; lastAuthor: "team" | "client" | null };
export type ClientDigestInput = { organizationName: string; projects: ClientDigestProject[]; requests: ClientDigestRequest[] };

export type ClientDigestItem = { kind: "deliverable" | "milestone"; title: string; date: string };

export function buildClientDigest(input: ClientDigestInput, today: string) {
  const thisMonday = mondayOf(today);
  const prevStart = addDays(thisMonday, -7);
  const prevEnd = addDays(thisMonday, -1);
  const thisEnd = addDays(thisMonday, 6);
  const inRange = (d: string, a: string, b: string) => d >= a && d <= b;
  const byDate = (a: ClientDigestItem, b: ClientDigestItem) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "pt-BR");

  const projects = [...input.projects]
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
    .map((p) => {
      const total = p.deliverables.length;
      const doneCount = p.deliverables.filter((d) => d.status === "done").length;
      const done: ClientDigestItem[] = [];
      const due: ClientDigestItem[] = [];
      for (const d of p.deliverables) {
        if (d.status === "done") {
          const on = d.completedAt ? dateInSaoPaulo(d.completedAt) : null;
          if (on && inRange(on, prevStart, prevEnd)) done.push({ kind: "deliverable", title: d.title, date: on });
        } else if (d.dueAt && inRange(d.dueAt, thisMonday, thisEnd)) due.push({ kind: "deliverable", title: d.title, date: d.dueAt });
      }
      for (const m of p.milestones) {
        const on = m.completedAt ? dateInSaoPaulo(m.completedAt) : null;
        if (on) {
          if (inRange(on, prevStart, prevEnd)) done.push({ kind: "milestone", title: m.name, date: on });
        } else if (inRange(m.dueAt, thisMonday, thisEnd)) due.push({ kind: "milestone", title: m.name, date: m.dueAt });
      }
      return { id: p.id, title: p.title, percent: total === 0 ? null : Math.round((doneCount / total) * 100), done: done.sort(byDate), due: due.sort(byDate) };
    });

  const awaiting = input.requests.filter((r) => r.status === "in_progress" && r.lastAuthor === "team").map((r) => ({ id: r.id, title: r.title }));
  const isEmpty = projects.every((p) => p.done.length + p.due.length === 0) && awaiting.length === 0;
  const subject = `Andamento dos seus projetos · semana de ${thisMonday.slice(8, 10)}/${thisMonday.slice(5, 7)}`;
  return { organizationName: input.organizationName, prevStart, prevEnd, thisStart: thisMonday, thisEnd, projects, awaiting, isEmpty, subject };
}
export type ClientDigest = ReturnType<typeof buildClientDigest>;

export async function loadClientDigestInput(organizationId: string): Promise<ClientDigestInput | null> {
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, organizationId), columns: { name: true } });
  if (!org) return null;
  const rows = await db
    .select({ id: project.id, title: project.title })
    .from(project)
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(and(eq(crmCompany.linkedOrganizationId, organizationId), isNull(project.archivedAt)));
  const ids = rows.map((r) => r.id);
  const [dels, miles, requests] = await Promise.all([
    ids.length
      ? db
          .select({ projectId: projectDeliverable.projectId, title: projectDeliverable.title, status: projectDeliverable.status, dueAt: projectDeliverable.dueAt, completedAt: projectDeliverable.completedAt })
          .from(projectDeliverable)
          .where(and(inArray(projectDeliverable.projectId, ids), eq(projectDeliverable.visibleToClient, true)))
      : Promise.resolve([]),
    ids.length
      ? db
          .select({ projectId: projectMilestone.projectId, name: projectMilestone.name, dueAt: projectMilestone.dueAt, completedAt: projectMilestone.completedAt })
          .from(projectMilestone)
          .where(inArray(projectMilestone.projectId, ids))
      : Promise.resolve([]),
    db
      .select({
        id: portalRequest.id,
        title: portalRequest.title,
        status: portalRequest.status,
        lastAuthorRole: sql<string | null>`(select u.role::text from portal_request_message m join users u on u.id = m.author_id where m.request_id = portal_request.id order by m.created_at desc limit 1)`,
      })
      .from(portalRequest)
      .where(and(eq(portalRequest.organizationId, organizationId), ne(portalRequest.status, "resolved"))),
  ]);
  return {
    organizationName: org.name,
    projects: rows.map((p) => ({
      id: p.id,
      title: p.title,
      deliverables: dels.filter((d) => d.projectId === p.id).map(({ projectId: _p, ...d }) => d),
      milestones: miles.filter((m) => m.projectId === p.id).map(({ projectId: _p, ...m }) => m),
    })),
    requests: requests.map((r) => ({ id: r.id, title: r.title, status: r.status, lastAuthor: r.lastAuthorRole === null ? null : r.lastAuthorRole === "client" ? "client" : "team" })),
  };
}

/** Organizações ativas com o resumo semanal ligado e seus membros ativos. */
export async function listDigestRecipients() {
  const rows = await db
    .select({ organizationId: organizations.id, organizationName: organizations.name, email: users.email, name: users.name })
    .from(organizations)
    .innerJoin(memberships, eq(memberships.organizationId, organizations.id))
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(and(eq(organizations.weeklyDigest, true), eq(organizations.status, "active"), eq(users.active, true)))
    .orderBy(organizations.name, users.name);
  const byOrg = new Map<string, { id: string; name: string; recipients: { email: string; name: string }[] }>();
  for (const r of rows) {
    const o = byOrg.get(r.organizationId) ?? { id: r.organizationId, name: r.organizationName, recipients: [] };
    o.recipients.push({ email: r.email, name: r.name });
    byOrg.set(r.organizationId, o);
  }
  return [...byOrg.values()];
}
