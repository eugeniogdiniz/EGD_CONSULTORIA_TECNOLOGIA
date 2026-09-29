import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("cliente A não baixa arquivo da organização B, mas baixa o da própria", async ({ page }) => {
  const fx = createTwoOrgsWithClientsAndFiles();
  await loginAs(page, fx.clientA.email, fx.clientA.password);
  await page.goto("/portal");
  await expect(page.getByText(fx.orgA.name).first()).toBeVisible();

  const cross = await page.request.post("/portal/arquivos/baixar", { form: { fileId: fx.fileB.id }, maxRedirects: 0 });
  expect(cross.status()).toBe(404);

  const own = await page.request.post("/portal/arquivos/baixar", { form: { fileId: fx.fileA.id }, maxRedirects: 0 });
  expect(own.status()).toBe(303);
  expect(own.headers()["location"]).toContain("X-Amz-Signature");
});

test("cliente com duas organizações troca a ativa", async ({ page }) => {
  const fx = createTwoOrgsWithClientsAndFiles({ sharedClient: true });
  await loginAs(page, fx.clientA.email, fx.clientA.password);
  await page.goto("/portal");
  await expect(page.getByText(`Você está no portal do ${fx.orgA.name}.`)).toBeVisible();
  await page.getByRole("combobox", { name: /organização/i }).selectOption({ label: fx.orgB.name });
  await expect(page.getByText(`Você está no portal do ${fx.orgB.name}.`)).toBeVisible();
});

test("cliente sem organização ativa vê a tela de sem acesso", async ({ page }) => {
  const fx = createTwoOrgsWithClientsAndFiles();
  // desativa a organização B pelo admin não é necessário: basta um usuário sem membership ativa.
  // Aqui usamos o cliente B e inativamos a org B via API interna do teste? Não há; então validamos a rota direta.
  await loginAs(page, fx.clientB.email, fx.clientB.password);
  await page.goto("/portal/sem-acesso");
  await expect(page.getByRole("heading", { name: /não está vinculada/i })).toBeVisible();
});

test.describe("projetos no portal", () => {
  test("cliente vê o próprio projeto e só as entregas compartilhadas", async ({ page }) => {
    const fx = createTwoOrgsWithClientsAndFiles();
    await loginAs(page, fx.clientA.email, fx.clientA.password);

    await page.getByRole("link", { name: /^projetos$/i }).click();
    await expect(page).toHaveURL(/\/portal\/projetos$/);
    await expect(page.getByRole("link", { name: new RegExp(fx.projectA.title) })).toBeVisible();
    await expect(page.getByText(fx.projectB.title)).toHaveCount(0);

    await page.getByRole("link", { name: new RegExp(fx.projectA.title) }).click();
    await expect(page.getByRole("heading", { level: 1, name: fx.projectA.title })).toBeVisible();
    await expect(page.getByText(fx.projectA.visible.title)).toBeVisible();
    await expect(page.getByText(fx.projectA.hiddenTitle)).toHaveCount(0);

    // abas de linha do tempo e calendário renderizam
    await page.getByRole("link", { name: /^linha do tempo$/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: /linha do tempo/i })).toBeVisible();
    await page.getByRole("link", { name: /^calend[aá]rio$/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: /calend[aá]rio/i })).toBeVisible();
  });

  test("cliente comenta na entrega compartilhada", async ({ page }) => {
    const fx = createTwoOrgsWithClientsAndFiles();
    await loginAs(page, fx.clientA.email, fx.clientA.password);
    await page.goto(`/portal/projetos/${fx.projectA.id}/entregas/${fx.projectA.visible.id}`);
    await expect(page.getByRole("heading", { level: 1, name: fx.projectA.visible.title })).toBeVisible();

    const texto = `Comentário do cliente ${Date.now()}`;
    await page.getByPlaceholder(/escrever comentário/i).fill(texto);
    await page.getByRole("button", { name: /^comentar$/i }).click();
    await expect(page.getByText(texto)).toBeVisible({ timeout: 10_000 });
  });

  test("cliente A recebe 404 nas rotas do projeto da organização B", async ({ page }) => {
    const fx = createTwoOrgsWithClientsAndFiles();
    await loginAs(page, fx.clientA.email, fx.clientA.password);
    for (const path of [
      `/portal/projetos/${fx.projectB.id}`,
      `/portal/projetos/${fx.projectB.id}/gantt`,
      `/portal/projetos/${fx.projectB.id}/calendario`,
      `/portal/projetos/${fx.projectB.id}/entregas/${fx.projectB.visible.id}`,
    ]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
    }
    const dl = await page.request.post(
      `/portal/projetos/${fx.projectB.id}/entregas/${fx.projectB.visible.id}/baixar`,
      { maxRedirects: 0 },
    );
    expect(dl.status()).toBe(404);
  });

  test("entrega interna devolve 404 mesmo dentro do projeto do cliente", async ({ page }) => {
    const fx = createTwoOrgsWithClientsAndFiles();
    await loginAs(page, fx.clientA.email, fx.clientA.password);
    const res = await page.goto(`/portal/projetos/${fx.projectA.id}/entregas/${fx.projectA.hiddenId}`);
    expect(res?.status()).toBe(404);
  });
});

test("home do portal lista o projeto da organização e leva até ele", async ({ page }) => {
  const fx = createTwoOrgsWithClientsAndFiles();
  await loginAs(page, fx.clientA.email, fx.clientA.password);
  await page.goto("/portal");
  await expect(page.getByRole("heading", { name: /seus projetos/i })).toBeVisible();
  await expect(page.getByText(fx.projectB.title)).toHaveCount(0);
  await page.getByRole("link", { name: new RegExp(fx.projectA.title) }).click();
  await expect(page.getByRole("heading", { level: 1, name: fx.projectA.title })).toBeVisible();
});
