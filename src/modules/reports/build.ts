/**
 * Relatórios como funções puras: recebem linhas já lidas do banco e a data de
 * hoje (Brasília), devolvem o que a página e o CSV mostram. Página e CSV usam
 * o mesmo resultado, então os números nunca divergem.
 */
import { isOverdue, priorityRank, PRIORITY_LABEL, type Priority } from "@/modules/projects/priority";
import { portalStatusLabel } from "@/modules/portal-projects/scope";
import { csvCents, csvDecimal, type CsvCell } from "./csv";
import { addDays, dateInSaoPaulo, daysBetween, formatBr, isoWeekLabel } from "./dates";
import { ADMIN_STATUS_LABEL, PROJECT_STATUS_ADMIN_LABEL } from "./labels";

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

// ── 2. portfólio ────────────────────────────────────────────────────────────

export type PortfolioStatus = "planning" | "active" | "on_hold";
/** Encerrados só entram no semanal (para a semana em que foram concluídos não sumir). */
export type ClosedStatus = "delivered" | "cancelled";
export type PortfolioProjectInput = {
  id: string;
  title: string;
  slug: string;
  companyName: string;
  status: PortfolioStatus | ClosedStatus;
  budgetCents: number | null;
  minutes: number;
  laborCents: number;
  expenseCents: number;
  deliverables: { id: string; title: string; status: DeliverableStatus; dueAt: string | null; completedAt: Date | null }[];
  milestones: { id: string; name: string; dueAt: string; completedAt: Date | null }[];
};
export type PortfolioRow = {
  id: string;
  title: string;
  companyName: string;
  status: PortfolioStatus;
  percent: number | null;
  total: number;
  done: number;
  nextMilestone: { name: string; dueAt: string } | null;
  overdue: number;
  blocked: number;
  minutes: number;
  laborCents: number;
  expenseCents: number;
  costCents: number;
  budgetCents: number | null;
  consumption: number | null;
  band: BudgetBand | null;
  nextDue: string | null;
};

export function buildPortfolio(projects: PortfolioProjectInput[], today: string) {
  const open = projects.filter((p): p is PortfolioProjectInput & { status: PortfolioStatus } => p.status !== "delivered" && p.status !== "cancelled");
  const rows: PortfolioRow[] = open.map((p) => {
    const done = p.deliverables.filter((x) => x.status === "done").length;
    const pendingMilestones = p.milestones.filter((m) => m.completedAt === null).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    const upcoming = [
      ...p.deliverables.filter((x) => x.status !== "done" && x.dueAt !== null).map((x) => x.dueAt as string),
      ...pendingMilestones.map((m) => m.dueAt),
    ]
      .filter((dt) => dt >= today)
      .sort();
    const costCents = p.laborCents + p.expenseCents;
    const consumption = p.budgetCents !== null && p.budgetCents > 0 ? Math.round((costCents / p.budgetCents) * 100) : null;
    return {
      id: p.id,
      title: p.title,
      companyName: p.companyName,
      status: p.status,
      percent: p.deliverables.length === 0 ? null : pct(done, p.deliverables.length),
      total: p.deliverables.length,
      done,
      nextMilestone: pendingMilestones[0] ? { name: pendingMilestones[0].name, dueAt: pendingMilestones[0].dueAt } : null,
      overdue: p.deliverables.filter((x) => isOverdue(x, today)).length,
      blocked: p.deliverables.filter((x) => x.status === "blocked").length,
      minutes: p.minutes,
      laborCents: p.laborCents,
      expenseCents: p.expenseCents,
      costCents,
      budgetCents: p.budgetCents,
      consumption,
      band: budgetBand(consumption),
      nextDue: upcoming[0] ?? null,
    };
  });
  rows.sort(
    (a, b) =>
      b.overdue - a.overdue ||
      (a.nextDue ?? NO_DATE).localeCompare(b.nextDue ?? NO_DATE) ||
      a.title.localeCompare(b.title, "pt-BR"),
  );
  const counts: Record<PortfolioStatus, number> = { planning: 0, active: 0, on_hold: 0 };
  for (const r of rows) counts[r.status] += 1;
  return { rows, counts, overdueTotal: rows.reduce((s, r) => s + r.overdue, 0) };
}
export type PortfolioReport = ReturnType<typeof buildPortfolio>;

export function portfolioCsv(report: PortfolioReport) {
  return {
    headers: [
      "Projeto", "Cliente", "Status", "Progresso (%)", "Próximo marco", "Data do próximo marco", "Atrasadas", "Bloqueadas",
      "Horas", "Orçamento (R$)", "Custo de horas (R$)", "Despesas (R$)", "Consumo do orçamento (%)",
    ],
    rows: report.rows.map((r): CsvCell[] => [
      r.title,
      r.companyName,
      PROJECT_STATUS_ADMIN_LABEL[r.status],
      r.percent,
      r.nextMilestone?.name ?? "",
      formatBr(r.nextMilestone?.dueAt ?? null),
      r.overdue,
      r.blocked,
      csvDecimal(r.minutes / 60, 1),
      csvCents(r.budgetCents),
      csvCents(r.laborCents),
      csvCents(r.expenseCents),
      r.consumption,
    ]),
  };
}

