/**
 * Datas dos relatórios. Tudo em 'YYYY-MM-DD'; "hoje" e semanas no fuso de
 * Brasília, não no do servidor. A aritmética é feita em UTC (sem horário de verão).
 */
import { isIsoDate } from "@/lib/iso-date";

const SP = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const dateInSaoPaulo = (d: Date): string => SP.format(d);
export const todayInSaoPaulo = (now: Date = new Date()): string => dateInSaoPaulo(now);

const toUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const fromUtc = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

/** Dias de `from` até `to` (positivo quando `to` é depois). */
export const daysBetween = (from: string, to: string): number =>
  Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);

export function mondayOf(iso: string): string {
  const dow = toUtc(iso).getUTCDay(); // 0 = domingo
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

/** `?semana=` vira a segunda-feira da semana pedida; inválido ou ausente, a de hoje. */
export function parseWeekParam(v: string | string[] | undefined, today: string): string {
  const raw = Array.isArray(v) ? v[0] : v;
  return mondayOf(raw && isIsoDate(raw) ? raw : today);
}

/** Semana ISO 8601: a semana pertence ao ano da sua quinta-feira. */
export function isoWeekLabel(monday: string): string {
  const thursday = toUtc(addDays(monday, 3));
  const year = thursday.getUTCFullYear();
  const week = Math.floor((thursday.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 / 7) + 1;
  return `${year}-S${String(week).padStart(2, "0")}`;
}

export const formatBr = (iso: string | null): string =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";

export const formatBrShort = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
