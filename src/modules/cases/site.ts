import { unstable_cache } from "next/cache";
import { computeTotals, toPublicCase } from "./public";
import { listPublishedCaseRows } from "./queries";

export const SITE_CASES_TAG = "site-cases";

/**
 * Cases e totais para as páginas públicas (/, /sobre, /cases), em cache de dados:
 * uma consulta serve todas as visitas. As ações do admin chamam `updateTag(SITE_CASES_TAG)`
 * (mudança aparece na hora); o TTL de 1 h cobre alterações feitas direto no banco.
 * Fora do runtime do Next (testes), use `listPublishedCaseRows`, sem cache.
 */
export const getSiteCases = unstable_cache(
  async () => {
    const rows = await listPublishedCaseRows();
    return { cases: rows.map(toPublicCase), totals: computeTotals(rows) };
  },
  ["site-cases"],
  { tags: [SITE_CASES_TAG], revalidate: 3600 },
);
