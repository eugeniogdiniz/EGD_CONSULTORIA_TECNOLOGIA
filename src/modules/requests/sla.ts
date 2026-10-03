/**
 * SLA de primeira resposta em horas úteis (seg–sex, 09:00–18:00, Brasília).
 * Puro: `now` sempre injetado. A aritmética anda minuto a minuto por blocos
 * de expediente, sem feriados (fora do escopo).
 */
import type { Priority } from "@/modules/projects/priority";

export const BUSINESS_START_MIN = 9 * 60;
export const BUSINESS_END_MIN = 18 * 60;
export const BUSINESS_DAY_MIN = BUSINESS_END_MIN - BUSINESS_START_MIN;

/** Horas úteis para a primeira resposta, por prioridade. */
export const SLA_HOURS: Record<Priority, number> = { urgent: 2, high: 4, medium: 8, low: 16 };

const SP_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

type Local = { y: number; m: number; d: number; minutes: number; weekday: number; offsetMs: number };

/** Decompõe `d` no horário de Brasília e devolve também o deslocamento UTC→SP naquele instante. */
function local(d: Date): Local {
  const parts = Object.fromEntries(SP_PARTS.formatToParts(d).map((p) => [p.type, p.value]));
  const y = Number(parts.year);
  const m = Number(parts.month);
  const day = Number(parts.day);
  const h = Number(parts.hour);
  const mi = Number(parts.minute);
  const s = Number(parts.second);
  const asUtc = Date.UTC(y, m - 1, day, h, mi, s);
  const weekdayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { y, m, d: day, minutes: h * 60 + mi, weekday: weekdayIdx, offsetMs: asUtc - d.getTime() };
}

/** Instante UTC do minuto `minutes` do dia local (y, m, d) em Brasília. */
function atLocal(l: Local, minutes: number, dayOffset = 0): Date {
  // usa o deslocamento do instante de referência; o Brasil não tem horário de verão desde 2019
  const utc = Date.UTC(l.y, l.m - 1, l.d + dayOffset, Math.floor(minutes / 60), minutes % 60, 0) - l.offsetMs;
  return new Date(utc);
}

const isWorkday = (weekday: number) => weekday >= 1 && weekday <= 5;

/** Próximo instante dentro do expediente a partir de `d` (o próprio `d` se já estiver dentro). */
export function nextBusinessInstant(d: Date): Date {
  let cur = new Date(d.getTime());
  for (let i = 0; i < 10; i++) {
    const l = local(cur);
    if (isWorkday(l.weekday) && l.minutes >= BUSINESS_START_MIN && l.minutes < BUSINESS_END_MIN) return cur;
    if (isWorkday(l.weekday) && l.minutes < BUSINESS_START_MIN) return atLocal(l, BUSINESS_START_MIN);
    cur = atLocal(l, BUSINESS_START_MIN, 1);
  }
  return cur;
}

/** Soma `hours` úteis a partir de `from`. Fora do expediente, começa a contar na abertura seguinte. */
export function addBusinessHours(from: Date, hours: number): Date {
  let remaining = Math.round(hours * 60);
  let cur = nextBusinessInstant(from);
  while (remaining > 0) {
    const l = local(cur);
    const left = BUSINESS_END_MIN - l.minutes;
    if (remaining < left) return atLocal(l, l.minutes + remaining);
    remaining -= left;
    cur = nextBusinessInstant(atLocal(l, BUSINESS_END_MIN));
  }
  return cur;
}

/** Minutos úteis entre dois instantes (0 se `to` ≤ `from`). */
export function businessMinutesBetween(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  let total = 0;
  let cur = nextBusinessInstant(from);
  for (let i = 0; i < 400 && cur.getTime() < to.getTime(); i++) {
    const l = local(cur);
    const end = atLocal(l, BUSINESS_END_MIN);
    const stop = Math.min(end.getTime(), to.getTime());
    total += Math.max(0, Math.round((stop - cur.getTime()) / 60_000));
    cur = nextBusinessInstant(end);
  }
  return total;
}

export const businessDaysBetween = (from: Date, to: Date) => businessMinutesBetween(from, to) / BUSINESS_DAY_MIN;

export const firstResponseDueAt = (createdAt: Date, priority: Priority) => addBusinessHours(createdAt, SLA_HOURS[priority]);

export type SlaState =
  | { kind: "pending"; remainingMinutes: number }
  | { kind: "breached"; overdueMinutes: number }
  | { kind: "met"; responseMinutes: number }
  | { kind: "closed" }
  | { kind: "none" };

export function slaState(
  r: { firstResponseDueAt: Date | null; firstResponseAt: Date | null; createdAt: Date; status: string },
  now: Date,
): SlaState {
  if (!r.firstResponseDueAt) return { kind: "none" };
  if (r.firstResponseAt) return { kind: "met", responseMinutes: businessMinutesBetween(r.createdAt, r.firstResponseAt) };
  if (r.status === "resolved") return { kind: "closed" };
  const diff = businessMinutesBetween(now, r.firstResponseDueAt);
  if (now.getTime() <= r.firstResponseDueAt.getTime()) return { kind: "pending", remainingMinutes: diff };
  return { kind: "breached", overdueMinutes: businessMinutesBetween(r.firstResponseDueAt, now) };
}

/** "45 min", "3 h", "1 h 20", "2 dias úteis" (dias úteis a partir de 2 dias). */
export function formatBusinessMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  if (min >= 2 * BUSINESS_DAY_MIN) return `${Math.round((min / BUSINESS_DAY_MIN) * 10) / 10} dias úteis`.replace(".", ",");
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export function formatSla(s: SlaState): { text: string; tone: "ok" | "warn" | "err" | "none" } {
  switch (s.kind) {
    case "pending":
      return { text: `SLA: resta ${formatBusinessMinutes(s.remainingMinutes)}`, tone: s.remainingMinutes <= 60 ? "warn" : "none" };
    case "breached":
      return { text: `SLA estourado há ${formatBusinessMinutes(s.overdueMinutes)}`, tone: "err" };
    case "met":
      return { text: `Respondida em ${formatBusinessMinutes(s.responseMinutes)}`, tone: "ok" };
    case "closed":
      return { text: "Resolvida sem resposta da equipe", tone: "none" };
    default:
      return { text: "SLA —", tone: "none" };
  }
}
