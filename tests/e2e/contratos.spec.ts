import { test, expect } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("dados da empresa, contrato da proposta aceita emitido e baixado no portal, termo de aceite da entrega aprovada", async ({ browser }) => {
  test.setTimeout(180_000);
  const fx = createTwoOrgsWithClientsAndFiles();
  const stamp = Date.now();

  // ── dono: dados jurídicos da EGD em Configurações ─────────────────────────
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await loginAs(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/admin/configuracoes");
  const legal = admin.getByTestId("dados-empresa");
  await legal.getByLabel("Razão social").fill("EGD Consultoria Ltda");
  await legal.getByLabel("CNPJ").fill("12.345.678/0001-90");
  await legal.getByLabel("Endereço da sede").fill("Rua das Flores, 100, São Paulo/SP, 01000-000");
  await legal.getByLabel("Representante legal").fill("Eugênio G. Diniz");
  await legal.getByRole("button", { name: "Salvar dados da empresa" }).click();
  await expect(admin.getByTestId("dados-empresa").getByLabel("Razão social")).toHaveValue("EGD Consultoria Ltda", { timeout: 10_000 });

  // ── proposta aceita na oportunidade da empresa da org A ───────────────────
  await admin.goto("/admin/crm/funil?closed=1");
  await admin.getByRole("link", { name: new RegExp(`Op A ${fx.projectA.title.split(" ").at(-1)}`) }).first().click();
  await expect(admin).toHaveURL(/\/admin\/crm\/oportunidades\/[0-9a-f-]+$/);
  await admin.getByRole("button", { name: /nova proposta/i }).click();
  const dlg = admin.getByRole("dialog");
  await dlg.getByLabel(/^título$/i).fill(`Proposta contrato ${stamp}`);
  await dlg.getByLabel(/valor/i).fill("2.500,00");
  await dlg.getByRole("button", { name: /criar rascunho/i }).click();
  await expect(admin).toHaveURL(/\/admin\/crm\/propostas\/[0-9a-f-]+$/);
  const proposalUrl = admin.url();
  const proposalId = proposalUrl.split("/").at(-1)!;
  await expect(admin.getByTestId("bloco-contrato")).toHaveCount(0); // só proposta aceita
  await admin.getByRole("button", { name: "Gerar PDF" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Gerar PDF" }).click();
  await expect(admin.getByText("PDF v1")).toBeVisible({ timeout: 15_000 });
  await admin.getByRole("button", { name: /marcar como enviada/i }).click();
  await expect(admin.getByText("Enviada", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  await admin.getByRole("button", { name: /marcar como aceita/i }).click();
  await expect(admin.getByText("Aceita", { exact: true }).first()).toBeVisible({ timeout: 10_000 });

  // ── cria o contrato, preenche, gera o PDF e emite ─────────────────────────
  await admin.getByTestId("bloco-contrato").getByRole("button", { name: "Criar contrato" }).click();
  await expect(admin).toHaveURL(/\/admin\/crm\/contratos\/[0-9a-f-]+$/, { timeout: 15_000 });
  const contractUrl = admin.url();
  await expect(admin.getByRole("heading", { name: /^Contrato CT-\d{2}-\d{3}$/ })).toBeVisible();
  await expect(admin.getByTestId("status-contrato")).toHaveText("Rascunho");
  await expect(admin.getByTestId("campos-faltando")).toContainText("data inicial da vigência");
  await expect(admin.getByTestId("campos-faltando")).not.toContainText("razão social da EGD");
  const form = admin.getByTestId("contrato-form");
  await form.getByLabel("Data inicial da vigência").fill("01/11/2026");
  await form.getByLabel("Data final da vigência").fill("31/01/2027");
  await form.getByLabel("E-mail do cliente para comunicações").fill("contato@cliente.com");
  await form.getByLabel("Objetivo").fill("Integrar o ERP ao portal sem retrabalho.");
  await form.getByRole("button", { name: "Adicionar entrega" }).click();
  await form.getByLabel("Entrega / evidência").last().fill("Conector do ERP");
  await form.getByRole("button", { name: "Salvar contrato" }).click();
  await expect(admin.getByRole("status")).toHaveText("Contrato salvo.", { timeout: 10_000 });

  const previa = await admin.request.get(`${contractUrl}/pdf`);
  expect(previa.status()).toBe(200);
  expect(previa.headers()["content-type"]).toContain("application/pdf");

  await admin.getByRole("button", { name: "Gerar PDF" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Gerar PDF" }).click();
  await expect(admin.getByText("PDF v1", { exact: true })).toBeVisible({ timeout: 15_000 });

  // cliente ainda não vê (rascunho)
  const clientCtx = await browser.newContext();
  const client = await clientCtx.newPage();
  await loginAs(client, fx.clientA.email, fx.clientA.password);
  await client.goto(`/portal/propostas/${proposalId}`);
  await expect(client.getByRole("heading", { name: /Proposta contrato/ })).toBeVisible();
  await expect(client.getByTestId("contrato-portal")).toHaveCount(0);

  await admin.getByRole("button", { name: "Emitir contrato" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Emitir", exact: true }).click();
  await expect(admin.getByTestId("status-contrato")).toHaveText("Emitido", { timeout: 15_000 });
  await expect(admin.getByText("PDF v2", { exact: true })).toBeVisible();
  await expect(form.getByLabel("Data inicial da vigência")).toHaveAttribute("readonly", "");

  // ── cliente baixa o contrato emitido ──────────────────────────────────────
  await client.reload();
  const bloco = client.getByTestId("contrato-portal");
  await expect(bloco).toContainText(/CT-\d{2}-\d{3}/);
  await expect(bloco).toContainText("v2");
  const dl = await client.request.post(`/portal/propostas/${proposalId}/contrato`, { maxRedirects: 0 });
  expect(dl.status()).toBe(303);
  expect(dl.headers()["location"]).toContain("X-Amz-Signature");

  // org B não baixa
  const otherCtx = await browser.newContext();
  const other = await otherCtx.newPage();
  await loginAs(other, fx.clientB.email, fx.clientB.password);
  expect((await other.request.post(`/portal/propostas/${proposalId}/contrato`, { maxRedirects: 0 })).status()).toBe(404);

  // ── assinatura e lista ────────────────────────────────────────────────────
  await admin.getByTestId("assinatura").getByRole("button", { name: "Marcar como assinado" }).click();
  await expect(admin.getByTestId("status-contrato")).toHaveText("Assinado", { timeout: 10_000 });
  await admin.goto("/admin/crm/contratos");
  await expect(admin.getByRole("cell", { name: `Proposta contrato ${stamp}`, exact: false })).toBeVisible();
  await admin.goto(proposalUrl);
  await expect(admin.getByTestId("bloco-contrato")).toContainText("assinado em");

  // ── contrato assinado fora do sistema: sobe o PDF e o cliente passa a baixar essa cópia ─
  await admin.goto(contractUrl);
  const assinado = admin.getByTestId("contrato-assinado");
  await assinado.locator('input[type="file"]').setInputFiles({ name: `contrato-assinado-${stamp}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%assinado\n") });
  await assinado.getByLabel(/data da assinatura/i).fill("2030-02-02");
  await assinado.getByRole("button", { name: /anexar contrato assinado/i }).click();
  await expect(admin.getByTestId("contrato-assinado-arquivo")).toContainText(`contrato-assinado-${stamp}.pdf`, { timeout: 15_000 });
  await expect(admin.getByTestId("status-contrato")).toHaveText("Assinado");
  await client.goto(`/portal/propostas/${proposalId}`);
  await expect(client.getByTestId("contrato-portal")).toContainText(`contrato-assinado-${stamp}.pdf`);
  await expect(client.getByTestId("contrato-portal")).toContainText("cópia assinada");

  // ── cliente aprova a entrega concluída; dono gera o termo de aceite ───────
  const p = fx.projectA;
  await client.goto(`/portal/projetos/${p.id}`);
  await client.getByTestId("concluidas").getByRole("link", { name: /Ata da reunião de kickoff/ }).click();
  await expect(client).toHaveURL(/\/portal\/projetos\/[0-9a-f-]+\/entregas\/[0-9a-f-]+$/);
  const deliverableUrl = client.url();
  const acc = client.getByTestId("aprovacao-entrega");
  await acc.getByRole("button", { name: /confirmar aprovação/i }).click();
  await expect(client.getByText(/aprovada por/i).first()).toBeVisible({ timeout: 10_000 });

  await admin.goto(deliverableUrl.replace("/portal/projetos/", "/admin/projetos/"));
  await expect(admin.getByTestId("aceite-cliente")).toContainText("Aprovada pelo cliente");
  const termo = admin.getByTestId("termo-aceite");
  await termo.getByLabel(/ressalvas/i).fill("Capa será trocada até sexta.");
  await termo.getByRole("button", { name: "Gerar termo de aceite" }).click();
  await expect(admin.getByTestId("termo-arquivo")).toContainText("termo-aceite-", { timeout: 15_000 });
  await expect(admin.getByTestId("termo-arquivo").getByRole("button", { name: "Baixar" })).toBeVisible();

  await Promise.all([adminCtx.close(), clientCtx.close(), otherCtx.close()]);
});
