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
