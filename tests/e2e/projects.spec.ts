import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";

test.describe.serial("projects", () => {
  const stamp = Date.now();
  const empresaNome = `Projetos E2E ${stamp}`;
  const oppTitulo = `Op ${stamp}`;
  const faseNome = `Fase Kickoff ${stamp}`;
  const entregaTitulo = `Entrega alfa ${stamp}`;

  test("admin cria empresa → oportunidade → marca ganha → cria projeto", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);

    // 1) Empresa
    await page.goto("/admin/crm/empresas/nova");
    await page.getByLabel(/^nome$/i).fill(empresaNome);
    await page.getByRole("button", { name: /criar empresa/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: empresaNome })).toBeVisible();

    // 2) Oportunidade
    await page.getByRole("button", { name: /nova oportunidade/i }).click();
    const oppDialog = page.getByRole("dialog");
    await oppDialog.getByLabel(/^título$/i).fill(oppTitulo);
    await oppDialog.getByLabel(/valor/i).fill("5500000");
    await oppDialog.getByRole("button", { name: /^criar$/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: oppTitulo })).toBeVisible();

    // 3) Ganhar
    await page.getByRole("button", { name: /marcar como ganha/i }).click();
    await expect(page.getByRole("button", { name: /criar projeto/i })).toBeVisible();

    // 4) Criar projeto
    await page.getByRole("button", { name: /^criar projeto$/i }).click();
    const dlg = page.getByRole("dialog");
    // título default vem preenchido
    await dlg.getByRole("button", { name: /^criar projeto$/i }).click();
    await expect(page).toHaveURL(/\/admin\/projetos\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { level: 1, name: oppTitulo })).toBeVisible();
  });

  test("adiciona fase, marco e entrega; muda status via diálogo", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/projetos");
    await page.getByRole("link", { name: oppTitulo }).click();

    // Fase
    await page.getByRole("button", { name: /nova fase/i }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^nome$/i).fill(faseNome);
    await dialog.getByRole("button", { name: /^criar$/i }).click();
    await expect(page.getByText(faseNome)).toBeVisible({ timeout: 10_000 });

    // Marco
    await page.getByRole("button", { name: /novo marco/i }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^nome$/i).fill(`Marco ${stamp}`);
    await dialog.getByLabel(/^data$/i).fill("2030-12-31");
    await dialog.getByRole("button", { name: /^criar$/i }).click();
    await expect(page.getByText(`Marco ${stamp}`)).toBeVisible({ timeout: 10_000 });

    // Entrega — via kanban
    await page.getByRole("link", { name: /^kanban$/i }).click();
    await page.getByRole("button", { name: /nova entrega/i }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^título$/i).fill(entregaTitulo);
    await dialog.getByRole("button", { name: /^criar$/i }).click();
    await expect(page.getByText(entregaTitulo)).toBeVisible({ timeout: 10_000 });

    // Muda status via diálogo. Após "Aplicar" o form do status picker
    // remonta (useActionState + revalidatePath), então clicar em "Fechar"
    // corre risco de pegar o botão detached em CI. Manda Escape logo e
    // valida direto pela mudança no kanban (o card cai na coluna "Feita").
    await page.getByText(entregaTitulo).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^status$/i).selectOption("done");
    await dialog.getByRole("button", { name: /^aplicar$/i }).click();
    await page.keyboard.press("Escape");
    const feitaColumn = page.locator("section", { has: page.getByRole("heading", { name: /^feita$/i }) });
    await expect(feitaColumn.getByText(entregaTitulo)).toBeVisible({ timeout: 15_000 });
  });

  test("Fase 4 — compartilhar entrega avisa que os comentários existentes ficam visíveis ao cliente", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/projetos");
    await page.getByRole("link", { name: oppTitulo }).click();
    // do kanban: card → diálogo → página da entrega
    await page.getByRole("link", { name: /^kanban$/i }).click();
    await page.getByText(entregaTitulo).click();
    await page.getByRole("dialog").getByRole("link", { name: /abrir a página da entrega/i }).click();
    await expect(page).toHaveURL(/\/entregas\/[0-9a-f-]+$/);
    await expect(page.getByText(/esta entrega é interna/i)).toBeVisible();

    await page.getByPlaceholder(/escrever comentário/i).fill("Nota interna da equipe");
    await page.getByRole("button", { name: /^comentar$/i }).click();
    await expect(page.getByText("Nota interna da equipe")).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(page.getByRole("note")).toContainText(/1 comentário/i);
    await expect(page.getByRole("button", { name: /compartilhar com o cliente/i })).toBeVisible();
  });

  test("/admin/projetos sem sessão redireciona para /entrar", async ({ request }) => {
    const res = await request.get("/admin/projetos", { maxRedirects: 0, failOnStatusCode: false });
    expect([307, 302, 308]).toContain(res.status());
    expect(res.headers()["location"]).toMatch(/\/entrar/);
  });

  test("Fase 3.5 — abas Gantt, Calendário, Financeiro renderizam sem 404", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/projetos");
    await page.getByRole("link", { name: oppTitulo }).click();

    // Gantt
    await page.getByRole("link", { name: /^gantt$/i }).click();
    await expect(page).toHaveURL(/\/gantt$/);
    await expect(page.getByRole("heading", { level: 1, name: /linha do tempo/i })).toBeVisible();

    // Calendário
    await page.getByRole("link", { name: /^calend[aá]rio$/i }).click();
    await expect(page).toHaveURL(/\/calendario$/);
    await expect(page.getByRole("heading", { level: 1, name: /calend[aá]rio/i })).toBeVisible();

    // Financeiro — cotas visíveis
    await page.getByRole("link", { name: /^financeiro$/i }).click();
    await expect(page).toHaveURL(/\/financeiro$/);
    await expect(page.getByText(/or[çc]amento/i).first()).toBeVisible();
    await expect(page.getByText(/margem/i).first()).toBeVisible();
  });

  test("Fase 3.5 — /admin/projetos/templates renderiza e sidebar marca o item certo", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/projetos/templates");
    await expect(page.getByRole("heading", { level: 1, name: /templates de projeto/i })).toBeVisible();
    // Sidebar: apenas Templates deve ser aria-current="page" nesse pathname.
    const sidebar = page.getByRole("navigation", { name: /^menu$/i });
    await expect(sidebar.getByRole("link", { name: /^templates$/i })).toHaveAttribute("aria-current", "page");
    await expect(sidebar.getByRole("link", { name: /^projetos$/i })).not.toHaveAttribute("aria-current", "page");
  });
});
