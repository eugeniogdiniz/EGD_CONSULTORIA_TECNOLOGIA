/**
 * Resumo diário da equipe. `buildDailyDigest` é pura (recebe linhas e "hoje");
 * `loadDailyDigestInput` junta as linhas com as mesmas regras do painel e das
 * demandas: projetos não arquivados em planejamento/execução/pausa.
 */
import { and, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, crmOpportunity, crmProposal, organizations, portalRequest, project, projectDeliverable, projectMilestone, users } from "@/db/schema";
import { compareBacklog, isOverdue, type Priority } from "@/modules/projects/priority";
import { addDays, dateInSaoPaulo, daysBetween, formatBrShort } from "@/modules/reports/dates";
import { isoWeekday } from "../schedule";

export type DailyDeliverable = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  priority: Priority;
  status: string;
  dueAt: string | null;
  assigneeName: string | null;
  createdAt: Date;
};
export type DailyMilestone = { id: string; name: string; projectId: string; projectTitle: string; dueAt: string };
export type DailyRequest = {
  id: string;
  title: string;
  organizationName: string;
  status: "open" | "in_progress" | "resolved";
  /** quem escreveu por último; null = só o texto de abertura (do cliente) */
  lastAuthor: "team" | "client" | null;
  /** quando a solicitação passou a esperar (última mensagem ou criação) */
  waitingSince: Date;
  /** SLA de primeira resposta (Fase 15); ausente nas solicitações antigas */
  firstResponseDueAt?: Date | null;
  firstResponseAt?: Date | null;
};
export type DailyProposal = {
  id: string;
  number: string;
  title: string;
  companyName: string;
  status: string;
  validUntil: string | null;
  decidedAt: Date | null;
};
export type DailyDigestInput = {
  deliverables: DailyDeliverable[];
  milestones: DailyMilestone[];
  requests: DailyRequest[];
  proposals: DailyProposal[];
};

export type DigestLine = { projectTitle: string; title: string; priority: Priority | null; assigneeName: string | null; dueAt: string; daysLate: number; kind: "deliverable" | "milestone" };
export type DigestSection<T> = { items: T[]; more: number; total: number };

export const SECTION_LIMIT = 15;

function section<T>(items: T[], limit = SECTION_LIMIT): DigestSection<T> {
  return { items: items.slice(0, limit), more: Math.max(0, items.length - limit), total: items.length };
}

/** Dias úteis (seg–sex) inteiros entre duas datas 'YYYY-MM-DD', de `from` (exclusivo) a `to` (inclusivo). */
export function businessDaysBetween(from: string, to: string): number {
  let n = 0;
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) if (isoWeekday(d) <= 5) n++;
  return n;
}

const toLine = (d: DailyDeliverable, today: string): DigestLine => ({
  projectTitle: d.projectTitle,
  title: d.title,
  priority: d.priority,
  assigneeName: d.assigneeName,
  dueAt: d.dueAt as string,
  daysLate: d.dueAt ? Math.max(0, daysBetween(d.dueAt, today)) : 0,
  kind: "deliverable",
});
const milestoneLine = (m: DailyMilestone): DigestLine => ({
  projectTitle: m.projectTitle,
  title: m.name,
  priority: null,
  assigneeName: null,
  dueAt: m.dueAt,
  daysLate: 0,
  kind: "milestone",
});
const byDueThenTitle = (a: DigestLine, b: DigestLine) => a.dueAt.localeCompare(b.dueAt) || a.projectTitle.localeCompare(b.projectTitle, "pt-BR") || a.title.localeCompare(b.title, "pt-BR");

