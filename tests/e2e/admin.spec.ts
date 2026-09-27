import { test, expect } from "@playwright/test";
import { loginAs, latestMailpitLink, ADMIN } from "./helpers";

test.describe.serial("admin", () => {
  const stamp = Date.now();
  const orgName = `Org E2E ${stamp}`;
  const clientEmail = `cliente${stamp}@test.local`;

  test("cria organização e convida usuário", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/organizacoes/nova");
    await page.getByLabel(/^nome$/i).fill(orgName);
    await page.getByRole("button", { name: /^salvar$/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: orgName })).toBeVisible();
    await page.getByLabel(/^e-mail$/i).fill(clientEmail);
    await page.getByRole("button", { name: /^convidar$/i }).click();
    await expect(page.getByText(clientEmail)).toBeVisible();
  });

  test("convidado aceita, vê só a própria organização; /admin dá 404", async ({ page }) => {
    const link = await latestMailpitLink(/\/convite\//, clientEmail);
    await page.goto(link);
    await page.getByLabel(/seu nome/i).fill("Cliente E2E");
    await page.getByLabel(/^senha$/i).fill("senha-cliente-forte-1");
    await page.getByRole("button", { name: /criar minha conta/i }).click();
    await expect(page).toHaveURL(/\/portal/);
    await expect(page.getByText(orgName).first()).toBeVisible();
    const res = await page.goto("/admin");
    expect(res?.status()).toBe(404);
  });

  test("lead do site aparece e pode ser marcado como visto", async ({ page }) => {
    await page.goto("/contato");
    await page.getByLabel(/^nome$/i).fill(`Lead ${stamp}`);
    await page.getByLabel(/e-mail/i).fill(`lead${stamp}@test.local`);
    await page.getByLabel(/mensagem/i).fill("Mensagem de teste para o admin marcar como visto.");
    await page.getByRole("button", { name: /enviar mensagem/i }).click();
    await expect(page.getByText(/recebemos sua mensagem/i)).toBeVisible();

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/leads?status=new");
    const row = page.getByRole("row").filter({ hasText: `Lead ${stamp}` });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /marcar como visto/i }).click();
    await expect(page.getByRole("row").filter({ hasText: `Lead ${stamp}` })).toHaveCount(0);
    await page.goto("/admin/leads?status=seen");
    await expect(page.getByRole("row").filter({ hasText: `Lead ${stamp}` })).toBeVisible();
  });

  test("upload de arquivo interno gera link de download assinado", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/arquivos");
    await page.setInputFiles('input[type="file"]', { name: `teste-${stamp}.txt`, mimeType: "text/plain", buffer: Buffer.from("ok") });
    await page.getByRole("button", { name: /^enviar$/i }).click();
    await expect(page.getByText(`teste-${stamp}.txt`)).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: `teste-${stamp}.txt` });
    const href = await row.getByRole("link", { name: /baixar/i }).getAttribute("href");
    expect(href).toMatch(/\/admin\/arquivos\/[0-9a-f-]+\/baixar$/);
    // o link abre um download (Content-Disposition: attachment); verificamos o redirect assinado direto
    const res = await page.request.get(href!, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toContain("X-Amz-Signature");
  });
});
