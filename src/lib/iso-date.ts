const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 'AAAA-MM-DD' de um dia que existe no calendário. O regex sozinho deixa
 * passar 2026-02-30, que o Postgres recusa ao gravar numa coluna `date`.
 */
export function isIsoDate(v: string): boolean {
  if (!ISO.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
