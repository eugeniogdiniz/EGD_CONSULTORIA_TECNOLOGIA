/**
 * Relatórios como funções puras: recebem linhas já lidas do banco e a data de
 * hoje (Brasília), devolvem o que a página e o CSV mostram. Página e CSV usam
 * o mesmo resultado, então os números nunca divergem.
 */
import { isOverdue, priorityRank, PRIORITY_LABEL, type Priority } from "@/modules/projects/priority";
import { csvCents, csvDecimal, type CsvCell } from "./csv";
import { dateInSaoPaulo, daysBetween, formatBr } from "./dates";
import { ADMIN_STATUS_LABEL } from "./labels";

export type DeliverableStatus = "todo" | "doing" | "review" | "done" | "blocked";

export type ReportPhase = { id: string; name: string; position: number; startedAt: string | null; endedAt: string | null };
export type ReportMilestone = { id: string; name: string; dueAt: string; completedAt: Date | null; phaseId: string | null };
export type ReportDeliverable = {
  id: string;
  title: string;
  status: DeliverableStatus;
  priority: Priority;
  dueAt: string | null;
  completedAt: Date | null;
  phaseId: string | null;
  assigneeName: string | null;
  minutes: number;
  laborCents: number;
};
export type ReportMeeting = { id: string; title: string; heldAt: Date; decisions: string | null; sharedWithClient: boolean };

export type PhaseProgress = {
  id: string | null;
  name: string;
  startedAt: string | null;
  endedAt: string | null;
  total: number;
  done: number;
  percent: number;
};
export type MilestoneLine = {
  id: string;
  name: string;
  phaseName: string | null;
  dueAt: string;
  state: "done" | "late" | "pending";
  completedOn: string | null;
  /** Dias de atraso (late) ou até o prazo (pending); 0 quando concluído. */
  days: number;
};
export type BudgetBand = "ok" | "warn" | "alert";

export type ProjectStatusInput = {
  project: {
    title: string;
    companyName: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    ownerName: string;
    budgetCents: number | null;
  };
  phases: ReportPhase[];
  milestones: ReportMilestone[];
  deliverables: ReportDeliverable[];
  expenseCents: number;
  entriesWithoutRate: number;
  entriesCount: number;
  meetings: ReportMeeting[];
};

// ── peças compartilhadas ────────────────────────────────────────────────────

export function budgetBand(pct: number | null): BudgetBand | null {
  if (pct === null) return null;
  if (pct > 90) return "alert";
  return pct >= 70 ? "warn" : "ok";
}

const pct = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100));
const NO_DATE = "9999-12-31";
const byDueThenTitle = (a: { dueAt: string | null; title: string }, b: { dueAt: string | null; title: string }) =>
  (a.dueAt ?? NO_DATE).localeCompare(b.dueAt ?? NO_DATE) || a.title.localeCompare(b.title, "pt-BR");

/** Concluídas por fase, na ordem das fases; entregas sem fase viram "Sem fase" no fim. */
export function phaseProgress(
  phases: ReportPhase[],
  items: readonly { phaseId: string | null; status: DeliverableStatus }[],
): PhaseProgress[] {
  const rows: PhaseProgress[] = [...phases]
    .sort((a, b) => a.position - b.position)
    .map((p) => {
      const mine = items.filter((i) => i.phaseId === p.id);
      const done = mine.filter((i) => i.status === "done").length;
      return { id: p.id, name: p.name, startedAt: p.startedAt, endedAt: p.endedAt, total: mine.length, done, percent: pct(done, mine.length) };
    });
  const known = new Set(phases.map((p) => p.id));
  const loose = items.filter((i) => i.phaseId === null || !known.has(i.phaseId));
  if (loose.length > 0) {
    const done = loose.filter((i) => i.status === "done").length;
    rows.push({ id: null, name: "Sem fase", startedAt: null, endedAt: null, total: loose.length, done, percent: pct(done, loose.length) });
  }
  return rows;
}

export function milestoneLines(milestones: ReportMilestone[], phases: ReportPhase[], today: string): MilestoneLine[] {
  const phaseName = new Map(phases.map((p) => [p.id, p.name]));
  return [...milestones]
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .map((m) => {
      const completedOn = m.completedAt ? dateInSaoPaulo(m.completedAt) : null;
      const state: MilestoneLine["state"] = completedOn ? "done" : m.dueAt < today ? "late" : "pending";
      return {
        id: m.id,
        name: m.name,
        phaseName: m.phaseId ? (phaseName.get(m.phaseId) ?? null) : null,
        dueAt: m.dueAt,
        state,
        completedOn,
        days: state === "done" ? 0 : Math.abs(daysBetween(today, m.dueAt)),
      };
    });
}

