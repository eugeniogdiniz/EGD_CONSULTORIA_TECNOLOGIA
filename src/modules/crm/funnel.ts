/**
 * Colunas Ganho e Perdido do funil: por padrão mostram só o que fechou nos
 * últimos `days` dias (uma proposta aceita hoje aparece como ganha na hora);
 * o resto fica contado e abre com "mostrar todas". Puro.
 */
export const RECENT_CLOSED_DAYS = 30;

export type ClosedLike = { wonAt: Date | string | null; lostAt: Date | string | null };

export function splitRecentClosed<T extends ClosedLike>(cards: T[], now: Date, days = RECENT_CLOSED_DAYS): { recent: T[]; older: T[] } {
  const cutoff = now.getTime() - days * 86_400_000;
  const recent: T[] = [];
  const older: T[] = [];
  for (const c of cards) {
    const closedAt = c.wonAt ?? c.lostAt;
    const t = closedAt ? new Date(closedAt).getTime() : NaN;
    (Number.isFinite(t) && t >= cutoff ? recent : older).push(c);
  }
  return { recent, older };
}
