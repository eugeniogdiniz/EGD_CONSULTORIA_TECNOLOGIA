import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";
import { contractRoutes, proposalRoutes } from "./proposal-fixture";

/**
 * O Next mostra o selo "Issues" quando o console tem erro ou aviso. Aqui viram falha de teste:
 * já pegou diálogos com gatilho inválido (span no lugar de botão) em todas as telas com diálogo.
 */
function collect(page: import("@playwright/test").Page) {
  const messages: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") messages.push(`[${m.type()}] ${m.text().replace(/\s+/g, " ").slice(0, 240)}`);
  });
  page.on("pageerror", (e) => messages.push(`[pageerror] ${String(e).slice(0, 240)}`));
  return messages;
}

test("telas do admin não geram erro nem aviso no console", async ({ page }) => {
  test.setTimeout(180_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const p = fx.projectA;
  const messages = collect(page);
  await loginAs(page, ADMIN.email, ADMIN.password);
  messages.length = 0; // a tela de login não conta
  const urls = [
    "/admin",
    `/admin/projetos/${p.id}`,
    `/admin/projetos/${p.id}/kanban`,
    `/admin/projetos/${p.id}/gantt`,
    `/admin/projetos/${p.id}/calendario`,
    `/admin/projetos/${p.id}/financeiro`,
    `/admin/projetos/${p.id}/entregas/${p.visible.id}`,
    "/admin/projetos/templates",
    "/admin/crm/funil",
    "/admin/crm/empresas",
    "/admin/leads",
    "/admin/cases",
    "/admin/api",
    "/admin/solicitacoes",
    "/admin/demandas",
    "/admin/demandas?vista=quadro",
    "/admin/atas",
    "/admin/atas/nova",
    `/admin/projetos/${p.id}/atas`,
    `/admin/projetos/${p.id}/relatorio`,
    "/admin/relatorios",
    "/admin/relatorios/semanal",
    "/admin/automacoes",
    "/admin/automacoes/resumo-diario/previa",
    "/admin/conta",
    "/admin/notificacoes",
    "/admin/solicitacoes?sla=estourado",
    "/admin/automacoes/solicitacoes-lembrete/previa",
    ...(await proposalRoutes(page)), "/admin/crm/contratos", ...(await contractRoutes(page)),
    "/admin/equipe",
    "/admin/configuracoes",
    `/admin/projetos/${p.id}/burndown`,
    "/admin/relatorios/horas",
    "/admin/crm/servicos",
    "/admin/crm/previsao",
    "/admin/erros",
    "/admin/busca?q=projeto",
  ];
  for (const url of urls) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    expect(messages, `console em ${url}`).toEqual([]);
  }
});

test("telas do portal não geram erro nem aviso no console", async ({ page }) => {
  test.setTimeout(120_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const p = fx.projectA;
  const messages = collect(page);
  await loginAs(page, fx.clientA.email, fx.clientA.password);
  messages.length = 0;
  for (const url of [
    "/portal",
    "/portal/projetos",
    `/portal/projetos/${p.id}`,
    `/portal/projetos/${p.id}/gantt`,
    `/portal/projetos/${p.id}/calendario`,
    `/portal/projetos/${p.id}/entregas/${p.visible.id}`,
    "/portal/solicitacoes",
    "/portal/solicitacoes/nova",
    "/portal/atas",
    `/portal/projetos/${p.id}/relatorio`,
    "/portal/conta",
    "/portal/notificacoes",
    "/portal/propostas",
  ]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    expect(messages, `console em ${url}`).toEqual([]);
  }
});
