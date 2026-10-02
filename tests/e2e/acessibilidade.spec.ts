import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

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
  await check(page, ["/", "/servicos", "/produtos", "/sobre", "/contato", "/entrar"]);
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
    `/portal/projetos/${p.id}/relatorio`,
  ]);
});