// ── 3. semanal ──────────────────────────────────────────────────────────────

export type WeeklyItem = { kind: "deliverable" | "milestone"; title: string; date: string; daysLate: number | null };
export type WeeklyProject = { id: string; title: string; companyName: string; done: WeeklyItem[]; due: WeeklyItem[]; late: WeeklyItem[] };

const byDate = (a: WeeklyItem, b: WeeklyItem) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "pt-BR");

/** Semana de segunda (`monday`) a domingo. "Vence" olha a semana seguinte; "atrasado", o dia de hoje. */
export function buildWeekly(projects: PortfolioProjectInput[], monday: string, today: string) {
  const start = monday;
  const end = addDays(monday, 6);
  const nextStart = addDays(monday, 7);
  const nextEnd = addDays(monday, 13);
  const inRange = (dt: string, a: string, b: string) => dt >= a && dt <= b;

  const out: WeeklyProject[] = [];
  for (const p of [...projects].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))) {
    const done: WeeklyItem[] = [];
    const due: WeeklyItem[] = [];
    const late: WeeklyItem[] = [];
    // Projeto encerrado: só o que foi concluído conta; o que ficou em aberto não vence nem atrasa mais.
    const closed = p.status === "delivered" || p.status === "cancelled";
    for (const x of p.deliverables) {
      if (x.status === "done") {
        const on = x.completedAt ? dateInSaoPaulo(x.completedAt) : null;
        if (on && inRange(on, start, end)) done.push({ kind: "deliverable", title: x.title, date: on, daysLate: null });
        continue;
      }
      if (closed) continue;
      if (x.dueAt && inRange(x.dueAt, nextStart, nextEnd)) due.push({ kind: "deliverable", title: x.title, date: x.dueAt, daysLate: null });
      if (isOverdue(x, today)) late.push({ kind: "deliverable", title: x.title, date: x.dueAt as string, daysLate: daysBetween(x.dueAt as string, today) });
    }
    for (const m of p.milestones) {
      const on = m.completedAt ? dateInSaoPaulo(m.completedAt) : null;
      if (on) {
        if (inRange(on, start, end)) done.push({ kind: "milestone", title: m.name, date: on, daysLate: null });
      } else if (!closed && inRange(m.dueAt, nextStart, nextEnd)) {
        due.push({ kind: "milestone", title: m.name, date: m.dueAt, daysLate: null });
      }
    }
    if (done.length + due.length + late.length === 0) continue;
    out.push({
      id: p.id,
      title: p.title,
      companyName: p.companyName,
      done: done.sort(byDate),
      due: due.sort(byDate),
      late: late.sort((a, b) => (b.daysLate ?? 0) - (a.daysLate ?? 0) || a.title.localeCompare(b.title, "pt-BR")),
    });
  }
  return {
    start,
    end,
    nextStart,
    nextEnd,
    label: isoWeekLabel(monday),
    projects: out,
    doneCount: out.reduce((s, p) => s + p.done.length, 0),
  };
}
export type WeeklyReport = ReturnType<typeof buildWeekly>;

export function weeklyCsv(report: WeeklyReport) {
  const groups: [keyof Pick<WeeklyProject, "done" | "due" | "late">, string][] = [
    ["done", "Concluído"],
    ["due", "Vence"],
    ["late", "Atrasado"],
  ];
  const rows: CsvCell[][] = [];
  for (const p of report.projects) {
    for (const [key, label] of groups) {
      for (const i of p[key]) {
        rows.push([p.title, p.companyName, i.kind === "milestone" ? "Marco" : "Entrega", label, i.title, formatBr(i.date), i.daysLate]);
      }
    }
  }
  return { headers: ["Projeto", "Cliente", "Tipo", "Grupo", "Título", "Data", "Dias de atraso"], rows };
}

// ── 4. versão do cliente ────────────────────────────────────────────────────

/**
 * Entrada já filtrada pelo portal: só entregas visíveis e atas compartilhadas.
 * O tipo não tem campos de dinheiro, prioridade nem responsável por entrega,
 * então nada disso pode vazar para a página ou o CSV do cliente.
 */
