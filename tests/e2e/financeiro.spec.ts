import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("financeiro: parcelas, rate do projeto, estimativa, burndown e relatório de horas", async ({ page }) => {
  test.setTimeout(120_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const p = fx.projectA;
  await loginAs(page, ADMIN.email, ADMIN.password);

  // ── parcela: cria, aparece pendente, marca paga ──────────────────────────
  await page.goto(`/admin/projetos/${p.id}/financeiro`);
  await page.getByRole("button", { name: /nova parcela/i }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel(/descrição/i).fill("Entrada 40%");
  await dlg.getByLabel(/valor/i).fill("1.500,00");
  await dlg.getByLabel(/vencimento/i).fill("2030-01-31");
  await dlg.getByRole("button", { name: /criar parcela/i }).click();
  const row = page.getByTestId("parcela-1");
  await expect(row).toContainText("Entrada 40%", { timeout: 10_000 });
  await expect(row).toContainText("Pendente");
  await expect(row).toContainText("R$ 1.500,00");
  await row.getByRole("button", { name: /marcar paga/i }).click();
  await expect(page.getByTestId("parcela-1")).toContainText("Paga", { timeout: 10_000 });
  // a moeda usa espaço inseparável entre "R$" e o número
  await expect(page.getByText(/recebido R\$\s1\.500,00/)).toBeVisible();

  // ── rate do projeto ─────────────────────────────────────────────────────
  const rateInput = page.getByLabel(/rate de .* neste projeto/i).first();
  await rateInput.fill("25000");
  await rateInput.locator("xpath=ancestor::form").getByRole("button", { name: /^salvar$/i }).click();
  await expect(page.getByLabel(/rate de .* neste projeto/i).first()).toHaveValue("25000", { timeout: 10_000 });

  // ── estimativa na entrega e burndown ────────────────────────────────────
  await page.goto(`/admin/projetos/${p.id}/entregas/${p.visible.id}`);
  await page.getByRole("button", { name: /^editar$/i }).first().click();
  const edit = page.getByRole("dialog");
  await edit.getByLabel(/estimativa/i).fill("8");
  await edit.getByRole("button", { name: /^salvar$/i }).click();
  await expect(edit).toBeHidden({ timeout: 10_000 });
  await page.goto(`/admin/projetos/${p.id}/burndown`);
  await expect(page.getByRole("heading", { level: 1, name: /burndown/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /burndown do projeto/i })).toBeVisible();
  await expect(page.getByText(/8 h estimadas/)).toBeVisible();

  // ── relatório de horas e CSV ────────────────────────────────────────────
  await page.goto("/admin/relatorios/horas");
  await expect(page.getByRole("heading", { level: 1, name: /horas por pessoa/i })).toBeVisible();
  const csvHref = await page.getByRole("button", { name: /baixar csv/i }).getAttribute("href");
  const res = await page.request.get(csvHref!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(await res.text()).toContain("Pessoa;Projeto;Horas");
});
