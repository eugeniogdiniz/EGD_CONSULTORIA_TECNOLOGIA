import { test, expect } from "@playwright/test";
import { loginAs, waitForMailWithSubject, ADMIN } from "./helpers";

test("proposta: escrever o documento, gerar o PDF e enviar por e-mail ao contato", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const empresa = `Horizonte ${stamp}`;
  const contato = `Marina ${stamp}`;
  const proposta = `Integração ERP ${stamp}`;
  await loginAs(page, ADMIN.email, ADMIN.password);

  // empresa, contato com e-mail e oportunidade (mesmo fluxo do crm.spec)
  await page.goto("/admin/crm/empresas/nova");
  await page.getByLabel(/^nome$/i).fill(empresa);
  await page.getByRole("button", { name: /criar empresa/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: empresa })).toBeVisible();
  await page.getByRole("button", { name: /adicionar contato/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^nome$/i).fill(contato);
  await dialog.getByLabel(/e-mail/i).fill(`marina-${stamp}@horizonte.test`);
  await dialog.getByRole("button", { name: /^adicionar$/i }).click();
  await expect(page.getByText(contato)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /nova oportunidade/i }).click();
  const oppDialog = page.getByRole("dialog");
  await oppDialog.getByLabel(/^título$/i).fill(`Op ${stamp}`);
  await oppDialog.getByRole("button", { name: /^criar$/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Op ${stamp}` })).toBeVisible();

  // proposta em rascunho
  await page.getByRole("button", { name: /nova proposta/i }).click();
  const pDialog = page.getByRole("dialog");
  await pDialog.getByLabel(/^título$/i).fill(proposta);
  await pDialog.getByLabel(/valor/i).fill("4850000");
  await pDialog.getByRole("button", { name: /criar rascunho/i }).click();
  await expect(page).toHaveURL(/\/admin\/crm\/propostas\/[0-9a-f-]+$/);
  const proposalUrl = page.url();
  await expect(page.getByRole("heading", { name: "Documento" })).toBeVisible();
  await expect(page.getByText("nenhum PDF gerado")).toBeVisible();

  // documento
  await page.getByRole("button", { name: "Editar documento" }).click(); // Button+Link = role=button
  await expect(page).toHaveURL(/\/documento$/);
  await page.getByLabel("Contexto").fill("A equipe de obras controla custos em planilhas separadas por canteiro.");
  await page.getByRole("button", { name: "Adicionar entrega" }).click();
  await page.getByLabel("Entregável").last().fill("Conector ERP");
  await page.getByLabel("Critério de aceite").last().fill("Lançamentos visíveis em D+1");
  await page.getByRole("button", { name: "Salvar documento" }).click();
  await expect(page.getByRole("status")).toContainText("Documento salvo", { timeout: 10_000 });

  // prévia responde PDF
  const pdfRes = await page.request.get(`${proposalUrl}/documento/pdf`);
  expect(pdfRes.status()).toBe(200);
  expect(pdfRes.headers()["content-type"]).toContain("application/pdf");
  expect((await pdfRes.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // gerar PDF: vira anexo v1
  await page.goto(proposalUrl);
  await page.getByRole("button", { name: "Gerar PDF" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Gerar PDF" }).click();
  await expect(page.getByText("PDF v1")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/PROP-\d{2}-\d{3,}-v1\.pdf/)).toBeVisible();

  // enviar por e-mail: status Enviada e e-mail no Mailpit
  await page.getByRole("button", { name: "Enviar por e-mail" }).click();
  const sendDialog = page.getByRole("dialog");
  await expect(sendDialog.getByLabel("Para")).toContainText(contato);
  await sendDialog.getByRole("button", { name: "Enviar agora" }).click();
  await expect(page.getByText("Enviada", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  const mail = await waitForMailWithSubject(proposta);
  expect(mail).toContain("segue a proposta");
  await expect(page.getByText(/Enviada por e-mail em/)).toBeVisible();

  // a oportunidade mostra a interação de e-mail
  await page.getByRole("link", { name: `Op ${stamp}` }).click();
  await expect(page.getByText(/enviada por e-mail para/i).first()).toBeVisible();
});
