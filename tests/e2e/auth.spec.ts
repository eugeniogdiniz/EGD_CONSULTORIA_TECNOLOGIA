import { test, expect } from "@playwright/test";
import { loginAs, openLogin, latestMailpitLink, ADMIN } from "./helpers";

test("login inválido mostra erro e não redireciona", async ({ page }) => {
  await openLogin(page);
  await page.getByLabel(/e-mail/i).fill(ADMIN.email);
  await page.getByLabel(/^senha$/i).fill("senha-errada-123");
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page.locator("form [role=alert]")).toContainText(/e-mail ou senha/i);
  expect(page.url()).toContain("/entrar");
});

test("admin entra e cai no /admin; /entrar com sessão redireciona", async ({ page }) => {
  await loginAs(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/entrar");
  await expect(page).not.toHaveURL(/\/entrar/);
});

test("recuperação de senha envia e-mail e redefine", async ({ page }) => {
  await page.goto("/recuperar-senha");
  await page.getByLabel(/e-mail/i).fill(ADMIN.email);
  await page.getByRole("button", { name: /enviar link/i }).click();
  await expect(page.locator("main [role=status]")).toContainText(/se o e-mail existir/i);
  const link = await latestMailpitLink(/reset-password/, ADMIN.email);
  await page.goto(link);
  await expect(page).toHaveURL(/\/redefinir-senha\?token=/);
  // mantém a mesma senha para não quebrar os outros testes
  await page.getByLabel(/^nova senha$/i).fill(ADMIN.password);
  await page.getByLabel(/confirmar nova senha/i).fill(ADMIN.password);
  await page.getByRole("button", { name: /salvar nova senha/i }).click();
  await expect(page).toHaveURL(/\/entrar\?senha=redefinida/);
  await expect(page.locator("main [role=status]")).toContainText(/senha redefinida/i);
});

test("link de redefinição inválido mostra aviso", async ({ page }) => {
  await page.goto("/redefinir-senha?error=INVALID_TOKEN");
  await expect(page.getByRole("heading", { name: /não é mais válido/i })).toBeVisible();
});

test("convite inválido mostra aviso", async ({ page }) => {
  await page.goto("/convite/token-que-nao-existe-1234567890");
  await expect(page.getByRole("heading", { name: /não é válido ou já expirou/i })).toBeVisible();
});