const daysLate = (x: { dueAt: string | null; status: string }, today: string) =>
  isOverdue(x, today) ? daysBetween(x.dueAt as string, today) : null;

// ── 1. status do projeto ────────────────────────────────────────────────────

export function buildProjectStatus(input: ProjectStatusInput, today: string) {
  const ds = input.deliverables;
  const done = ds.filter((x) => x.status === "done").length;
  const byStatus: Record<DeliverableStatus, number> = { todo: 0, doing: 0, review: 0, done: 0, blocked: 0 };
  for (const x of ds) byStatus[x.status] += 1;
  const phaseName = new Map(input.phases.map((p) => [p.id, p.name]));

  const issues = ds
    .filter((x) => isOverdue(x, today) || x.status === "blocked")
    .map((x) => ({ ...x, phaseName: x.phaseId ? (phaseName.get(x.phaseId) ?? null) : null, daysLate: daysLate(x, today) }))
    .sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) ||
        (b.daysLate ?? -1) - (a.daysLate ?? -1) ||
        a.title.localeCompare(b.title, "pt-BR"),
    );

  const milestones = milestoneLines(input.milestones, input.phases, today);
  const minutes = ds.reduce((s, x) => s + x.minutes, 0);
  const laborCents = ds.reduce((s, x) => s + x.laborCents, 0);
  const costCents = laborCents + input.expenseCents;
  const budget = input.project.budgetCents;
  const consumption = budget !== null && budget > 0 ? Math.round((costCents / budget) * 100) : null;

  return {
    progress: { total: ds.length, done, percent: ds.length === 0 ? null : pct(done, ds.length) },
    byStatus,
    phases: phaseProgress(input.phases, ds),
    issues,
    overdueCount: ds.filter((x) => isOverdue(x, today)).length,
    blockedCount: byStatus.blocked,
    milestones,
    nextMilestone: milestones.find((m) => m.state !== "done") ?? null,
    money: {
      minutes,
      laborCents,
      expenseCents: input.expenseCents,
      costCents,
      budgetCents: budget,
      consumption,
      band: budgetBand(consumption),
      entriesWithoutRate: input.entriesWithoutRate,
      entriesCount: input.entriesCount,
    },
    meetings: [...input.meetings].sort((a, b) => b.heldAt.getTime() - a.heldAt.getTime()).slice(0, 3),
  };
}
export type ProjectStatusReport = ReturnType<typeof buildProjectStatus>;

/** Ordena entregas pela fase (na ordem do relatório) e depois pelo prazo. */
function inPhaseOrder<T extends { phaseId: string | null; dueAt: string | null; title: string }>(items: readonly T[], phases: PhaseProgress[]) {
  const order = new Map(phases.map((p, i) => [p.id, i]));
  const slot = (x: T) => order.get(x.phaseId !== null && order.has(x.phaseId) ? x.phaseId : null) ?? phases.length;
  return [...items]
    .sort((a, b) => slot(a) - slot(b) || byDueThenTitle(a, b))
    .map((x) => ({ item: x, phaseName: phases[slot(x)]?.name ?? "Sem fase" }));
}

export function projectStatusCsv(input: ProjectStatusInput, report: ProjectStatusReport, today: string) {
  const rows = inPhaseOrder(input.deliverables, report.phases).map(({ item: x, phaseName }): CsvCell[] => [
    phaseName,
    x.title,
    ADMIN_STATUS_LABEL[x.status],
    PRIORITY_LABEL[x.priority],
    x.assigneeName ?? "",
    formatBr(x.dueAt),
    x.completedAt ? formatBr(dateInSaoPaulo(x.completedAt)) : "",
    daysLate(x, today),
    csvDecimal(x.minutes / 60, 1),
    csvCents(x.laborCents),
  ]);
  return {
    headers: ["Fase", "Entrega", "Status", "Prioridade", "Responsável", "Prazo", "Concluída em", "Dias de atraso", "Horas", "Custo de horas (R$)"],
    rows,
  };
}
