/**
 * Burndown por semana: restante = soma das estimativas das entregas ainda não
 * concluídas no fim de cada semana; ideal = reta do total até o último prazo.
 * Puro: datas em 'YYYY-MM-DD'; `completedAt` como Date.
 */
import { addDays, mondayOf } from "@/modules/reports/dates";

export type BurndownDeliverable = { estimateMinutes: number | null; completedAt: Date | null; dueAt: string | null; status: string };
export type BurndownPoint = { weekStart: string; remainingMinutes: number; idealMinutes: number };
export type Burndown = { totalMinutes: number; estimated: number; unestimated: number; points: BurndownPoint[]; from: string; to: string; doneMinutes: number };

export function buildBurndown(ds: BurndownDeliverable[], p: { from: string; to: string | null; today: string }): Burndown {
  const estimated = ds.filter((d) => d.estimateMinutes !== null && d.estimateMinutes > 0);
  const totalMinutes = estimated.reduce((s, d) => s + (d.estimateMinutes ?? 0), 0);
  const lastDue = ds.reduce<string | null>((m, d) => (d.dueAt && (!m || d.dueAt > m) ? d.dueAt : m), null);
  const to = p.to ?? lastDue ?? p.today;
  const end = to > p.today ? to : p.today;
  const start = mondayOf(p.from);
  const weeks: string[] = [];
  for (let w = start; w <= end && weeks.length < 260; w = addDays(w, 7)) weeks.push(w);
  if (weeks.length === 0) weeks.push(start);
  const spanWeeks = Math.max(1, Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / (7 * 86_400_000)));
  const points: BurndownPoint[] = weeks.map((weekStart, i) => {
    const weekEnd = addDays(weekStart, 6);
    const remaining = estimated.reduce((s, d) => {
      const doneBy = d.status === "done" && d.completedAt ? d.completedAt.toISOString().slice(0, 10) <= weekEnd : false;
      return doneBy ? s : s + (d.estimateMinutes ?? 0);
    }, 0);
    const ideal = Math.max(0, Math.round(totalMinutes * (1 - i / spanWeeks)));
    // semanas futuras não têm "restante" real: repetem o atual (linha achatada)
    return { weekStart, remainingMinutes: weekStart > p.today ? NaN : remaining, idealMinutes: ideal };
  });
  const doneMinutes = estimated.filter((d) => d.status === "done").reduce((s, d) => s + (d.estimateMinutes ?? 0), 0);
  return { totalMinutes, estimated: estimated.length, unestimated: ds.length - estimated.length, points, from: start, to, doneMinutes };
}

/** "1,5 h", "12 h" para estimativas e totais em minutos. */
export const formatHours = (min: number): string => {
  const h = min / 60;
  return `${(Math.round(h * 10) / 10).toString().replace(".", ",")} h`;
};

/** Horas digitadas (ex.: "1,5") → minutos inteiros; vazio → null. */
export function hoursToMinutes(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 60);
}
