import { describe, it, expect } from "vitest";
import {
  budgetBand,
  buildProjectStatus,
  projectStatusCsv,
  type ProjectStatusInput,
  type ReportDeliverable,
} from "@/modules/reports/build";

const TODAY = "2026-09-30";
let seq = 0;
const d = (over: Partial<ReportDeliverable>): ReportDeliverable => ({
  id: `d${++seq}`,
  title: "Entrega",
  status: "todo",
  priority: "medium",
  dueAt: null,
  completedAt: null,
  phaseId: null,
  assigneeName: null,
  minutes: 0,
  laborCents: 0,
  ...over,
});
const base = (over: Partial<ProjectStatusInput> = {}): ProjectStatusInput => ({
  project: { title: "Laudo", companyName: "Vale Norte", status: "active", startedAt: "2026-09-01", endedAt: null, ownerName: "Eugênio", budgetCents: 2_000_000 },
  phases: [
    { id: "f1", name: "Levantamento", position: 0, startedAt: "2026-09-01", endedAt: "2026-09-15" },
    { id: "f2", name: "Diagnóstico", position: 1, startedAt: "2026-09-16", endedAt: "2026-10-09" },
  ],
  milestones: [],
  deliverables: [],
  expenseCents: 0,
  entriesWithoutRate: 0,
  entriesCount: 0,
  meetings: [],
  ...over,
});

describe("relatório de status", () => {
  it("projeto vazio: sem percentual, sem NaN, sem linha Sem fase", () => {
    const r = buildProjectStatus(base(), TODAY);
    expect(r.progress).toEqual({ total: 0, done: 0, percent: null });
    expect(r.phases.map((p) => [p.name, p.total, p.percent])).toEqual([["Levantamento", 0, 0], ["Diagnóstico", 0, 0]]);
    expect(r.issues).toEqual([]);
    expect(r.nextMilestone).toBeNull();
    expect(r.money.consumption).toBe(0);
  });

  it("progresso por fase com Sem fase no fim", () => {
    const r = buildProjectStatus(base({ deliverables: [
      d({ phaseId: "f1", status: "done" }), d({ phaseId: "f1", status: "done" }),
      d({ phaseId: "f2", status: "doing" }), d({ phaseId: null, status: "todo" }),
    ] }), TODAY);
    expect(r.progress).toEqual({ total: 4, done: 2, percent: 50 });
    expect(r.phases.map((p) => [p.name, p.done, p.total, p.percent])).toEqual([
      ["Levantamento", 2, 2, 100], ["Diagnóstico", 0, 1, 0], ["Sem fase", 0, 1, 0],
    ]);
    expect(r.byStatus).toEqual({ todo: 1, doing: 1, review: 0, done: 2, blocked: 0 });
  });

  it("atrasadas e bloqueadas por prioridade e atraso", () => {
    const r = buildProjectStatus(base({ deliverables: [
      d({ title: "B", priority: "medium", dueAt: "2026-09-29" }),
      d({ title: "A", priority: "urgent", dueAt: "2026-09-22" }),
      d({ title: "C", priority: "high", status: "blocked", dueAt: "2026-10-03" }),
      d({ title: "D", priority: "high", dueAt: "2026-09-26" }),
      d({ title: "ok", status: "done", dueAt: "2026-09-01" }),
      d({ title: "futura", dueAt: "2026-10-30" }),
    ] }), TODAY);
    expect(r.issues.map((i) => [i.title, i.daysLate])).toEqual([["A", 8], ["D", 4], ["C", null], ["B", 1]]);
    expect(r.overdueCount).toBe(3);
    expect(r.blockedCount).toBe(1);
  });

  it("marcos: concluído, atrasado, pendente e próximo marco", () => {
    const r = buildProjectStatus(base({ milestones: [
      { id: "m3", name: "Laudo", dueAt: "2026-10-09", completedAt: null, phaseId: "f2" },
      { id: "m1", name: "Kickoff", dueAt: "2026-09-02", completedAt: new Date("2026-09-02T15:00:00Z"), phaseId: "f1" },
      { id: "m2", name: "Aprovação", dueAt: "2026-09-25", completedAt: null, phaseId: "f1" },
    ] }), TODAY);
    expect(r.milestones.map((m) => [m.name, m.state, m.days, m.phaseName, m.completedOn])).toEqual([
      ["Kickoff", "done", 0, "Levantamento", "2026-09-02"],
      ["Aprovação", "late", 5, "Levantamento", null],
      ["Laudo", "pending", 9, "Diagnóstico", null],
    ]);
    expect(r.nextMilestone?.name).toBe("Aprovação");
  });

  it("dinheiro: custo, consumo e faixas", () => {
    const r = buildProjectStatus(base({ deliverables: [d({ minutes: 5190, laborCents: 1_297_500 })], expenseCents: 184_000 }), TODAY);
    expect(r.money).toMatchObject({ minutes: 5190, laborCents: 1_297_500, costCents: 1_481_500, consumption: 74, band: "warn" });
    const semOrcamento = buildProjectStatus(base({ project: { ...base().project, budgetCents: null } }), TODAY);
    expect(semOrcamento.money).toMatchObject({ consumption: null, band: null });
    const orcamentoZero = buildProjectStatus(base({ project: { ...base().project, budgetCents: 0 } }), TODAY);
    expect(orcamentoZero.money.consumption).toBeNull();
    expect([budgetBand(null), budgetBand(69), budgetBand(70), budgetBand(90), budgetBand(91)]).toEqual([null, "ok", "warn", "warn", "alert"]);
  });

  it("últimas 3 atas, mais recentes primeiro", () => {
    const m = (id: string, at: string) => ({ id, title: id, heldAt: new Date(at), decisions: null, sharedWithClient: false });
    const r = buildProjectStatus(base({ meetings: [m("a", "2026-09-02"), m("b", "2026-09-24"), m("c", "2026-09-10"), m("d", "2026-08-01")] }), TODAY);
    expect(r.meetings.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("CSV com uma linha por entrega, na ordem de fase e prazo", () => {
    const input = base({ deliverables: [
      d({ title: "Sem prazo", phaseId: "f1" }),
      d({ title: "Mapa; rede", phaseId: "f1", dueAt: "2026-09-29", assigneeName: "Rafael", minutes: 90, laborCents: 22_500, priority: "high" }),
      d({ title: "Solta", status: "done", completedAt: new Date("2026-09-20T12:00:00Z"), dueAt: "2026-09-19" }),
    ] });
    const { headers, rows } = projectStatusCsv(input, buildProjectStatus(input, TODAY), TODAY);
    expect(headers).toEqual(["Fase", "Entrega", "Status", "Prioridade", "Responsável", "Prazo", "Concluída em", "Dias de atraso", "Horas", "Custo de horas (R$)"]);
    expect(rows).toEqual([
      ["Levantamento", "Mapa; rede", "A fazer", "Alta", "Rafael", "29/09/2026", "", 1, "1,5", "225,00"],
      ["Levantamento", "Sem prazo", "A fazer", "Média", "", "", "", null, "0,0", "0,00"],
      ["Sem fase", "Solta", "Concluída", "Média", "", "19/09/2026", "20/09/2026", null, "0,0", "0,00"],
    ]);
  });
});
