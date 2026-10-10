import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";
import { contractRoutes, proposalRoutes } from "./proposal-fixture";

/**
 * axe-core (WCAG 2.0/2.1 A e AA + boas práticas) em site, login, admin e portal.
 * Zero violações: uma regra nova só entra com correção ou com exceção justificada aqui.
 */
async function violations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
  return r.violations.map((v) => `[${v.impact}] ${v.id} ×${v.nodes.length} (${v.nodes[0]?.target.join(" ").slice(0, 80)})`);
}

async function check(page: Page, urls: string[]) {
  for (const url of urls) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    expect(await violations(page), `acessibilidade em ${url}`).toEqual([]);
  }
}

test("site e login sem violações de acessibilidade", async ({ page }) => {
  test.setTimeout(120_000);
  await check(page, ["/", "/servicos", "/produtos", "/consorcios", "/para", "/para/construtoras", "/artigos", "/sobre", "/sobre/eugenio-diniz", "/contato", "/produtos/vistorias", "/servicos/auto", "/servicos/bpo", "/servicos/consultoria", "/artigos/rdo-relatorio-diario-de-obra", "/entrar"]);
});

test("admin sem violações de acessibilidade", async ({ page }) => {
  test.setTimeout(240_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const p = fx.projectA;
  await loginAs(page, ADMIN.email, ADMIN.password);
  await check(page, [
    "/admin", "/admin/crm/funil", "/admin/crm/empresas", "/admin/leads", "/admin/organizacoes", "/admin/arquivos",
    "/admin/auditoria", "/admin/cases", "/admin/api", "/admin/solicitacoes", "/admin/demandas", "/admin/demandas?vista=quadro", "/admin/conta", "/admin/projetos",
    `/admin/projetos/${p.id}`, `/admin/projetos/${p.id}/kanban`, `/admin/projetos/${p.id}/gantt`,
    `/admin/projetos/${p.id}/calendario`, `/admin/projetos/${p.id}/financeiro`,
    `/admin/projetos/${p.id}/entregas/${p.visible.id}`, "/admin/projetos/templates",
    `/admin/projetos/${p.id}/atas`, "/admin/atas", "/admin/atas/nova",
    `/admin/projetos/${p.id}/relatorio`, "/admin/relatorios", "/admin/relatorios/semanal",
    "/admin/automacoes", "/admin/automacoes/resumo-diario/previa", "/admin/automacoes/propostas-expirar/previa",
    "/admin/notificacoes", "/admin/notificacoes?filtro=nao-lidas", "/admin/solicitacoes?sla=estourado", "/admin/solicitacoes?responsavel=eu",
    "/admin/automacoes/solicitacoes-lembrete/previa",
    ...(await proposalRoutes(page)), "/admin/crm/contratos", ...(await contractRoutes(page)), "/admin/equipe", "/admin/configuracoes", `/admin/projetos/${p.id}/burndown`, "/admin/relatorios/horas", "/admin/crm/servicos", "/admin/crm/previsao", "/admin/erros", "/admin/busca?q=projeto",
    "/admin/financeiro/receber", "/admin/financeiro/pagar", "/admin/financeiro/pagar?situacao=all&gerais=1",
  ]);
});

test("portal sem violações de acessibilidade", async ({ page }) => {
  test.setTimeout(180_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const p = fx.projectA;
  await loginAs(page, fx.clientA.email, fx.clientA.password);
  await check(page, [
    "/portal", "/portal/projetos", `/portal/projetos/${p.id}`, `/portal/projetos/${p.id}/gantt`,
    `/portal/projetos/${p.id}/calendario`, `/portal/projetos/${p.id}/entregas/${p.visible.id}`,
    "/portal/solicitacoes", "/portal/solicitacoes/nova", "/portal/atas", "/portal/conta",
    `/portal/projetos/${p.id}/relatorio`, "/portal/notificacoes", "/portal/propostas",
  ]);
});
