import { test, expect, type Page } from "@playwright/test";
import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { loginAs, openLogin } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

/** A tela mostra a chave em base32 (como o app autenticador a lê); o gerador usa o segredo cru. */
const totp = (secretB32: string) => createOTP(new TextDecoder().decode(base32.decode(secretB32))).totp();

async function passwordStep(page: Page, email: string, password: string) {
  await openLogin(page);
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha$/i).fill(password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page.getByRole("heading", { name: /verificação em duas etapas/i })).toBeVisible();
}

test("2FA: ativar na conta, login exige o código, código errado falha, recuperação vale uma vez", async ({ browser }) => {
  test.setTimeout(90_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const { email, password } = fx.clientA;

  // ── ativar ──────────────────────────────────────────────────────────────
  const ctx1 = await browser.newContext();
  const page = await ctx1.newPage();
  await loginAs(page, email, password);
  await page.goto("/portal/conta");
  await page.getByLabel(/confirme com sua senha/i).fill(password);
  await page.getByRole("button", { name: /^ativar$/i }).click();

  await expect(page.getByAltText(/qr code/i)).toBeVisible({ timeout: 15_000 });
  const secret = ((await page.locator("code").first().textContent()) ?? "").trim();
  expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
  const backup = (await page.getByRole("list", { name: /códigos de recuperação/i }).locator("li").allTextContents()).map((s) => s.trim());
  expect(backup).toHaveLength(10);

  await page.getByLabel(/digite o código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /confirmar e ativar/i }).click();
  await expect(page.getByRole("alert").filter({ hasText: /código inválido/i })).toBeVisible();

  await page.getByLabel(/digite o código de 6 dígitos/i).fill(await totp(secret));
  await page.getByRole("button", { name: /confirmar e ativar/i }).click();
  await expect(page.getByText(/ativada/i).first()).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByRole("button", { name: /^desativar$/i })).toBeVisible();

  // O Better Auth limita verificações de TOTP por janela curta (defesa contra força bruta):
  // espera a janela do enrollment passar para o teste refletir uso normal.
  await page.waitForTimeout(10_500);

  // ── novo login: senha certa NÃO basta ───────────────────────────────────
  const ctx2 = await browser.newContext();
  const other = await ctx2.newPage();
  await passwordStep(other, email, password);
  expect((await other.goto("/portal"))?.url()).toMatch(/\/entrar/); // sem sessão até o segundo fator

  await passwordStep(other, email, password);
  await other.getByLabel(/^código$/i).fill("123456");
  await other.getByRole("button", { name: /^verificar$/i }).click();
  await expect(other.getByRole("alert").filter({ hasText: /código inválido/i })).toBeVisible();

  await other.getByLabel(/^código$/i).fill(await totp(secret));
  await other.getByRole("button", { name: /^verificar$/i }).click();
  await expect(other).toHaveURL(/\/portal/, { timeout: 15_000 });

  // ── código de recuperação: entra uma vez, não repete ────────────────────
  const ctx3 = await browser.newContext();
  const rec = await ctx3.newPage();
  await passwordStep(rec, email, password);
  await rec.getByRole("button", { name: /usar um código de recuperação/i }).click();
  await rec.getByLabel(/código de recuperação/i).fill(backup[0]);
  await rec.getByRole("button", { name: /^verificar$/i }).click();
  await expect(rec).toHaveURL(/\/portal/, { timeout: 15_000 });

  const ctx4 = await browser.newContext();
  const reuse = await ctx4.newPage();
  await passwordStep(reuse, email, password);
  await reuse.getByRole("button", { name: /usar um código de recuperação/i }).click();
  await reuse.getByLabel(/código de recuperação/i).fill(backup[0]);
  await reuse.getByRole("button", { name: /^verificar$/i }).click();
  await expect(reuse.getByRole("alert").filter({ hasText: /código inválido/i })).toBeVisible();

  await Promise.all([ctx1.close(), ctx2.close(), ctx3.close(), ctx4.close()]);
});
