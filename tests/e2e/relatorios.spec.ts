import { test, expect } from "@playwright/test";
import { loginAs, ADMIN, openMenuGroup } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("relatórios do admin: status, portfólio, semanal e CSVs", async ({ page }) => {
  test.setTimeout(120_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  await loginAs(page, ADMIN.email, ADMIN.password);

  // ── status do projeto, pela aba do projeto ────────────────────────────────
  await page.goto(`/admin/projetos/${fx.projectA.id}`);
  await page.getByRole("link", { name: "Relatório", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: fx.projectA.title })).toBeVisible();
  await expect(page.getByRole("heading", { name: /progresso por fase/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /horas e custo/i })).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /baixar csv/i }).click()]);
  expect(download.suggestedFilename()).toMatch(/^relatorio-.+-\d{4}-\d{2}-\d{2}\.csv$/);
  // o CSV interno lista todas as entregas, inclusive as não visíveis ao cliente
  const csv = await (await page.request.get(`/admin/projetos/${fx.projectA.id}/relatorio/csv`)).text();
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain("Fase;Entrega;Status;Prioridade");
  expect(csv).toContain(fx.projectA.hiddenTitle);

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("link", { name: /baixar csv/i })).toBeHidden();
  await page.emulateMedia({ media: "screen" });

  // ── portfólio ─────────────────────────────────────────────────────────────
  await openMenuGroup(page, "Relatórios");
  await page.getByRole("link", { name: "Portfólio", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/relatorios$/);
  await expect(page.getByRole("link", { name: fx.projectA.title })).toBeVisible();
  const portfolio = await page.request.get("/admin/relatorios/csv");
  expect(portfolio.headers()["content-type"]).toContain("text/csv");
  expect(await portfolio.text()).toContain(fx.projectA.title);

  // ── semanal: navegar e voltar para a semana atual ─────────────────────────
  await openMenuGroup(page, "Relatórios");
  await page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "Semanal" }).click();
  const rotulo = page.getByTestId("semana-rotulo");
  const atual = (await rotulo.textContent()) ?? "";
  await page.getByRole("link", { name: /semana anterior/i }).click();
  await expect(rotulo).not.toHaveText(atual);
  await page.getByRole("link", { name: /esta semana/i }).click();
  await expect(rotulo).toHaveText(atual);
  const semanal = await page.request.get("/admin/relatorios/semanal/csv?semana=qualquer-coisa");
  expect(semanal.status()).toBe(200);
  expect(semanal.headers()["content-disposition"]).toMatch(/relatorio-semanal-\d{4}-S\d{2}\.csv/);
});

test("relatório do cliente: sem valores nem entrega interna; outra organização recebe 404", async ({ browser }) => {
  test.setTimeout(120_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await loginAs(page, fx.clientA.email, fx.clientA.password);
  await page.goto(`/portal/projetos/${fx.projectA.id}`);
  await page.getByRole("link", { name: "Relatório", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: fx.projectA.title })).toBeVisible();
  await expect(page.getByText(fx.projectA.visible.title)).toBeVisible();
  await expect(page.getByText(fx.projectA.hiddenTitle)).toHaveCount(0);
  await expect(page.getByText(/R\$/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /horas dedicadas/i })).toHaveCount(0); // chave desligada por padrão
  await expect(page.getByText("Em espera").first()).toBeVisible(); // a fixture tem uma entrega bloqueada visível

  const res = await page.request.get(`/portal/projetos/${fx.projectA.id}/relatorio/csv`);
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain(fx.projectA.visible.title);
  expect(body).not.toContain(fx.projectA.hiddenTitle);
  expect(body).not.toMatch(/R\$|Custo|Horas/);

  const other = await browser.newContext();
  const op = await other.newPage();
  await loginAs(op, fx.clientB.email, fx.clientB.password);
  expect((await op.goto(`/portal/projetos/${fx.projectA.id}/relatorio`))?.status()).toBe(404);
  expect((await op.request.get(`/portal/projetos/${fx.projectA.id}/relatorio/csv`)).status()).toBe(404);
  await Promise.all([ctx.close(), other.close()]);
});
