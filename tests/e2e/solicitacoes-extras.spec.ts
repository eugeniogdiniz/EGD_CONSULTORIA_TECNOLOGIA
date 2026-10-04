import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("solicitação com anexos, nota interna, SLA e responsável", async ({ browser }) => {
  test.setTimeout(120_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const stamp = Date.now();
  const titulo = `Planilha de custos ${stamp}`;

  // ── cliente abre com anexo ───────────────────────────────────────────────
  const clientCtx = await browser.newContext();
  const client = await clientCtx.newPage();
  await loginAs(client, fx.clientA.email, fx.clientA.password);
  await client.goto("/portal/solicitacoes/nova");
  await client.getByLabel(/^assunto$/i).fill(titulo);
  await client.getByLabel(/descreva sua solicitação/i).fill("Segue a planilha com os custos para conferência.");
  await client.locator('input[name="files"]').setInputFiles({ name: `custos-${stamp}.txt`, mimeType: "text/plain", buffer: Buffer.from("a;b;c") });
  await expect(client.getByText(`custos-${stamp}.txt`)).toBeVisible();
  await client.getByRole("button", { name: /enviar solicitação/i }).click();
  await expect(client).toHaveURL(/\/portal\/solicitacoes\/[0-9a-f-]+$/, { timeout: 20_000 });
  const requestId = client.url().split("/").at(-1)!;
  await expect(client.getByRole("list", { name: "Anexos" }).getByText(`custos-${stamp}.txt`)).toBeVisible();

  // ── admin vê o anexo, baixa, vê o SLA pendente e escreve uma nota interna ─
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await loginAs(admin, ADMIN.email, ADMIN.password);
  await admin.goto(`/admin/solicitacoes/${requestId}`);
  const chip = admin.getByRole("list", { name: "Anexos" }).filter({ hasText: `custos-${stamp}.txt` });
  await expect(chip).toBeVisible();
  const href = await chip.getByRole("button", { name: /baixar/i }).getAttribute("href");
  expect(href).toMatch(/\/admin\/arquivos\/[0-9a-f-]+\/baixar$/);
  const res = await admin.request.get(href!, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toContain("X-Amz-Signature");
  await expect(admin.getByTestId("sla")).toHaveAttribute("data-sla", "pending");

  await admin.getByLabel(/nota interna/i).check();
  await admin.getByPlaceholder(/nota interna/i).fill("Conferir com o financeiro antes de responder.");
  await admin.getByRole("button", { name: /salvar nota interna/i }).click();
  await expect(admin.getByTestId("nota-interna")).toContainText("Conferir com o financeiro", { timeout: 10_000 });
  await expect(admin.getByText("Aberta").first()).toBeVisible();

  // o cliente não vê a nota
  await client.reload();
  await expect(client.getByText("Conferir com o financeiro")).toHaveCount(0);
  await expect(client.getByTestId("nota-interna")).toHaveCount(0);

  // ── admin responde com anexo: SLA cumprido; cliente baixa ────────────────
  await admin.getByPlaceholder(/responder ao cliente/i).fill("Conferido. Segue a versão revisada.");
  await admin.locator('input[name="files"]').setInputFiles({ name: `revisado-${stamp}.txt`, mimeType: "text/plain", buffer: Buffer.from("ok") });
  await admin.getByRole("button", { name: /^responder$/i }).click();
  await expect(admin.getByPlaceholder(/responder ao cliente/i)).toHaveValue("", { timeout: 10_000 });
  await expect(admin.getByRole("listitem").filter({ hasText: "Conferido. Segue a versão revisada." })).toBeVisible({ timeout: 10_000 });
  await expect(admin.getByTestId("sla")).toHaveAttribute("data-sla", "met");
  await expect(admin.getByTestId("sla")).toContainText(/Respondida em/);

  await client.reload();
  await expect(client.getByText("Conferido. Segue a versão revisada.")).toBeVisible();
  const own = client.getByRole("list", { name: "Anexos" }).filter({ hasText: `revisado-${stamp}.txt` });
  await expect(own).toBeVisible();
  const [download] = await Promise.all([client.waitForEvent("download").catch(() => null), own.getByRole("button", { name: /baixar/i }).click()]);
  if (download) expect(download.suggestedFilename()).toBe(`revisado-${stamp}.txt`);

  // ── responsável e aba "Minhas" ──────────────────────────────────────────
  await admin.getByLabel(/^responsável$/i).selectOption({ label: "Administrador" });
  await admin.getByRole("button", { name: "Definir responsável" }).click();
  await expect(admin.getByText(/· Administrador/).first()).toBeVisible({ timeout: 10_000 });
  await admin.goto("/admin/solicitacoes?responsavel=eu");
  await expect(admin.getByRole("link", { name: new RegExp(titulo) })).toBeVisible();
  await admin.goto("/admin/solicitacoes?sla=estourado");
  await expect(admin.getByText(titulo)).toHaveCount(0);

  await Promise.all([clientCtx.close(), adminCtx.close()]);
});
