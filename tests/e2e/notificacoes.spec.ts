import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("solicitação vira notificação para o admin; resposta vira notificação para o cliente", async ({ browser }) => {
  test.setTimeout(120_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const titulo = `Relatório mensal ${Date.now()}`;

  // ── cliente abre a solicitação ───────────────────────────────────────────
  const clientCtx = await browser.newContext();
  const client = await clientCtx.newPage();
  await loginAs(client, fx.clientA.email, fx.clientA.password);
  await client.goto("/portal/solicitacoes/nova");
  await client.getByLabel(/^assunto$/i).fill(titulo);
  await client.getByLabel(/descreva sua solicitação/i).fill("Precisamos do relatório mensal em PDF.");
  await client.getByRole("button", { name: /enviar solicitação/i }).click();
  await expect(client).toHaveURL(/\/portal\/solicitacoes\/[0-9a-f-]+$/);
  const requestId = client.url().split("/").at(-1)!;

  // ── admin vê no sino, abre pelo menu e cai na solicitação ───────────────
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await loginAs(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/admin");
  await expect(admin.getByTestId("sino-contador")).toBeVisible();
  await admin.getByTestId("sino").click();
  const item = admin.getByRole("menuitem", { name: new RegExp(`Nova solicitação de ${fx.orgA.name}: ${titulo}`) });
  await expect(item).toBeVisible();
  await item.click();
  await expect(admin).toHaveURL(new RegExp(`/admin/solicitacoes/${requestId}$`));
  // a notificação aberta não está mais entre as não lidas
  await admin.goto("/admin/notificacoes?filtro=nao-lidas");
  await expect(admin.getByText(titulo)).toHaveCount(0);
  await admin.goto("/admin/notificacoes");
  await expect(admin.getByRole("link", { name: new RegExp(titulo) })).toBeVisible();

  // ── preferência de e-mail: desliga, persiste, religa ────────────────────
  await admin.goto("/admin/conta");
  const pref = admin.getByTestId("pref-request.created").getByRole("switch");
  await expect(pref).toHaveAttribute("aria-checked", "true");
  await pref.click();
  await expect(admin.getByTestId("pref-request.created").getByRole("switch")).toHaveAttribute("aria-checked", "false");
  await admin.reload();
  await expect(admin.getByTestId("pref-request.created").getByRole("switch")).toHaveAttribute("aria-checked", "false");
  await admin.getByTestId("pref-request.created").getByRole("switch").click();
  await expect(admin.getByTestId("pref-request.created").getByRole("switch")).toHaveAttribute("aria-checked", "true");

  // ── equipe responde → cliente é notificado e marca todas como lidas ─────
  await admin.goto(`/admin/solicitacoes/${requestId}`);
  await admin.getByPlaceholder(/responder ao cliente/i).fill("Segue o relatório em anexo na entrega.");
  await admin.getByRole("button", { name: /^responder$/i }).click();
  await expect(admin.getByText("Segue o relatório em anexo na entrega.")).toBeVisible({ timeout: 10_000 });

  await client.goto("/portal");
  await expect(client.getByTestId("sino-contador")).toBeVisible();
  await client.goto("/portal/notificacoes");
  await expect(client.getByRole("link", { name: new RegExp(`A EGD respondeu: ${titulo}`) })).toBeVisible();
  await client.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await expect(client.getByTestId("sino-contador")).toHaveCount(0);
  await expect(client.getByRole("button", { name: "Marcar todas como lidas" })).toHaveCount(0);

  await Promise.all([clientCtx.close(), adminCtx.close()]);
});

test("notificação de outro usuário não abre: volta para a lista", async ({ page }) => {
  const fx = createTwoOrgsWithClientsAndFiles();
  await loginAs(page, fx.clientB.email, fx.clientB.password);
  await page.goto("/portal/notificacoes/00000000-0000-4000-8000-000000000000/abrir");
  await expect(page).toHaveURL(/\/portal\/notificacoes$/);
});
