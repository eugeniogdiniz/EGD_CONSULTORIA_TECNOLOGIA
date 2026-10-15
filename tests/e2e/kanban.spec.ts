import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("kanban: clicar no cartão abre o diálogo e arrastar muda o status (e persiste)", async ({ page }) => {
  test.setTimeout(90_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  await loginAs(page, ADMIN.email, ADMIN.password);
  await page.goto(`/admin/projetos/${fx.projectA.id}/kanban`);

  const card = page.locator('section[data-status="todo"]').getByText("Laudo final assinado");
  const todo = page.locator('section[data-status="todo"]');
  const doing = page.locator('section[data-status="doing"]');
  await expect(card).toBeVisible();

  // clique: abre o diálogo de edição
  await card.click();
  await expect(page.getByRole("dialog").getByRole("link", { name: /abrir a página da entrega/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0); // o fundo ainda animando captura o mouse

  // arrastar: A fazer → Em progresso
  const from = await card.boundingBox();
  const to = await doing.boundingBox();
  if (!from || !to) throw new Error("sem geometria");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + 120, { steps: 12 });
  // a tela move o cartão na hora; só depois de a ação do servidor responder é seguro recarregar
  const salvou = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/kanban"));
  await page.mouse.up();
  await expect(doing.getByText("Laudo final assinado")).toBeVisible({ timeout: 10_000 });
  expect((await salvou).ok()).toBe(true);

  // persistiu no servidor
  await page.reload();
  await expect(doing.getByText("Laudo final assinado")).toBeVisible({ timeout: 20_000 });
  await expect(todo.getByText("Laudo final assinado")).toHaveCount(0);
});

test("anexos: vários arquivos pelo card do kanban, contador no card e lista na página da entrega", async ({ page }) => {
  test.setTimeout(90_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  await loginAs(page, ADMIN.email, ADMIN.password);
  await page.goto(`/admin/projetos/${fx.projectA.id}/kanban`);

  const card = page.locator("section[data-status]").getByRole("button", { name: /Laudo final assinado/ });
  await card.click();
  const dlg = page.getByRole("dialog");
  const anexos = dlg.getByTestId("anexos-entrega");
  await expect(anexos).toContainText("Nenhum anexo");
  await anexos.locator('input[type="file"]').setInputFiles([
    { name: "laudo.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 laudo") },
    { name: "fotos.zip", mimeType: "application/zip", buffer: Buffer.from("PK zip") },
  ]);
  await expect(anexos).toContainText("2 arquivos anexados.", { timeout: 20_000 });
  await expect(anexos.getByRole("listitem")).toHaveCount(2);
  await expect(anexos).toContainText("laudo.pdf");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toContainText("📎 2");

  await page.goto(`/admin/projetos/${fx.projectA.id}/kanban`);
  await card.click();
  await page.getByRole("dialog").getByRole("link", { name: /abrir a página da entrega/i }).click();
  const bloco = page.getByTestId("anexos-entrega");
  await expect(bloco.getByRole("listitem")).toHaveCount(2, { timeout: 20_000 });
  const href = await bloco.getByRole("link", { name: "Baixar" }).first().getAttribute("href");
  expect(href).toMatch(/\/admin\/arquivos\/[0-9a-f-]+\/baixar$/);
});
