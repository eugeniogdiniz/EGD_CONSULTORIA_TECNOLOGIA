/** Forma pública dos cases: o mesmo contrato que as páginas do site já consumiam. */

export type CaseSize = "micro" | "small" | "medium" | "large";

export const SIZE_LABEL: Record<CaseSize, string> = {
  micro: "Micro",
  small: "Pequeno",
  medium: "Médio",
  large: "Grande",
};

export type CaseRow = {
  slug: string;
  name: string;
  sector: string;
  size: CaseSize;
  systems: number;
  automations: number;
  savingsCents: number;
  capexCents: number;
  featured: boolean;
  deliverables: string[];
  statusNote: string | null;
};

export type PublicCase = {
  id: string;
  nome: string;
  setor: string;
  porte: string;
  sistemas: number;
  automacoes: number;
  economia: number;
  capex: number;
  destaque: boolean;
  entregas: string[];
  status?: string;
};

export function toPublicCase(r: CaseRow): PublicCase {
  return {
    id: r.slug,
    nome: r.name,
    setor: r.sector,
    porte: SIZE_LABEL[r.size],
    sistemas: r.systems,
    automacoes: r.automations,
    economia: r.savingsCents / 100,
    capex: r.capexCents / 100,
    destaque: r.featured,
    entregas: r.deliverables,
    status: r.statusNote ?? undefined,
  };
}

export function computeTotals(rows: readonly CaseRow[]) {
  return {
    clientes: rows.length,
    sistemas: rows.reduce((a, c) => a + c.systems, 0),
    automacoes: rows.reduce((a, c) => a + c.automations, 0),
    economia: rows.reduce((a, c) => a + c.savingsCents, 0) / 100,
  };
}

/** Uma entrega por linha do textarea. */
export function parseDeliverables(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** "1.234,56" → 123456. Vazio = 0. Texto inválido = NaN (a validação recusa). */
export function reaisToCents(raw: string): number {
  const t = raw.trim();
  if (t === "") return 0;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : Number.NaN;
}

export function centsToReais(cents: number): string {
  if (!cents) return "";
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
