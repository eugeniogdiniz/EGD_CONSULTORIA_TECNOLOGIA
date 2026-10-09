/**
 * Dinheiro na interface é digitado em reais ("1.500,00", "1500", "1500.5");
 * no banco e nas actions é inteiro em centavos. Puro.
 */

/** "1.500,00" | "1500" | "1500,5" | "R$ 1.500,00" → 150000; vazio → null; inválido → NaN. */
export function reaisToCents(raw: string): number | null {
  const s = raw.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (s === "") return null;
  // com vírgula: ponto é milhar; sem vírgula e com um só ponto seguido de 1–2 dígitos: ponto é decimal (teclado numérico)
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : /^\d+\.\d{1,2}$/.test(s) ? s : s.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  return Math.round(Number(normalized) * 100);
}

/** 150000 → "1.500,00"; null → "". */
export function centsToReais(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "";
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