export function buildDailyDigest(input: DailyDigestInput, today: string) {
  const open = input.deliverables.filter((d) => d.status !== "done");
  const horizon = addDays(today, 7);

  const late = open.filter((d) => isOverdue(d, today)).sort(compareBacklog).map((d) => toLine(d, today));
  const dueToday = open.filter((d) => d.dueAt === today).sort(compareBacklog).map((d) => toLine(d, today));
  const upcoming = [
    ...open.filter((d) => d.dueAt !== null && d.dueAt > today && d.dueAt <= horizon).map((d) => toLine(d, today)),
    ...input.milestones.filter((m) => m.dueAt > today && m.dueAt <= horizon).map(milestoneLine),
  ].sort(byDueThenTitle);
  const lateMilestones = input.milestones.filter((m) => m.dueAt < today).map(milestoneLine);
  const todayMilestones = input.milestones.filter((m) => m.dueAt === today).map(milestoneLine);

  const requests = input.requests
    .filter((r) => r.status !== "resolved" && r.lastAuthor !== "team")
    .map((r) => ({
      id: r.id,
      title: r.title,
      organizationName: r.organizationName,
      businessDays: businessDaysBetween(dateInSaoPaulo(r.waitingSince), today),
      slaBreached: Boolean(r.firstResponseDueAt && !r.firstResponseAt && dateInSaoPaulo(r.firstResponseDueAt) <= today && r.firstResponseDueAt.getTime() < new Date(`${today}T23:59:59-03:00`).getTime()),
    }))
    .sort((a, b) => b.businessDays - a.businessDays || a.title.localeCompare(b.title, "pt-BR"));

  const expiring = input.proposals
    .filter((p) => p.status === "sent" && p.validUntil !== null && p.validUntil >= today && p.validUntil <= horizon)
    .map((p) => ({ id: p.id, number: p.number, title: p.title, companyName: p.companyName, validUntil: p.validUntil as string, daysLeft: daysBetween(today, p.validUntil as string) }))
    .sort((a, b) => a.validUntil.localeCompare(b.validUntil) || a.number.localeCompare(b.number));
  const since = addDays(today, -7);
  const expired = input.proposals
    .filter((p) => p.status === "expired" && p.decidedAt !== null && dateInSaoPaulo(p.decidedAt) >= since)
    .map((p) => ({ id: p.id, number: p.number, title: p.title, companyName: p.companyName, expiredOn: dateInSaoPaulo(p.decidedAt as Date) }))
    .sort((a, b) => b.expiredOn.localeCompare(a.expiredOn) || a.number.localeCompare(b.number));

  const urgentCount = open.filter((d) => d.priority === "urgent").length;

  const sections = {
    late: section([...late, ...lateMilestones.map((m) => ({ ...m, daysLate: daysBetween(m.dueAt, today) }))]),
    dueToday: section([...dueToday, ...todayMilestones]),
    upcoming: section(upcoming),
    requests: section(requests),
    expiring: section(expiring),
    expired: section(expired),
  };
  const isEmpty = Object.values(sections).every((s) => s.total === 0) && urgentCount === 0;
  const parts = [
    `${sections.late.total} atrasada${sections.late.total === 1 ? "" : "s"}`,
    `${sections.dueToday.total} ${sections.dueToday.total === 1 ? "vence" : "vencem"} hoje`,
  ];
  if (sections.requests.total > 0) parts.push(`${sections.requests.total} solicita${sections.requests.total === 1 ? "ção" : "ções"} aguardando`);
  const subject = `Resumo de ${formatBrShort(today)}: ${parts.join(", ")}`;

  return { today, horizon, subject, isEmpty, urgentCount, ...sections };
}
export type DailyDigest = ReturnType<typeof buildDailyDigest>;

const ACTIVE = ["planning", "active", "on_hold"] as const;

export async function loadDailyDigestInput(today: string): Promise<DailyDigestInput> {
  const horizon = addDays(today, 7);
  const since = addDays(today, -7);
  const [deliverables, milestones, requests, proposals] = await Promise.all([
    db
      .select({
        id: projectDeliverable.id,
        title: projectDeliverable.title,
        projectId: project.id,
        projectTitle: project.title,
        priority: projectDeliverable.priority,
        status: projectDeliverable.status,
        dueAt: projectDeliverable.dueAt,
        assigneeName: users.name,
        createdAt: projectDeliverable.createdAt,
      })
      .from(projectDeliverable)
      .innerJoin(project, eq(projectDeliverable.projectId, project.id))
      .leftJoin(users, eq(projectDeliverable.assigneeId, users.id))
      .where(and(isNull(project.archivedAt), inArray(project.status, ACTIVE), ne(projectDeliverable.status, "done")))
      .limit(2000),
    db
      .select({ id: projectMilestone.id, name: projectMilestone.name, projectId: project.id, projectTitle: project.title, dueAt: projectMilestone.dueAt })
      .from(projectMilestone)
      .innerJoin(project, eq(projectMilestone.projectId, project.id))
      .where(and(isNull(project.archivedAt), inArray(project.status, ACTIVE), isNull(projectMilestone.completedAt), lte(projectMilestone.dueAt, horizon))),
    db
      .select({
        id: portalRequest.id,
        title: portalRequest.title,
        organizationName: organizations.name,
        status: portalRequest.status,
        lastAuthorRole: sql<string | null>`(select u.role::text from portal_request_message m join users u on u.id = m.author_id where m.request_id = portal_request.id and m.internal = false order by m.created_at desc limit 1)`,
        lastMessageAt: sql<Date | null>`(select m.created_at from portal_request_message m where m.request_id = portal_request.id and m.internal = false order by m.created_at desc limit 1)`,
        createdAt: portalRequest.createdAt,
        firstResponseDueAt: portalRequest.firstResponseDueAt,
        firstResponseAt: portalRequest.firstResponseAt,
      })
      .from(portalRequest)
      .innerJoin(organizations, eq(portalRequest.organizationId, organizations.id))
      .where(ne(portalRequest.status, "resolved")),
    db
      .select({
        id: crmProposal.id,
        number: crmProposal.number,
        title: crmProposal.title,
        companyName: crmCompany.name,
        status: crmProposal.status,
        validUntil: crmProposal.validUntil,
        decidedAt: crmProposal.decidedAt,
      })
      .from(crmProposal)
      .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
      .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
      .where(or(eq(crmProposal.status, "sent"), and(eq(crmProposal.status, "expired"), gte(crmProposal.decidedAt, new Date(`${since}T00:00:00-03:00`))))),
  ]);
  return {
    deliverables,
    milestones,
    requests: requests.map((r) => ({
      id: r.id,
      title: r.title,
      organizationName: r.organizationName,
      status: r.status,
      lastAuthor: r.lastAuthorRole === "admin" ? "team" : r.lastAuthorRole === "client" ? "client" : null,
      waitingSince: r.lastMessageAt ? new Date(r.lastMessageAt) : r.createdAt,
      firstResponseDueAt: r.firstResponseDueAt,
      firstResponseAt: r.firstResponseAt,
    })),
    proposals,
  };
}
