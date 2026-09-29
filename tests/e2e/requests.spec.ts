import { test, expect } from "@playwright/test";
import { loginAs, waitForMailWithSubject, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("solicitação: cliente abre, equipe responde, cliente resolve; outra organização não vê", async ({ browser }) => {
  // fluxo longo: três sessões de login e dois e-mails
  test.setTimeout(60_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const titulo = `Acesso ao servidor ${Date.now()}`;

  // ── cliente abre a solicitação ───────────────────────────────────────────
  const clientCtx = await browser.newContext();
  const client = await clientCtx.newPage();
  await loginAs(client, fx.clientA.email, fx.clientA.password);
  await client.getByRole("link", { name: /^solicitações$/i }).click();
  await client.getByRole("button", { name: /nova solicitação|abrir a primeira/i }).first().click();
  await client.getByLabel(/^assunto$/i).fill(titulo);
  await client.getByLabel(/descreva sua solicitação/i).fill("Preciso de acesso ao servidor de arquivos da obra.");
  await client.getByRole("button", { name: /enviar solicitação/i }).click();
  await expect(client).toHaveURL(/\/portal\/solicitacoes\/[0-9a-f-]+$/);
  await expect(client.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
  await expect(client.getByText("Aberta").first()).toBeVisible();
  const url = client.url();

  const aviso = await waitForMailWithSubject(`Nova solicitação de ${fx.orgA.name}: ${titulo}`);
  expect(aviso).toContain("acesso ao servidor de arquivos");
  expect(aviso).toMatch(/\/admin\/solicitacoes\/[0-9a-f-]+/);

  // ── equipe responde ─────────────────────────────────────────────────────
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await loginAs(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/admin/solicitacoes");
  await admin.getByRole("link", { name: new RegExp(titulo) }).click();
  await admin.getByPlaceholder(/responder ao cliente/i).fill("Acesso liberado, pode testar.");
  await admin.getByRole("button", { name: /^responder$/i }).click();
  await expect(admin.getByText("Acesso liberado, pode testar.")).toBeVisible({ timeout: 10_000 });
  await expect(admin.getByText("Em andamento").first()).toBeVisible();

  const retorno = await waitForMailWithSubject(`A EGD respondeu sua solicitação: ${titulo}`);
  expect(retorno).toContain("Acesso liberado, pode testar.");
  expect(retorno).toContain("/portal/solicitacoes/");

  // ── cliente vê a resposta e resolve ─────────────────────────────────────
  await client.reload();
  await expect(client.getByText("Acesso liberado, pode testar.")).toBeVisible();
  await expect(client.getByText("Equipe EGD").first()).toBeVisible();
  await client.getByRole("button", { name: /marcar como resolvida/i }).click();
  await expect(client.getByText("Resolvida").first()).toBeVisible({ timeout: 10_000 });

  // ── cliente da outra organização recebe 404 ─────────────────────────────
  const otherCtx = await browser.newContext();
  const other = await otherCtx.newPage();
  await loginAs(other, fx.clientB.email, fx.clientB.password);
  expect((await other.goto(url))?.status()).toBe(404);
  await other.goto("/portal/solicitacoes");
  await expect(other.getByText(titulo)).toHaveCount(0);

  await Promise.all([clientCtx.close(), adminCtx.close(), otherCtx.close()]);
});

test("/admin/solicitacoes sem sessão redireciona para /entrar", async ({ request }) => {
  const res = await request.get("/admin/solicitacoes", { maxRedirects: 0, failOnStatusCode: false });
  expect([307, 302, 308]).toContain(res.status());
});
