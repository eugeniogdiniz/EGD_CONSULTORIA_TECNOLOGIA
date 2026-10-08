import { test, expect } from "@playwright/test";
import { loginAs, latestMailpitLink, ADMIN, openMenuGroup } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test.describe.serial("equipe", () => {
  const stamp = Date.now();
  const colabEmail = `colab${stamp}@test.local`;
  const colabPassword = "senha-colab-forte-1";

  test("dono convida colaborador; ele aceita e vê só a operação", async ({ page }) => {
    test.setTimeout(90_000);
    const fx = createTwoOrgsWithClientsAndFiles();
    await loginAs(page, ADMIN.email, ADMIN.password);
    await openMenuGroup(page, "Sistema");
    await page.getByRole("link", { name: "Equipe", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/equipe$/);
    await page.getByLabel(/^e-mail$/i).fill(colabEmail);
    await page.getByLabel(/^papel$/i).first().selectOption("collaborator");
    await page.getByRole("button", { name: /^convidar$/i }).click();
    await expect(page.getByText(colabEmail)).toBeVisible();

    const link = await latestMailpitLink(/\/convite\//, colabEmail);
    await page.context().clearCookies();
    await page.goto(link);
    await expect(page.getByRole("heading", { name: /equipe da EGD/i })).toBeVisible();
    await page.getByLabel(/seu nome/i).fill("Colaborador E2E");
    await page.getByLabel(/^senha$/i).fill(colabPassword);
    await page.getByRole("button", { name: /criar minha conta/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("Minhas demandas")).toBeVisible();

    // menu sem CRM/Equipe/Auditoria; URLs do dono respondem 404
    const menu = page.getByRole("navigation", { name: "Menu" });
    await openMenuGroup(page, "Operação");
    await expect(menu.getByRole("link", { name: "Demandas" })).toBeVisible();
    await expect(menu.getByRole("button", { name: /comercial|financeiro|sistema/i })).toHaveCount(0);
    await expect(menu.getByText("CRM")).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Auditoria" })).toHaveCount(0);
    for (const url of ["/admin/crm/empresas", "/admin/auditoria", "/admin/relatorios", `/admin/projetos/${fx.projectA.id}/financeiro`, "/admin/equipe", "/admin/configuracoes"]) {
      expect((await page.goto(url))?.status(), url).toBe(404);
    }
    for (const url of ["/admin/projetos", `/admin/projetos/${fx.projectA.id}`, "/admin/demandas", "/admin/solicitacoes", "/admin/relatorios/semanal"]) {
      expect((await page.goto(url))?.status(), url).toBe(200);
    }
    await page.goto(`/admin/demandas`);
    await page.getByRole("link", { name: "Minhas" }).click();
    await expect(page).toHaveURL(/responsavel=/);
  });

  test("2FA obrigatório para a equipe bloqueia o colaborador até ativar; o dono ainda alcança Configurações", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/configuracoes");
    const sw = () => page.getByTestId("setting-security.require_2fa_team").getByRole("switch");
    await expect(sw()).toHaveAttribute("aria-checked", "false");
    await sw().click();
    await expect(sw()).toHaveAttribute("aria-checked", "true");
    try {
      // o admin do seed não tem 2FA: as demais páginas redirecionam para Minha conta; Configurações continua aberta
      await page.goto("/admin/projetos");
      await expect(page).toHaveURL(/\/admin\/conta\?2fa=obrigatorio/);
      await expect(page.getByTestId("2fa-obrigatorio")).toBeVisible();
      expect((await page.goto("/admin/configuracoes"))?.url()).toMatch(/\/admin\/configuracoes$/);

      const colabCtx = await page.context().browser()!.newContext();
      const colab = await colabCtx.newPage();
      await loginAs(colab, colabEmail, colabPassword);
      await colab.goto("/admin/demandas");
      await expect(colab).toHaveURL(/\/admin\/conta\?2fa=obrigatorio/);
      await expect(colab.getByTestId("2fa-obrigatorio")).toBeVisible();
      expect((await colab.goto("/admin/configuracoes"))?.status()).toBe(404);
      await colabCtx.close();
    } finally {
      // nunca deixar a regra ligada para os outros specs
      await page.goto("/admin/configuracoes");
      if ((await sw().getAttribute("aria-checked")) === "true") await sw().click();
      await expect(sw()).toHaveAttribute("aria-checked", "false");
    }
    // sem a regra, o colaborador volta a abrir as páginas
    await page.context().clearCookies();
    await loginAs(page, colabEmail, colabPassword);
    expect((await page.goto("/admin/demandas"))?.status()).toBe(200);
  });
});
