import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { loginAs, ADMIN } from "./helpers";

let server: Server;
let port = 0;
const hits: string[] = [];

test.beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      hits.push(String(req.headers["x-egd-event"]));
      res.statusCode = 200;
      res.end("ok");
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  port = (server.address() as { port: number }).port;
});
test.afterAll(() => new Promise<void>((r) => server.close(() => r())));

test("horário da automação, webhook de saída testado, rotação de chave e comparação semanal", async ({ page, request }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  await loginAs(page, ADMIN.email, ADMIN.password);

  // ── horário configurável ─────────────────────────────────────────────────
  await page.goto("/admin/automacoes");
  const row = page.getByTestId("job-resumo-diario");
  await row.getByLabel(/horário de resumo diário/i).fill("10:45");
  await row.getByRole("button", { name: /^salvar$/i }).click();
  await expect(row).toContainText("seg–sex, 10:45", { timeout: 10_000 });
  await expect(row).toContainText("(ajustado)");
  await row.getByLabel(/horário de resumo diário/i).fill("08:00");
  await row.getByRole("button", { name: /^salvar$/i }).click();
  await expect(page.getByTestId("job-resumo-diario")).toContainText("seg–sex, 08:00", { timeout: 10_000 });

  // ── webhook: criar, testar, ver entrega ──────────────────────────────────
  await page.goto("/admin/api");
  await page.getByLabel(/nome do webhook/i).fill(`Eco ${stamp}`);
  await page.getByLabel(/url de destino/i).fill(`http://127.0.0.1:${port}/hook`);
  await page.getByLabel(/lead recebido/i).check();
  await page.getByRole("button", { name: /criar webhook/i }).click();
  const secretBox = page.getByRole("status").filter({ hasText: /copie o segredo/i });
  await expect(secretBox).toBeVisible({ timeout: 10_000 });
  expect(((await secretBox.locator("code").textContent()) ?? "").trim()).toMatch(/^whsec_/);
  const whRow = page.locator("li", { hasText: `Eco ${stamp}` });
  await whRow.getByRole("button", { name: /^testar$/i }).click();
  await expect(whRow.getByRole("status")).toContainText(/ok \(200\)/, { timeout: 15_000 });
  expect(hits).toContain("ping");
  await whRow.getByRole("link", { name: `Eco ${stamp}` }).click();
  await expect(page.getByTestId("entrega-ping")).toContainText("entregue");

  // ── rotação de chave: a antiga continua válida ───────────────────────────
  await page.goto("/admin/api");
  await page.getByLabel(/^nome$/i).fill(`Chave rot ${stamp}`);
  await page.getByLabel(/ler cases publicados/i).check();
  await page.getByRole("button", { name: /criar chave/i }).click();
  const keyBox = page.getByRole("status").filter({ hasText: /copie agora/i });
  await expect(keyBox).toBeVisible({ timeout: 10_000 });
  const oldKey = ((await keyBox.locator("code").textContent()) ?? "").trim();
  const keyRow = page.getByRole("row", { name: new RegExp(`Chave rot ${stamp}`) });
  await expect(keyRow).toContainText(/até \d{2}\/\d{2}\/\d{4}/);
  await keyRow.getByRole("button", { name: new RegExp(`Rotacionar Chave rot ${stamp}`) }).click();
  // depois da rotação há duas linhas com o mesmo nome (a nova e a antiga): a caixa fica na antiga
  const rotBox = page.getByRole("status").filter({ hasText: /nova chave \(copie agora\)/i });
  await expect(rotBox).toBeVisible({ timeout: 10_000 });
  const newKey = ((await rotBox.locator("code").textContent()) ?? "").trim();
  expect(newKey).not.toBe(oldKey);
  expect((await request.get("/api/v1/cases", { headers: { Authorization: `Bearer ${oldKey}` } })).status()).toBe(200);
  expect((await request.get("/api/v1/cases", { headers: { Authorization: `Bearer ${newKey}` } })).status()).toBe(200);

  // ── semanal mostra a comparação ──────────────────────────────────────────
  await page.goto("/admin/relatorios/semanal");
  await expect(page.getByText(/vs\. semana anterior/)).toBeVisible();
  await page.goto("/admin/relatorios");
  await expect(page.getByRole("columnheader", { name: /Δ 7 dias/ })).toBeVisible();
});
