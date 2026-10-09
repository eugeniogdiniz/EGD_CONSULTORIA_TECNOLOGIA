import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";

test("catálogo de serviços alimenta o investimento da proposta; previsão abre e exporta CSV", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  await loginAs(page, ADMIN.email, ADMIN.password);

  // serviço
  await page.goto("/admin/crm/servicos");
  await page.getByRole("button", { name: /novo serviço/i }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel(/^nome$/i).fill(`Diagnóstico ${stamp}`);
  await dlg.getByLabel(/preço de referência/i).fill("1.000,00");
  await dlg.getByLabel(/^unidade$/i).fill("hora");
  await dlg.getByRole("button", { name: /criar serviço/i }).click();
  await expect(page.getByText(`Diagnóstico ${stamp}`)).toBeVisible({ timeout: 10_000 });

  // proposta em rascunho (empresa → oportunidade → proposta)
  await page.goto("/admin/crm/empresas/nova");
  await page.getByLabel(/^nome$/i).fill(`Empresa ${stamp}`);
  await page.getByRole("button", { name: /criar empresa/i }).click();
  await page.getByRole("button", { name: /nova oportunidade/i }).click();
  await page.getByRole("dialog").getByLabel(/^título$/i).fill(`Op ${stamp}`);
  await page.getByRole("dialog").getByRole("button", { name: /^criar$/i }).click();
  await page.getByRole("button", { name: /nova proposta/i }).click();
  await page.getByRole("dialog").getByLabel(/^título$/i).fill(`Proposta ${stamp}`);
  await page.getByRole("dialog").getByLabel(/valor/i).fill("2.000,00");
  await page.getByRole("dialog").getByRole("button", { name: /criar rascunho/i }).click();
  await expect(page).toHaveURL(/\/admin\/crm\/propostas\/[0-9a-f-]+$/);

  // catálogo no documento: 2 horas → R$ 2.000,00
  await page.getByRole("button", { name: "Editar documento" }).click();
  const cat = page.getByTestId("catalogo");
  const option = cat.locator("option", { hasText: `Diagnóstico ${stamp}` });
  await cat.getByLabel(/adicionar do catálogo/i).selectOption({ value: (await option.getAttribute("value")) ?? "" });
  await cat.getByLabel(/quantidade/i).fill("2");
  await cat.getByRole("button", { name: /adicionar item/i }).click();
  const items = page.getByLabel("Item / marco");
  await expect(items.last()).toHaveValue(new RegExp(`Diagnóstico ${stamp} \\(2 horas\\)`));
  await expect(page.getByLabel("Valor (cents)").last()).toHaveValue("200000");
  await page.getByRole("button", { name: "Salvar documento" }).click();
  await expect(page.getByRole("status")).toContainText("Documento salvo", { timeout: 10_000 });

  // previsão
  await page.goto("/admin/crm/previsao");
  await expect(page.getByRole("heading", { level: 1, name: /previsão e conversão/i })).toBeVisible();
  await expect(page.getByText("Previsão ponderada")).toBeVisible();
  const res = await page.request.get("/admin/crm/previsao/csv");
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("Pipeline por estágio");
});
