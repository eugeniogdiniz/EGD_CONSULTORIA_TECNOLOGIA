import type { CaseRow } from "./public";

/** Contrato estável da API pública (inglês, valores em centavos). Independe do formato do site. */
export function toApiCase(r: CaseRow) {
  return {
    slug: r.slug,
    name: r.name,
    sector: r.sector,
    size: r.size,
    systems: r.systems,
    automations: r.automations,
    savingsCents: r.savingsCents,
    capexCents: r.capexCents,
    featured: r.featured,
    deliverables: r.deliverables,
    statusNote: r.statusNote,
  };
}
