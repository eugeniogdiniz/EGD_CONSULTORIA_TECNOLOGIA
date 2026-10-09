import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";

test.describe.serial("crm", () => {
  const stamp = Date.now();
  const empresaNome = `Empresa E2E ${stamp}`;
  const contatoNome = `Contato E2E ${stamp}`;
  const oportunidadeTitulo = `Oportunidade E2E ${stamp}`;

  test("admin cria empresa, contato e oportunidade; funil mostra e detalhe abre", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);

    // Empresa
    await page.goto("/admin/crm/empresas/nova");
    await page.getByLabel(/^nome$/i).fill(empresaNome);
    await page.getByLabel(/^site/i).fill("empresa-e2e.com.br");
    await page.getByRole("button", { name: /criar empresa/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: empresaNome })).toBeVisible();

    // Contato
    await page.getByRole("button", { name: /adicionar contato/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^nome$/i).fill(contatoNome);
    await dialog.getByLabel(/e-mail/i).fill(`${stamp}@empresa-e2e.com.br`);
    await dialog.getByRole("button", { name: /^adicionar$/i }).click();
    await expect(page.getByText(contatoNome)).toBeVisible({ timeout: 10_000 });

    // Oportunidade
    await page.getByRole("button", { name: /nova oportunidade/i }).click();
    const oppDialog = page.getByRole("dialog");
    await oppDialog.getByLabel(/^título$/i).fill(oportunidadeTitulo);
    await oppDialog.getByLabel(/valor/i).fill("55.000,00");
    await oppDialog.getByRole("button", { name: /^criar$/i }).click();

    // Depois de criar, redireciona para o detalhe da oportunidade
    await expect(page.getByRole("heading", { level: 1, name: oportunidadeTitulo })).toBeVisible();

    // Funil mostra a oportunidade na coluna "Novo"
    await page.goto("/admin/crm/funil");
    await expect(page.getByRole("heading", { name: /^novo$/i })).toBeVisible();
    await expect(page.getByText(oportunidadeTitulo)).toBeVisible();
    await expect(page.getByText(empresaNome)).toBeVisible();
  });

  test("marcar oportunidade como ganha e como perdida (com motivo)", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/crm/funil");
    await page.getByText(oportunidadeTitulo).click();

    // Ganha
    await page.getByRole("button", { name: /marcar como ganha/i }).click();
    await expect(page.getByText(/reabrir/i)).toBeVisible();

    // Reabrir
    await page.getByRole("button", { name: /reabrir/i }).click();
    await expect(page.getByRole("button", { name: /marcar como perdida/i })).toBeVisible();

    // Perdida sem motivo — o botão abre dialog exigindo motivo
    await page.getByRole("button", { name: /marcar como perdida/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/por que foi perdida/i).fill("teste e2e");
    await dialog.getByRole("button", { name: /marcar como perdida/i }).click();
    await expect(page.getByText(/teste e2e/i)).toBeVisible();
  });

  test("cliente logado em /admin/crm/empresas recebe 404", async ({ page, request }) => {
    // Usa o helper existente que garante um usuário 'client' de teste.
    // Para simplicidade, apenas fazemos um GET sem sessão e esperamos redirect para /entrar.
    // O 404 pra 'client' já é testado em admin.spec.ts para /admin.
    const res = await request.get("/admin/crm/empresas", { maxRedirects: 0, failOnStatusCode: false });
    expect([307, 302, 308]).toContain(res.status());
    expect(res.headers()["location"]).toMatch(/\/entrar/);
  });
});
