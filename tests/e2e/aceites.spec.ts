import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("proposta enviada aparece no portal e o cliente aceita; aprovação e ajustes de entrega", async ({ browser }) => {
  test.setTimeout(150_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const stamp = Date.now();

  // ── admin: proposta na oportunidade da empresa da org A (a fixture cria a empresa vinculada) ─
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await loginAs(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/admin/crm/funil?closed=1");
  await admin.getByRole("link", { name: new RegExp(`Op A ${fx.projectA.title.split(" ").at(-1)}`) }).first().click();
  await expect(admin).toHaveURL(/\/admin\/crm\/oportunidades\/[0-9a-f-]+$/);
  await admin.getByRole("button", { name: /nova proposta/i }).click();
  const dlg = admin.getByRole("dialog");
  await dlg.getByLabel(/^título$/i).fill(`Proposta portal ${stamp}`);
  await dlg.getByLabel(/valor/i).fill("1.234,00");
  await dlg.getByRole("button", { name: /criar rascunho/i }).click();
  await expect(admin).toHaveURL(/\/admin\/crm\/propostas\/[0-9a-f-]+$/);
  const proposalUrl = admin.url();
  await admin.getByRole("button", { name: "Gerar PDF" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Gerar PDF" }).click();
  await expect(admin.getByText("PDF v1")).toBeVisible({ timeout: 15_000 });
  await admin.getByRole("button", { name: /marcar como enviada/i }).click();
  await expect(admin.getByText("Enviada", { exact: true }).first()).toBeVisible({ timeout: 10_000 });

  // ── cliente A vê, baixa e aceita; cliente B não vê ────────────────────────
  const clientCtx = await browser.newContext();
  const client = await clientCtx.newPage();
  await loginAs(client, fx.clientA.email, fx.clientA.password);
  await client.getByRole("link", { name: /^propostas$/i }).click();
  await expect(client).toHaveURL(/\/portal\/propostas$/);
  await client.getByRole("link", { name: new RegExp(`Proposta portal ${stamp}`) }).click();
  await expect(client).toHaveURL(/\/portal\/propostas\/[0-9a-f-]+$/);
  await expect(client.getByRole("heading", { name: "Sua decisão" })).toBeVisible();
  const propId = client.url().split("/").at(-1)!;
  const dl = await client.request.post(`/portal/propostas/${propId}/baixar`, { maxRedirects: 0 });
  expect(dl.status()).toBe(303);
  expect(dl.headers()["location"]).toContain("X-Amz-Signature");
  const form = client.getByTestId("decisao-proposta");
  await form.getByLabel(/seu nome completo/i).fill("Cliente A da Silva");
  await form.getByLabel(/li a proposta/i).check();
  await form.getByRole("button", { name: /confirmar aceite/i }).click();
  await expect(client.getByRole("heading", { name: "Aceite registrado" })).toBeVisible({ timeout: 10_000 });
  await expect(client.getByText("Aceita", { exact: true }).first()).toBeVisible();

  const otherCtx = await browser.newContext();
  const other = await otherCtx.newPage();
  await loginAs(other, fx.clientB.email, fx.clientB.password);
  expect((await other.goto(`/portal/propostas/${propId}`))?.status()).toBe(404);

  // ── admin vê a evidência ─────────────────────────────────────────────────
  await admin.goto(proposalUrl);
  await expect(admin.getByText("Aceita", { exact: true }).first()).toBeVisible();
  await expect(admin.getByTestId("evidencia-aceite")).toContainText("Cliente A da Silva");
  await expect(admin.getByTestId("evidencia-aceite")).toContainText("v1");

  // ── entrega concluída (fixture: "Ata da reunião de kickoff", done e visível): pedir ajustes volta para a equipe ──
  const p = fx.projectA;
  await client.goto(`/portal/projetos/${p.id}`);
  await client.getByTestId("concluidas").getByRole("link", { name: /Ata da reunião de kickoff/ }).click();
  await expect(client).toHaveURL(/\/portal\/projetos\/[0-9a-f-]+\/entregas\/[0-9a-f-]+$/);
  const deliverableUrl = client.url();
  const acc = client.getByTestId("aprovacao-entrega");
  await expect(acc).toBeVisible();
  await acc.getByRole("button", { name: /pedir ajustes/i }).click();
  await acc.getByLabel(/o que precisa ser ajustado/i).fill("Falta a assinatura na última página.");
  await acc.getByRole("button", { name: /enviar pedido de ajustes/i }).click();
  await expect(client.getByTestId("ajustes-pedidos")).toBeVisible({ timeout: 10_000 });
  await expect(client.getByText("Em progresso").first()).toBeVisible();
  await admin.goto(deliverableUrl.replace("/portal/projetos/", "/admin/projetos/"));
  await expect(admin.getByTestId("aceite-cliente")).toContainText("Ajustes pedidos");
  await expect(admin.getByText("Falta a assinatura na última página.")).toBeVisible();

  await Promise.all([adminCtx.close(), clientCtx.close(), otherCtx.close()]);
});
