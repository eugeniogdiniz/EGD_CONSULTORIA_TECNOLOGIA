import { test, expect } from "@playwright/test";

for (const path of ["/", "/servicos", "/produtos", "/consorcios", "/para", "/para/incorporadoras", "/artigos", "/sobre", "/contato", "/produtos/contratos", "/servicos/ia", "/artigos/checklist-de-vistoria-de-obra"]) {
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
  await page.getByLabel(/conta o desafio/i).fill("Quero conversar sobre automação de relatórios de vistoria.");
  await page.getByRole("button", { name: /enviar mensagem/i }).click();
  // limite da spec: 3 envios por IP por hora. Em CI o servidor é novo; localmente reexecuções na mesma hora pulam.
  const sucesso = page.getByText(/mensagem recebida/i);
  const limite = page.getByText(/várias mensagens deste endereço/i);
  // a action manda e-mail à equipe e notifica cada admin: em dev pode passar de 5 s
  await expect(sucesso.or(limite)).toBeVisible({ timeout: 15_000 });
  test.skip(await limite.isVisible(), "limite de 3 envios por hora atingido nesta máquina");
  await expect(sucesso).toBeVisible();
});

test("produto, serviço e artigo inexistentes devolvem 404", async ({ page }) => {
  for (const path of ["/produtos/nao-existe", "/servicos/nao-existe", "/artigos/nao-existe", "/para/nao-existe"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
});

test("página inexistente devolve 404 com o chrome do site", async ({ page }) => {
  const res = await page.goto("/nao-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /página não encontrada/i })).toBeVisible();
});

test("cases ocultos no site: /cases responde 404 e nenhum link público aponta para ele", async ({ page }) => {
  const res = await page.goto("/cases");
  expect(res?.status()).toBe(404);
  for (const path of ["/", "/sobre", "/produtos"]) {
    await page.goto(path);
    await expect(page.locator('a[href="/cases"]')).toHaveCount(0);
  }
  await page.goto("/");
  await expect(page.getByText(/clientes no portfólio/i)).toHaveCount(0);
  await expect(page.getByText(/conheça os cases/i)).toHaveCount(0);
});
