import { test, expect } from "@playwright/test";
import { loginAs, waitForMailWithSubject, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("admin vê, liga/desliga, pré-visualiza e envia uma automação", async ({ page }) => {
  test.setTimeout(120_000);
  createTwoOrgsWithClientsAndFiles();
  await loginAs(page, ADMIN.email, ADMIN.password);

  await page.getByRole("link", { name: "Automações", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/automacoes$/);
  await expect(page.getByRole("heading", { level: 1, name: "Automações" })).toBeVisible();
  // dev e CI sobem com o agendador desligado; a tela diz isso em vez de fingir que roda
  await expect(page.getByRole("status")).toContainText(/agendador desligado/i);
  for (const key of ["propostas-expirar", "resumo-diario", "semanal-equipe", "semanal-cliente"]) {
    await expect(page.getByTestId(`job-${key}`)).toBeVisible();
  }

  // ── liga/desliga ──────────────────────────────────────────────────────────
  const sw = page.getByTestId("job-resumo-diario").getByRole("switch");
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await sw.click();
  await expect(page.getByTestId("job-resumo-diario").getByRole("switch")).toHaveAttribute("aria-checked", "false");
  await page.getByTestId("job-resumo-diario").getByRole("switch").click();
  await expect(page.getByTestId("job-resumo-diario").getByRole("switch")).toHaveAttribute("aria-checked", "true");

  // ── prévia do resumo diário: assunto e iframe isolado ─────────────────────
  await page.getByTestId("job-resumo-diario").getByRole("button", { name: "Prévia" }).click();
  await expect(page).toHaveURL(/\/admin\/automacoes\/resumo-diario\/previa$/);
  await expect(page.getByTestId("previa-assunto")).toContainText(/^Resumo de \d{2}\/\d{2}:/);
  await expect(page.getByTestId("previa-iframe")).toHaveAttribute("src", /\/admin\/automacoes\/resumo-diario\/previa\/html$/);
  await expect(page.frameLocator("[data-testid=previa-iframe]").getByRole("heading", { level: 1 })).toContainText(/^Resumo de /);
  await expect(page.getByText("Nada foi enviado nem alterado.")).toBeVisible();

  // ── prévia de expirar propostas: tabela, não e-mail ───────────────────────
  await page.goto("/admin/automacoes/propostas-expirar/previa");
  await expect(page.getByRole("heading", { name: "O que seria alterado" })).toBeVisible();

  // ── enviar agora o semanal da equipe: chega no Mailpit e entra no histórico ─
  await page.goto("/admin/automacoes");
  await page.getByTestId("job-semanal-equipe").getByRole("button", { name: "Enviar agora" }).click();
  await expect(page.getByRole("dialog")).toContainText(/vai de verdade/i);
  await page.getByRole("dialog").getByRole("button", { name: "Enviar agora" }).click();
  await expect(page.getByTestId("job-semanal-equipe")).toContainText(/1 e-mail enviado/);
  const text = await waitForMailWithSubject("Semana 20");
  expect(text).toContain("Abrir no sistema");
  await expect(page.getByRole("heading", { name: "Histórico" })).toBeVisible();
  await expect(page.getByText(/manual · /).first()).toBeVisible();
});

test("cliente liga o resumo semanal e o admin vê a organização na prévia", async ({ page }) => {
  test.setTimeout(120_000);
  const fx = createTwoOrgsWithClientsAndFiles();

  await loginAs(page, fx.clientA.email, fx.clientA.password);
  await page.goto("/portal/conta");
  await expect(page.getByRole("heading", { name: "Resumo semanal por e-mail" })).toBeVisible();
  await page.getByRole("button", { name: "Ligar resumo semanal" }).click();
  await expect(page.getByRole("button", { name: "Desligar resumo semanal" })).toBeVisible();

  await page.context().clearCookies();
  await loginAs(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/automacoes/semanal-cliente/previa");
  const select = page.getByLabel("Organização");
  await expect(select).toBeVisible();
  await expect(select.locator("option", { hasText: fx.orgA.name })).toHaveCount(1);
  await expect(select.locator("option", { hasText: fx.orgB.name })).toHaveCount(0);
  await select.selectOption({ label: `${fx.orgA.name} (1)` });
  await page.getByRole("button", { name: "Ver" }).click();
  await expect(page.getByTestId("previa-assunto")).toContainText(/^Andamento dos seus projetos/);
  await expect(page.locator("dd.type-data")).toContainText(fx.clientA.email);

  // a organização também aparece na tela de organizações, com a caixa marcada
  await page.goto(`/admin/organizacoes/${fx.orgA.id}`);
  await expect(page.getByLabel(/Resumo semanal por e-mail/)).toBeChecked();
});