export type ClientReportInput = {
  project: { title: string; companyName: string; startedAt: string | null; endedAt: string | null; ownerName: string; showHoursToClient: boolean };
  phases: ReportPhase[];
  milestones: ReportMilestone[];
  deliverables: { id: string; title: string; status: DeliverableStatus; dueAt: string | null; completedAt: Date | null; phaseId: string | null }[];
  meetings: { id: string; title: string; heldAt: Date; decisions: string | null }[];
  /** Todos os lançamentos encerrados do projeto, somados por fase. */
  minutesByPhase: { phaseId: string | null; minutes: number }[];
};

export function buildClientReport(input: ClientReportInput, today: string) {
  const ds = input.deliverables;
  const done = ds.filter((x) => x.status === "done").length;
  const phases = phaseProgress(input.phases, ds);
  const phaseName = new Map(input.phases.map((p) => [p.id, p.name]));

  const open = ds
    .filter((x) => x.status !== "done")
    .sort(byDueThenTitle)
    .map((x) => ({
      id: x.id,
      title: x.title,
      phaseName: x.phaseId ? (phaseName.get(x.phaseId) ?? null) : null,
      statusLabel: portalStatusLabel(x.status),
      blocked: x.status === "blocked",
      dueAt: x.dueAt,
      late: isOverdue(x, today),
    }));

  let hours: { totalMinutes: number; byPhase: { name: string; minutes: number }[] } | null = null;
  if (input.project.showHoursToClient) {
    const byPhase = [...input.phases]
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ name: p.name, minutes: input.minutesByPhase.filter((m) => m.phaseId === p.id).reduce((s, m) => s + m.minutes, 0) }))
      .filter((p) => p.minutes > 0);
    const known = new Set(input.phases.map((p) => p.id));
    const loose = input.minutesByPhase.filter((m) => m.phaseId === null || !known.has(m.phaseId)).reduce((s, m) => s + m.minutes, 0);
    if (loose > 0) byPhase.push({ name: "Sem fase", minutes: loose });
    hours = { totalMinutes: input.minutesByPhase.reduce((s, m) => s + m.minutes, 0), byPhase };
  }

  return {
    progress: { total: ds.length, done, percent: ds.length === 0 ? null : pct(done, ds.length) },
    phases,
    milestones: milestoneLines(input.milestones, input.phases, today),
    open,
    hours,
    meetings: [...input.meetings].sort((a, b) => b.heldAt.getTime() - a.heldAt.getTime()),
  };
}
export type ClientReport = ReturnType<typeof buildClientReport>;

export function clientReportCsv(input: ClientReportInput) {
  const phases = phaseProgress(input.phases, input.deliverables);
  return {
    headers: ["Fase", "Entrega", "Status", "Prazo", "Concluída em"],
    rows: inPhaseOrder(input.deliverables, phases).map(({ item: x, phaseName }): CsvCell[] => [
      phaseName,
      x.title,
      portalStatusLabel(x.status),
      formatBr(x.dueAt),
      x.completedAt ? formatBr(dateInSaoPaulo(x.completedAt)) : "",
    ]),
  };
}

// ── 4. comparação entre períodos (Fase 21) ──────────────────────────────────

export type ProjectSnapshot = { projectId: string; doneCount: number; openCount: number; overdueCount: number; progressPct: number };

/** Linha do snapshot de hoje para cada projeto aberto do portfólio (puro). */
export function snapshotRows(report: PortfolioReport): ProjectSnapshot[] {
  return report.rows.map((r) => ({ projectId: r.id, doneCount: r.done, openCount: r.total - r.done, overdueCount: r.overdue, progressPct: r.percent ?? 0 }));
}

export type PortfolioDelta = { overdue: number | null; progress: number | null };

/** Δ contra o snapshot de referência (7 dias atrás); null quando não há snapshot do projeto. */
export function portfolioDelta(row: PortfolioRow, previous: ProjectSnapshot | undefined): PortfolioDelta {
  if (!previous) return { overdue: null, progress: null };
  return { overdue: row.overdue - previous.overdueCount, progress: (row.percent ?? 0) - previous.progressPct };
}

export type WeeklyComparison = { done: number; due: number; late: number; prevDone: number; prevDue: number; prevLate: number };

/** Totais da semana e da anterior (puro: recebe os dois relatórios). */
export function compareWeekly(current: WeeklyReport, previous: WeeklyReport): WeeklyComparison {
  const sum = (w: WeeklyReport, k: "done" | "due" | "late") => w.projects.reduce((s, p) => s + p[k].length, 0);
  return { done: sum(current, "done"), due: sum(current, "due"), late: sum(current, "late"), prevDone: sum(previous, "done"), prevDue: sum(previous, "due"), prevLate: sum(previous, "late") };
}

/** "▲ 2", "▼ 1" ou "=" para a variação. */
export function deltaLabel(n: number | null): string {
  if (n === null) return "—";
  if (n === 0) return "=";
  return n > 0 ? `▲ ${n}` : `▼ ${Math.abs(n)}`;
}
