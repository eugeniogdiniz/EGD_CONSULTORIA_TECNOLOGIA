import { test, expect } from "@playwright/test";

for (const path of ["/", "/servicos", "/produtos", "/sobre", "/contato", "/cases"]) {
  test(`página ${path} responde e tem h1`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
  });
}

test("formulário de contato valida e envia", async ({ page }) => {
  await page.goto("/contato");
  await page.getByRole("button", { name: /enviar mensagem/i }).click();
  await expect(page.getByText(/informe seu nome/i)).toBeVisible();
  await page.getByLabel(/^nome$/i).fill("Ana Teste");
  await page.getByLabel(/e-mail/i).fill(`ana.${Date.now()}@test.local`);
  await page.getByLabel(/mensagem/i).fill("Quero conversar sobre automação de relatórios de vistoria.");
  await page.getByRole("button", { name: /enviar mensagem/i }).click();
  // limite da spec: 3 envios por IP por hora. Em CI o servidor é novo; localmente reexecuções na mesma hora pulam.
  const sucesso = page.getByText(/recebemos sua mensagem/i);
  const limite = page.getByText(/várias mensagens deste endereço/i);
  await expect(sucesso.or(limite)).toBeVisible();
  test.skip(await limite.isVisible(), "limite de 3 envios por hora atingido nesta máquina");
  await expect(sucesso).toBeVisible();
});

test("página inexistente devolve 404 com o chrome do site", async ({ page }) => {
  const res = await page.goto("/nao-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /página não encontrada/i })).toBeVisible();
});
