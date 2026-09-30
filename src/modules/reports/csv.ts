/** CSV para abrir direto no Excel em português: BOM, ';' e CRLF. */
export type CsvCell = string | number | null;

function cell(v: CsvCell): string {
  if (v === null) return "";
  let s = String(v);
  // Texto começando com = + - @ (ou tabulação/CR na frente) vira fórmula no Excel; o apóstrofo desarma.
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(cell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

export const csvDecimal = (n: number, digits = 1): string => n.toFixed(digits).replace(".", ",");
export const csvCents = (cents: number | null): string => (cents === null ? "" : csvDecimal(cents / 100, 2));

export const reportFilename = (slug: string, today: string): string => `relatorio-${slug}-${today}.csv`;

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
