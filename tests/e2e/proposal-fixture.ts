import type { Page } from "@playwright/test";

/**
 * Rotas do documento da proposta para as verificações de acessibilidade e
 * console: pega a primeira proposta listada no admin (as fixtures e os outros
 * specs criam propostas; sem nenhuma, devolve lista vazia).
 */
export async function proposalRoutes(page: Page): Promise<string[]> {
  const res = await page.request.get("/admin/crm/propostas");
  const html = await res.text();
  const m = html.match(/\/admin\/crm\/propostas\/([0-9a-f-]{36})/);
  return m ? [`/admin/crm/propostas/${m[1]}`, `/admin/crm/propostas/${m[1]}/documento`] : [];
}

/** Primeiro contrato listado no admin (o spec de contratos cria um); sem nenhum, lista vazia. */
export async function contractRoutes(page: Page): Promise<string[]> {
  const res = await page.request.get("/admin/crm/contratos");
  const m = (await res.text()).match(/\/admin\/crm\/contratos\/([0-9a-f-]{36})/);
  return m ? [`/admin/crm/contratos/${m[1]}`] : [];
}
