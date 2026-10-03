import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";

test("operação: busca global, rastreio de erros e backup lógico", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  await loginAs(page, ADMIN.email, ADMIN.password);

  // busca pelo topo
  await page.goto("/admin/crm/empresas/nova");
  await page.getByLabel(/^nome$/i).fill(`Busca Global ${stamp}`);
  await page.getByRole("button", { name: /criar empresa/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Busca Global ${stamp}` })).toBeVisible();
  await page.getByRole("searchbox", { name: /buscar no sistema/i }).fill(`Global ${stamp}`);
  await page.getByRole("searchbox", { name: /buscar no sistema/i }).press("Enter");
  await expect(page).toHaveURL(/\/admin\/busca\?q=/);
  await expect(page.getByRole("heading", { name: "Empresas" })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`Busca Global ${stamp}`) })).toBeVisible();

  // erro de teste → aparece em /admin/erros → resolver
  const res = await page.request.get("/admin/erros/testar");
  expect(res.status()).toBe(500);
  await page.goto("/admin/erros");
  const row = page.getByText("Erro de teste do rastreio (Fase 20)").first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await page.locator("li", { hasText: "Erro de teste do rastreio (Fase 20)" }).first().getByRole("button", { name: /resolver/i }).click();
  await expect(page.getByText("Erro de teste do rastreio (Fase 20)")).toHaveCount(0, { timeout: 10_000 });
  await page.goto("/admin/erros?filtro=resolvidos");
  await expect(page.getByText("Erro de teste do rastreio (Fase 20)").first()).toBeVisible();

  // backup lógico: executar agora
  await page.goto("/admin/automacoes");
  await expect(page.getByTestId("job-backup-diario")).toBeVisible();
  await page.getByTestId("job-backup-diario").getByRole("button", { name: "Executar agora" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Executar agora" }).click();
  await expect(page.getByTestId("job-backup-diario")).toContainText(/tabelas · /, { timeout: 60_000 });
  await page.goto("/admin/automacoes/backup-diario/previa");
  await expect(page.getByRole("heading", { name: "O que seria alterado" })).toBeVisible();
});
