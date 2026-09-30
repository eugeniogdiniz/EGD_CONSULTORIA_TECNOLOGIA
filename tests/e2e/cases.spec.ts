import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";

test.describe.serial("cases", () => {
  const nome = `Cliente E2E ${Date.now()}`;

  test("admin cria um case; o site público continua sem /cases enquanto os cases estão ocultos", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/cases/novo");
    await page.getByLabel(/^cliente$/i).fill(nome);
    await page.getByLabel(/^setor$/i).fill("Setor de teste");
    await page.getByLabel(/^sistemas$/i).fill("2");
    await page.getByLabel(/^automações$/i).fill("3");
    await page.getByLabel(/economia anual/i).fill("1.500,00");
    await page.getByLabel(/^entregas/i).fill("Primeira entrega\nSegunda entrega");
    await page.getByRole("button", { name: /criar case/i }).click();
    await expect(page).toHaveURL(/\/admin\/cases\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { level: 1, name: nome })).toBeVisible();

    const res = await page.goto("/cases");
    expect(res?.status()).toBe(404);
  });

  test("despublicar marca como rascunho; excluir remove do admin", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/cases");
    const row = page.getByRole("row", { name: new RegExp(nome) });
    await row.getByRole("button", { name: /^despublicar$/i }).click();
    await expect(row.getByText(/rascunho/i)).toBeVisible({ timeout: 10_000 });


    await page.goto("/admin/cases");
    await page.getByRole("link", { name: nome }).click();
    await page.getByRole("button", { name: /^excluir$/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^excluir$/i }).click();
    await expect(page).toHaveURL(/\/admin\/cases$/);
    await expect(page.getByRole("link", { name: nome })).toHaveCount(0);
  });

  test("/admin/cases sem sessão redireciona para /entrar", async ({ request }) => {
    const res = await request.get("/admin/cases", { maxRedirects: 0, failOnStatusCode: false });
    expect([307, 302, 308]).toContain(res.status());
  });
});
