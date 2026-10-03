/**
 * Agenda das automações. Tudo em America/Sao_Paulo: o servidor pode estar em
 * UTC, mas "08:00 de segunda" é o horário de Brasília. Funções puras: `now`
 * é sempre injetado, para os testes cobrirem viradas de dia e de semana.
 */
import { addDays, dateInSaoPaulo, isoWeekLabel, mondayOf } from "@/modules/reports/dates";

export type Schedule =
  | { kind: "daily"; hour: number; minute: number }
  | { kind: "weekdays"; hour: number; minute: number }
  | { kind: "weekly"; weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; hour: number; minute: number };

const SP_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Minutos desde a meia-noite em São Paulo. */
export function minutesInSaoPaulo(now: Date): number {
  const [h, m] = SP_TIME.format(now).split(":").map(Number);
  return h * 60 + m;
}

/** Dia da semana ISO (1 = segunda … 7 = domingo) do dia `iso`. */
export function isoWeekday(iso: string): number {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return dow === 0 ? 7 : dow;
}

const dayMatches = (s: Schedule, iso: string): boolean => {
  const wd = isoWeekday(iso);
  if (s.kind === "daily") return true;
  if (s.kind === "weekdays") return wd <= 5;
  return wd === s.weekday;
};

/**
 * Chave do período corrente: a data (diária / dias úteis) ou a semana ISO
 * (semanal). Só o período corrente é elegível, nunca os passados.
 */
export function periodKey(s: Schedule, now: Date): string {
  const today = dateInSaoPaulo(now);
  return s.kind === "weekly" ? isoWeekLabel(mondayOf(today)) : today;
}

/** O período corrente já está devido? (dia elegível e horário de Brasília alcançado) */
export function isDue(s: Schedule, now: Date): boolean {
  const today = dateInSaoPaulo(now);
  if (!dayMatches(s, today)) return false;
  return minutesInSaoPaulo(now) >= s.hour * 60 + s.minute;
}

/** Próxima data/hora (em São Paulo, como "YYYY-MM-DD HH:MM") em que a agenda dispara depois de `now`. */
export function nextRunAt(s: Schedule, now: Date): { date: string; time: string } {
  const today = dateInSaoPaulo(now);
  const time = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
  let date = today;
  if (dayMatches(s, today) && minutesInSaoPaulo(now) < s.hour * 60 + s.minute) return { date, time };
  for (let i = 1; i <= 7; i++) {
    date = addDays(today, i);
    if (dayMatches(s, date)) return { date, time };
  }
  return { date, time };
}

const WEEKDAY_NAME: Record<number, string> = { 1: "segunda", 2: "terça", 3: "quarta", 4: "quinta", 5: "sexta", 6: "sábado", 7: "domingo" };

export function describeSchedule(s: Schedule): string {
  const time = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
  if (s.kind === "daily") return `todo dia, ${time}`;
  if (s.kind === "weekdays") return `seg–sex, ${time}`;
  return `${WEEKDAY_NAME[s.weekday]}, ${time}`;
}

/** Agenda efetiva: horário sobrescrito pelo dono (Fase 21) sobre o padrão do código. */
export function applyOverride(s: Schedule, o: { hour: number | null; minute: number | null } | null | undefined): Schedule {
  if (!o || o.hour === null || o.minute === null) return s;
  return { ...s, hour: o.hour, minute: o.minute };
}

/** "HH:MM" → { hour, minute } ou null quando inválido/vazio. */
export function parseTime(v: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}
