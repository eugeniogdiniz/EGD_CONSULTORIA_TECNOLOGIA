import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";

test.describe.serial("api", () => {
  const nome = `Chave E2E ${Date.now()}`;
  let chave = "";

  test("admin cria uma chave, vê o segredo uma vez e a API responde", async ({ page, request }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/api");
    await page.getByLabel(/^nome$/i).fill(nome);
    await page.getByLabel(/ler cases publicados/i).check();
    await page.getByRole("button", { name: /criar chave/i }).click();

    const box = page.getByRole("status").filter({ hasText: /copie agora/i });
    await expect(box).toBeVisible({ timeout: 10_000 });
    chave = ((await box.locator("code").textContent()) ?? "").trim();
    expect(chave).toMatch(/^egd_[A-Za-z0-9_-]{43}$/);

    const ok = await request.get("/api/v1/cases", { headers: { Authorization: `Bearer ${chave}` } });
    expect(ok.status()).toBe(200);
    expect(Array.isArray((await ok.json()).data)).toBe(true);

    // a tabela mostra só o prefixo, nunca o segredo
    await page.reload();
    await expect(page.getByText(nome)).toBeVisible();
    await expect(page.getByText(chave)).toHaveCount(0);
    await expect(page.getByText(`${chave.slice(0, 12)}…`)).toBeVisible();
  });

  test("sem chave a API devolve 401; escopo errado devolve 403", async ({ request }) => {
    expect((await request.get("/api/v1/cases")).status()).toBe(401);
    const res = await request.post("/api/v1/leads", {
      headers: { Authorization: `Bearer ${chave}` },
      data: { name: "Fulano", email: "fulano@x.com", message: "mensagem longa o bastante" },
    });
    expect(res.status()).toBe(403);
  });

  test("revogar a chave faz a API responder 401", async ({ page, request }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/api");
    const row = page.getByRole("row", { name: new RegExp(nome) });
    await row.getByRole("button", { name: /^revogar$/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^revogar$/i }).click();
    await expect(row.getByText(/revogada em/i)).toBeVisible({ timeout: 10_000 });

    expect((await request.get("/api/v1/cases", { headers: { Authorization: `Bearer ${chave}` } })).status()).toBe(401);
  });

  test("/admin/api sem sessão redireciona para /entrar", async ({ request }) => {
    const res = await request.get("/admin/api", { maxRedirects: 0, failOnStatusCode: false });
    expect([307, 302, 308]).toContain(res.status());
  });
});
