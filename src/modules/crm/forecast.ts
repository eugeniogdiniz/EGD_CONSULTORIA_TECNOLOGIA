/** Previsão de receita e conversão a partir das oportunidades. Puro: `today` em 'YYYY-MM-DD'. */
import { addDays } from "@/modules/reports/dates";
import { csvCents, csvDecimal, type CsvCell } from "@/modules/reports/csv";

export type Stage = "new" | "qualified" | "meeting" | "proposal" | "won" | "lost";
export const STAGE_PROBABILITY: Record<Stage, number> = { new: 0.1, qualified: 0.25, meeting: 0.5, proposal: 0.7, won: 1, lost: 0 };
export const OPEN_STAGES: Stage[] = ["new", "qualified", "meeting", "proposal"];
export const STAGE_LABEL: Record<Stage, string> = { new: "Novo", qualified: "Qualificado", meeting: "Reunião", proposal: "Proposta", won: "Ganho", lost: "Perdido" };

export type ForecastOpportunity = {
  id: string;
  title: string;
  companyName: string;
  stage: Stage;
  valueCents: number | null;
  expectedCloseAt: string | null;
  createdAt: Date;
  wonAt: Date | null;
  lostAt: Date | null;
  lostReason: string | null;
};

export type Forecast = {
  byStage: { stage: Stage; count: number; valueCents: number; weightedCents: number }[];
  openCount: number;
  openCents: number;
  weightedCents: number;
  byMonth: { month: string; count: number; valueCents: number; weightedCents: number }[];
  noDate: { count: number; weightedCents: number };
  conversion: { window: 90 | 365; won: number; lost: number; rate: number | null; avgTicketCents: number | null; avgCycleDays: number | null }[];
  lostReasons: { reason: string; count: number }[];
};

const monthOf = (iso: string) => iso.slice(0, 7);
const weighted = (o: ForecastOpportunity) => Math.round((o.valueCents ?? 0) * STAGE_PROBABILITY[o.stage]);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function buildForecast(opps: ForecastOpportunity[], today: string, monthsAhead = 6): Forecast {
  const open = opps.filter((o) => OPEN_STAGES.includes(o.stage));
  const byStage = OPEN_STAGES.map((stage) => {
    const list = open.filter((o) => o.stage === stage);
    return { stage, count: list.length, valueCents: list.reduce((s, o) => s + (o.valueCents ?? 0), 0), weightedCents: list.reduce((s, o) => s + weighted(o), 0) };
  });
  const months: string[] = [];
  const first = `${today.slice(0, 7)}-01`;
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(`${first}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + i);
    months.push(d.toISOString().slice(0, 7));
  }
  const byMonth = months.map((month) => {
    const list = open.filter((o) => o.expectedCloseAt && monthOf(o.expectedCloseAt) === month);
    return { month, count: list.length, valueCents: list.reduce((s, o) => s + (o.valueCents ?? 0), 0), weightedCents: list.reduce((s, o) => s + weighted(o), 0) };
  });
  // vencidas (data esperada no passado) entram no mês corrente
  const overdue = open.filter((o) => o.expectedCloseAt && monthOf(o.expectedCloseAt) < months[0]);
  if (overdue.length && byMonth[0]) {
    byMonth[0].count += overdue.length;
    byMonth[0].valueCents += overdue.reduce((s, o) => s + (o.valueCents ?? 0), 0);
    byMonth[0].weightedCents += overdue.reduce((s, o) => s + weighted(o), 0);
  }
  const noDateList = open.filter((o) => !o.expectedCloseAt);
  const conversion = ([90, 365] as const).map((window) => {
    const since = addDays(today, -window);
    const won = opps.filter((o) => o.stage === "won" && o.wonAt && iso(o.wonAt) >= since);
    const lost = opps.filter((o) => o.stage === "lost" && o.lostAt && iso(o.lostAt) >= since);
    const closed = won.length + lost.length;
    const tickets = won.filter((o) => o.valueCents !== null);
    const cycles = won.map((o) => (o.wonAt!.getTime() - o.createdAt.getTime()) / 86_400_000);
    return {
      window,
      won: won.length,
      lost: lost.length,
      rate: closed === 0 ? null : Math.round((won.length / closed) * 100),
      avgTicketCents: tickets.length === 0 ? null : Math.round(tickets.reduce((s, o) => s + (o.valueCents ?? 0), 0) / tickets.length),
      avgCycleDays: cycles.length === 0 ? null : Math.round(cycles.reduce((s, c) => s + c, 0) / cycles.length),
    };
  });
  const reasons = new Map<string, number>();
  for (const o of opps) {
    if (o.stage !== "lost") continue;
    const key = (o.lostReason ?? "").trim().toLowerCase() || "(sem motivo)";
    reasons.set(key, (reasons.get(key) ?? 0) + 1);
  }
  const lostReasons = [...reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason, "pt-BR")).slice(0, 10);
  return {
    byStage,
    openCount: open.length,
    openCents: open.reduce((s, o) => s + (o.valueCents ?? 0), 0),
    weightedCents: open.reduce((s, o) => s + weighted(o), 0),
    byMonth,
    noDate: { count: noDateList.length, weightedCents: noDateList.reduce((s, o) => s + weighted(o), 0) },
    conversion,
    lostReasons,
  };
}

export function forecastCsv(f: Forecast): { headers: string[]; rows: CsvCell[][] } {
  const headers = ["Tabela", "Chave", "Quantidade", "Valor (R$)", "Ponderado (R$)", "Taxa (%)", "Ticket médio (R$)", "Ciclo médio (dias)"];
  const rows: CsvCell[][] = [];
  for (const s of f.byStage) rows.push(["Pipeline por estágio", STAGE_LABEL[s.stage], s.count, csvCents(s.valueCents), csvCents(s.weightedCents), "", "", ""]);
  for (const m of f.byMonth) rows.push(["Esperado por mês", m.month, m.count, csvCents(m.valueCents), csvCents(m.weightedCents), "", "", ""]);
  rows.push(["Esperado por mês", "sem data", f.noDate.count, "", csvCents(f.noDate.weightedCents), "", "", ""]);
  for (const c of f.conversion) rows.push(["Conversão", `${c.window} dias`, c.won + c.lost, "", "", c.rate === null ? "" : csvDecimal(c.rate, 0), csvCents(c.avgTicketCents), c.avgCycleDays ?? ""]);
  for (const r of f.lostReasons) rows.push(["Motivos de perda", r.reason, r.count, "", "", "", "", ""]);
  return { headers, rows };
}
