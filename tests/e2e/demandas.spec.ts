import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("demanda: cliente pede, equipe prioriza e converte em entrega, cliente acompanha, backlog mostra priorizado", async ({ browser }) => {
  test.setTimeout(120_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const titulo = `Relatório mensal de custos ${Date.now()}`;

  // ── cliente abre a solicitação ────────────────────────────────────────────
  const clientCtx = await browser.newContext();
  const client = await clientCtx.newPage();
  await loginAs(client, fx.clientA.email, fx.clientA.password);
  await client.goto("/portal/solicitacoes/nova");
  await client.getByLabel(/^assunto$/i).fill(titulo);
  await client.getByLabel(/descreva sua solicitação/i).fill("Precisamos de um relatório mensal de custos por obra, com filtro por consórcio.");
  await client.getByRole("button", { name: /enviar solicitação/i }).click();
  await client.waitForURL(/solicitacoes\/[0-9a-f-]+$/);
  const requestUrl = client.url();

  // ── equipe: triagem + conversão ───────────────────────────────────────────
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await loginAs(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/admin/solicitacoes");
  await admin.getByRole("link", { name: new RegExp(titulo) }).click();

  await admin.getByLabel(/^prioridade$/i).first().selectOption("high");
  await admin.getByRole("button", { name: /^salvar$/i }).click();
  await expect(admin.getByText("Alta").first()).toBeVisible({ timeout: 10_000 });

  const convert = admin.getByRole("region", { name: /transformar em entrega/i }).or(admin.locator("section", { has: admin.getByRole("heading", { name: /transformar em entrega/i }) }));
  await convert.getByLabel(/^projeto$/i).selectOption({ label: fx.projectA.title });
  await convert.getByLabel(/^prazo/i).fill("2030-12-20");
  await convert.getByRole("button", { name: /converter em entrega/i }).click();
  await expect(admin.getByText(/já virou a entrega/i)).toBeVisible({ timeout: 15_000 });

  // ── cliente vê o vínculo e a mensagem ─────────────────────────────────────
  await client.goto(requestUrl);
  await expect(client.getByText(/sua solicitação virou a entrega/i)).toBeVisible();
  await expect(client.getByText(/Registramos sua solicitação como uma entrega/i)).toBeVisible();
  await client.getByRole("link", { name: titulo }).first().click();
  await expect(client).toHaveURL(/\/portal\/projetos\/[0-9a-f-]+\/entregas\/[0-9a-f-]+$/);

  // ── backlog: a demanda aparece priorizada; prioridade muda na própria linha ──
  await admin.goto("/admin/demandas");
  const row = admin.getByRole("row", { name: new RegExp(titulo) });
  await expect(row).toBeVisible();
  await expect(row.getByLabel("Prioridade")).toHaveValue("high");
  await row.getByLabel("Prioridade").selectOption("urgent");
  await expect(async () => {
    await admin.reload();
    await expect(admin.getByRole("row", { name: new RegExp(titulo) }).getByLabel("Prioridade")).toHaveValue("urgent");
  }).toPass({ timeout: 20_000 });

  // urgente vem antes das demais do fixture; o quadro mostra o mesmo cartão
  await admin.goto("/admin/demandas?prioridade=urgent");
  await expect(admin.getByRole("row", { name: new RegExp(titulo) })).toBeVisible();
  await admin.goto("/admin/demandas?vista=quadro");
  await expect(admin.locator('section[data-status="todo"]').getByText(titulo)).toBeVisible();

  await Promise.all([clientCtx.close(), adminCtx.close()]);
});
