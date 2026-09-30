import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("ata: equipe registra a reunião, cria itens de ação e compartilha; cliente lê no portal", async ({ browser }) => {
  test.setTimeout(120_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const stamp = Date.now();
  const titulo = `Reunião de acompanhamento ${stamp}`;
  const itemVisivel = `Enviar cronograma revisado ${stamp}`;
  const itemInterno = `Revisar custos internos ${stamp}`;

  // ── equipe registra a ata a partir do projeto ─────────────────────────────
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await loginAs(admin, ADMIN.email, ADMIN.password);
  await admin.goto(`/admin/projetos/${fx.projectA.id}/atas`);
  await admin.getByRole("button", { name: /nova ata/i }).click();
  await admin.getByLabel(/^título$/i).fill(titulo);
  await admin.getByLabel(/^data e hora$/i).fill("2026-10-01T14:30");
  await admin.getByLabel(/^local/i).fill("Google Meet");
  await admin.getByLabel(/participantes externos/i).fill("Ana Souza — Cliente A");
  await admin.getByLabel(/^decisões/i).fill("Piloto em novembro.");
  await admin.getByRole("button", { name: /registrar ata/i }).click();
  await admin.waitForURL(/\/admin\/atas\/[0-9a-f-]+$/);
  const ataUrl = admin.url();
  const ataId = ataUrl.split("/").at(-1)!;
  await expect(admin.getByRole("heading", { name: titulo })).toBeVisible();
  await expect(admin.getByText("Ana Souza")).toBeVisible();

  // ── itens de ação viram entregas ──────────────────────────────────────────
  const form = admin.getByRole("form", { name: /novo item de ação/i });
  await form.getByLabel(/o que fazer/i).fill(itemVisivel);
  await form.getByLabel(/^prazo/i).fill("2030-12-20");
  await form.getByLabel(/^prioridade$/i).selectOption("high");
  await form.getByLabel(/visível ao cliente/i).check();
  await form.getByRole("button", { name: /adicionar item de ação/i }).click();
  await expect(admin.getByRole("row", { name: new RegExp(itemVisivel) })).toBeVisible({ timeout: 15_000 });

  await form.getByLabel(/o que fazer/i).fill(itemInterno);
  await form.getByRole("button", { name: /adicionar item de ação/i }).click();
  await expect(admin.getByRole("row", { name: new RegExp(itemInterno) })).toBeVisible({ timeout: 15_000 });

  // a entrega aponta a ata de origem
  await admin.getByRole("link", { name: itemVisivel }).click();
  await expect(admin.getByRole("link", { name: titulo })).toBeVisible();
  await admin.goto(ataUrl);

  // ── compartilha com o cliente ─────────────────────────────────────────────
  await admin.getByRole("button", { name: /compartilhar com o cliente/i }).click();
  await expect(admin.getByRole("button", { name: /deixar de compartilhar/i })).toBeVisible({ timeout: 15_000 });

  // ── cliente lê a ata, só com o item visível ───────────────────────────────
  const clientCtx = await browser.newContext();
  const client = await clientCtx.newPage();
  await loginAs(client, fx.clientA.email, fx.clientA.password);
  await client.goto("/portal/atas");
  await client.getByRole("link", { name: new RegExp(titulo) }).click();
  await expect(client).toHaveURL(new RegExp(`/portal/atas/${ataId}$`));
  await expect(client.getByText("Piloto em novembro.")).toBeVisible();
  await expect(client.getByText("Ana Souza")).toBeVisible();
  await expect(client.getByText(itemVisivel)).toBeVisible();
  await expect(client.getByText(itemInterno)).toHaveCount(0);

  // ── outra organização não enxerga ─────────────────────────────────────────
  const otherCtx = await browser.newContext();
  const other = await otherCtx.newPage();
  await loginAs(other, fx.clientB.email, fx.clientB.password);
  const res = await other.goto(`/portal/atas/${ataId}`);
  expect(res?.status()).toBe(404);

  await Promise.all([clientCtx.close(), adminCtx.close(), otherCtx.close()]);
});
