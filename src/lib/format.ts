const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const dateOnly = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export const formatDateTime = (d: Date) => dateTime.format(d);
export const formatDate = (d: Date) => dateOnly.format(d);

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Dias inteiros até a data (negativo se já passou). */
export const daysUntil = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86_400_000);

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata cents (Number) em reais. Null vira "—". */
export const formatBrlCents = (cents: number | null | undefined) =>
  cents == null ? "—" : brl.format(cents / 100);

/** Aceita Date ou 'YYYY-MM-DD' (coluna Postgres date). Devolve DD/MM/AAAA. */
export function formatIsoDate(v: Date | string | null | undefined): string {
  if (!v) return "—";
  if (v instanceof Date) return dateOnly.format(v);
  // 'YYYY-MM-DD' — evita passar por Date pra não bugar por timezone.
  const [y, m, d] = v.split("-");
  return d && m && y ? `${d}/${m}/${y}` : v;
}
