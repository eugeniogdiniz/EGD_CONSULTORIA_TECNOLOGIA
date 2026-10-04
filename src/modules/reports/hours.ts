/** Relatório de horas por pessoa e período (puro) e seu CSV. */
import { csvCents, csvDecimal, type CsvCell } from "./csv";

export type HoursRow = { userId: string; userName: string; projectId: string; projectTitle: string; minutes: number; costCents: number; entriesWithoutRate: number };
export type HoursReport = {
  people: { userId: string; userName: string; minutes: number; costCents: number; projects: HoursRow[] }[];
  totalMinutes: number;
  totalCostCents: number;
  entriesWithoutRate: number;
};

export function buildHoursReport(rows: HoursRow[]): HoursReport {
  const byUser = new Map<string, HoursReport["people"][number]>();
  for (const r of rows) {
    const p = byUser.get(r.userId) ?? { userId: r.userId, userName: r.userName, minutes: 0, costCents: 0, projects: [] };
    p.minutes += r.minutes;
    p.costCents += r.costCents;
    p.projects.push(r);
    byUser.set(r.userId, p);
  }
  const people = [...byUser.values()].sort((a, b) => b.minutes - a.minutes || a.userName.localeCompare(b.userName, "pt-BR"));
  for (const p of people) p.projects.sort((a, b) => b.minutes - a.minutes || a.projectTitle.localeCompare(b.projectTitle, "pt-BR"));
  return {
    people,
    totalMinutes: rows.reduce((s, r) => s + r.minutes, 0),
    totalCostCents: rows.reduce((s, r) => s + r.costCents, 0),
    entriesWithoutRate: rows.reduce((s, r) => s + r.entriesWithoutRate, 0),
  };
}

export function hoursCsv(report: HoursReport): { headers: string[]; rows: CsvCell[][] } {
  const headers = ["Pessoa", "Projeto", "Horas", "Custo (R$)", "Entradas sem rate"];
  const rows: CsvCell[][] = [];
  for (const p of report.people) {
    for (const r of p.projects) rows.push([p.userName, r.projectTitle, csvDecimal(r.minutes / 60, 2), csvCents(r.costCents), r.entriesWithoutRate]);
    rows.push([p.userName, "Total da pessoa", csvDecimal(p.minutes / 60, 2), csvCents(p.costCents), ""]);
  }
  rows.push(["Total", "", csvDecimal(report.totalMinutes / 60, 2), csvCents(report.totalCostCents), report.entriesWithoutRate]);
  return { headers, rows };
}
