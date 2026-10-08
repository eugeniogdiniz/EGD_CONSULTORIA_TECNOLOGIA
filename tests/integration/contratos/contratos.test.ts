import { describe, it, expect, beforeAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { appSetting, auditLog, crmCompany, crmContract, crmOpportunity, crmProposal, files, memberships, organizations, project, projectDeliverable, projectInvoice } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { createProposal, generateProposalPdf, changeProposalStatus, updateProposalDocument, updateCompany } from "@/modules/crm/actions";
import { decideDeliverable } from "@/modules/portal-projects/actions";
import { setSetting } from "@/modules/settings/actions";
import { getLegalSettings } from "@/modules/settings/queries";
import { buildAcceptanceRenderInput, buildContractRenderInput, createContractFromProposal, generateAcceptanceTerm, generateContractPdf, issueContract, markContractSigned, reopenContract, updateContractDocument } from "@/modules/contracts/actions";
import { getContract, getPortalContract, listContracts } from "@/modules/contracts/queries";
import { parseStoredContractDocument } from "@/modules/contracts/document";
import { ensureTestAdmin } from "../setup";

let admin: AdminContext;
let ctxA: PortalContext;
let ctxB: PortalContext;
let companyId: string;
let opportunityId: string;
let projectId: string;
let deliverableId: string;

async function client(email: string, name: string) {
  const c = await auth.$context;
  const u = await c.internalAdapter.createUser({ email, name, emailVerified: true, role: "client", active: true }, { method: "admin" });
  return { id: u.id, name, email, role: "client" as const, active: true };
}

async function acceptedProposal(title: string, valueCents: string) {
  const c = await createProposal(admin, { opportunityId, title, valueCents, currency: "BRL", validUntil: "2030-12-31" });
  const id = (c.ok ? c.data.id : null)!;
  await updateProposalDocument(admin, id, { objective: "Zerar o retrabalho", scopeLimits: "Sem app", deliverables: [{ title: "Conector", acceptance: "Sincroniza pedidos", due: "S4" }], investment: [{ item: "Entrada", amountCents: 40000, condition: "assinatura" }, { item: "Final", amountCents: 60000, condition: "entrega" }] });
  await generateProposalPdf(admin, id);
  await changeProposalStatus(admin, id, { to: "sent" });
  await changeProposalStatus(admin, id, { to: "accepted" });
  return id;
}

beforeAll(async () => {
  admin = await ensureTestAdmin();
  await db.delete(appSetting);
  const [orgA] = await db.insert(organizations).values({ name: "Org A", slug: `ct-a-${Date.now()}` }).returning();
  const [orgB] = await db.insert(organizations).values({ name: "Org B", slug: `ct-b-${Date.now()}` }).returning();
  const a = await client(`ct-a-${Date.now()}@test.local`, "Cliente A");
  const b = await client(`ct-b-${Date.now()}@test.local`, "Cliente B");
  await db.insert(memberships).values([{ userId: a.id, organizationId: orgA.id }, { userId: b.id, organizationId: orgB.id }]);
  ctxA = { kind: "portal", user: a, organization: orgA, organizations: [orgA] };
  ctxB = { kind: "portal", user: b, organization: orgB, organizations: [orgB] };
  const [company] = await db.insert(crmCompany).values({ name: "Horizonte", slug: `horizonte-${Date.now()}`, cnpj: "98765432000110", ownerId: admin.user.id, linkedOrganizationId: orgA.id }).returning({ id: crmCompany.id });
  companyId = company.id;
  const [opp] = await db.insert(crmOpportunity).values({ companyId, title: "Op contrato", stage: "proposal", ownerId: admin.user.id }).returning({ id: crmOpportunity.id });
  opportunityId = opp.id;
  const [p] = await db.insert(project).values({ opportunityId, companyId, title: "Projeto contrato", status: "active", ownerId: admin.user.id }).returning({ id: project.id });
  projectId = p.id;
  const [d] = await db.insert(projectDeliverable).values({ projectId, title: "Laudo final", description: "Laudo assinado com as medições", ownerId: admin.user.id, visibleToClient: true, status: "done", completedAt: new Date() }).returning({ id: projectDeliverable.id });
  deliverableId = d.id;
});

describe("dados legais", () => {
  it("chaves legal.* aceitam texto, recusam tipo errado e voltam num objeto só", async () => {
    expect((await setSetting(admin, "legal.razao_social", "EGD Consultoria Ltda")).ok).toBe(true);
    expect((await setSetting(admin, "legal.cnpj", "12.345.678/0001-90")).ok).toBe(true);
    expect((await setSetting(admin, "legal.endereco", "Rua A, 1, São Paulo/SP")).ok).toBe(true);
    expect((await setSetting(admin, "legal.representante", "Eugênio G. Diniz")).ok).toBe(true);
    expect((await setSetting(admin, "legal.razao_social", true)).ok).toBe(false);
    expect((await setSetting(admin, "security.require_2fa_team", "sim")).ok).toBe(false);
    expect((await setSetting(admin, "legal.foro", "x".repeat(301))).ok).toBe(false);
    const legal = await getLegalSettings();
    expect(legal.razaoSocial).toBe("EGD Consultoria Ltda");
    expect(legal.cargo).toBe("Consultor em Tecnologia"); // padrão
    expect(legal.foro).toBe("São Paulo/SP");
  });

  it("campos legais da empresa são gravados pelo updateCompany", async () => {
    const r = await updateCompany(admin, companyId, { name: "Horizonte", cnpj: "98765432000110", source: "outbound", legalName: "Construtora Horizonte S.A.", address: "Av. B, 2, Campinas/SP", representativeName: "Marina Souza", representativeRole: "Diretora" });
    expect(r.ok).toBe(true);
    const c = await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, companyId) });
    expect(c?.legalName).toBe("Construtora Horizonte S.A.");
    expect(c?.representativeRole).toBe("Diretora");
  });
});

describe("contrato", () => {
  let proposalId: string;
  let contractId: string;

  it("só proposta aceita gera contrato; vem pré-preenchido e numerado CT-AA-NNN", async () => {
    const draft = await createProposal(admin, { opportunityId, title: "Rascunho", valueCents: "1000", currency: "BRL" });
    expect((await createContractFromProposal(admin, (draft.ok ? draft.data.id : "")!)).ok).toBe(false);

    proposalId = await acceptedProposal("Integração do ERP", "100000");
    await db.insert(projectInvoice).values([{ projectId, number: 1, description: "Entrada 40%", amountCents: 40000, dueAt: "2026-11-10", createdBy: admin.user.id }, { projectId, number: 2, description: "Saldo", amountCents: 60000, dueAt: "2026-12-10", createdBy: admin.user.id }]);
    const r = await createContractFromProposal(admin, proposalId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    contractId = r.data.id;
    expect(r.data.number).toMatch(/^CT-\d{2}-\d{3}$/);
    expect((await createContractFromProposal(admin, proposalId)).ok).toBe(false); // um por proposta

    const row = await getContract(admin, contractId);
    const doc = parseStoredContractDocument(row!.contract.document);
    expect(doc.projectDescription).toBe("Integração do ERP");
    expect(doc.objective).toBe("Zerar o retrabalho");
    expect(doc.excluded).toBe("Sem app");
    expect(doc.deliverables).toEqual([{ title: "Conector", acceptance: "Sincroniza pedidos", due: "S4" }]);
    // parcelas do projeto têm prioridade sobre o investimento da proposta
    expect(doc.installments.map((i) => i.milestone)).toEqual(["Entrada 40%", "Saldo"]);
    expect(doc.venue).toBe("São Paulo/SP");
    expect(doc.egdManager).toBe("Eugênio G. Diniz");

    const built = await buildContractRenderInput(contractId);
    expect(built?.input.parties.client.legalName).toBe("Construtora Horizonte S.A.");
    expect(built?.input.parties.egd.cnpj).toBe("12.345.678/0001-90");
    expect(built?.missing).toContain("data inicial da vigência");
    expect(built?.missing).toContain("e-mail do cliente");

    const second = await createContractFromProposal(admin, await acceptedProposal("Outro", "5000"));
    expect(second.ok && Number(second.data.number.slice(-3))).toBe(Number(r.data.number.slice(-3)) + 1);
    expect((await listContracts(admin)).map((c) => c.id)).toContain(contractId);
  });

  it("edita, gera PDF v1 e v2, emite (v3 final), bloqueia edição, volta e assina", async () => {
    expect((await updateContractDocument(admin, contractId, { startDate: "01/11/2026", endDate: "31/01/2027", clientEmail: "marina@horizonte.com", deliverables: [{ title: "Conector", acceptance: "ok", due: "S4" }], installments: [{ milestone: "Único", amountCents: 100000, condition: "à vista" }] })).ok).toBe(true);
    expect((await buildContractRenderInput(contractId))?.missing).toEqual([]);

    const v1 = await generateContractPdf(admin, contractId);
    expect(v1.ok && v1.data.version).toBe(1);
    const v2 = await generateContractPdf(admin, contractId);
    expect(v2.ok && v2.data.version).toBe(2);
    const f = await db.query.files.findFirst({ where: eq(files.id, (v2.ok ? v2.data.fileId : "")!) });
    expect(f?.originalName).toMatch(/^CT-\d{2}-\d{3}-v2\.pdf$/);
    expect(f?.mimeType).toBe("application/pdf");
    expect(f?.organizationId).toBeNull();

    // portal: nada antes de emitir, nem para a org dona
    expect(await getPortalContract(ctxA, proposalId)).toBeNull();

    expect((await markContractSigned(admin, contractId, "2026-11-01")).ok).toBe(false); // ainda rascunho
    const issued = await issueContract(admin, contractId);
    expect(issued.ok && issued.data.version).toBe(3);
    const row = await getContract(admin, contractId);
    expect(row?.contract.status).toBe("issued");
    expect(row?.contract.issuedAt).not.toBeNull();
    expect((await updateContractDocument(admin, contractId, { venue: "Rio/RJ" })).ok).toBe(false);
    expect((await generateContractPdf(admin, contractId)).ok).toBe(false);
    expect((await issueContract(admin, contractId)).ok).toBe(false);

    // portal: só a organização da empresa vê o emitido
    const portal = await getPortalContract(ctxA, proposalId);
    expect(portal?.number).toBe(row?.contract.number);
    expect(portal?.documentVersion).toBe(3);
    expect(await getPortalContract(ctxB, proposalId)).toBeNull();

    // volta para rascunho: some do portal; edita; emite de novo
    expect((await reopenContract(admin, contractId)).ok).toBe(true);
    expect(await getPortalContract(ctxA, proposalId)).toBeNull();
    expect((await updateContractDocument(admin, contractId, { venue: "Campinas/SP" })).ok).toBe(true);
    expect((await issueContract(admin, contractId)).ok).toBe(true);

    expect((await markContractSigned(admin, contractId, "01/11/2026")).ok).toBe(false);
    expect((await markContractSigned(admin, contractId, "2026-11-01")).ok).toBe(true);
    const signed = await getContract(admin, contractId);
    expect(signed?.contract.status).toBe("signed");
    expect(signed?.contract.signedAt?.toISOString().slice(0, 10)).toBe("2026-11-01");
    expect((await reopenContract(admin, contractId)).ok).toBe(false);
    expect(await getPortalContract(ctxA, proposalId)).not.toBeNull();

    const actions = (await db.select({ action: auditLog.action }).from(auditLog).where(and(eq(auditLog.entityType, "crm_contract"), eq(auditLog.entityId, contractId)))).map((a) => a.action);
    for (const a of ["crm.contract.created", "crm.contract.updated", "crm.contract.pdf_generated", "crm.contract.issued", "crm.contract.reopened", "crm.contract.signed"]) expect(actions).toContain(a);
  });

  it("apagar a proposta leva o contrato junto", async () => {
    const pid = await acceptedProposal("Descartável", "100");
    const r = await createContractFromProposal(admin, pid);
    await db.delete(crmProposal).where(eq(crmProposal.id, pid));
    expect(await db.query.crmContract.findFirst({ where: eq(crmContract.id, (r.ok ? r.data.id : "")!) })).toBeUndefined();
  });
});

describe("termo de aceite", () => {
  it("só entrega aprovada gera o termo; anexa à entrega e cita o contrato emitido", async () => {
    const before = await buildAcceptanceRenderInput(deliverableId);
    expect(before?.input).toBeNull();
    expect((await generateAcceptanceTerm(admin, deliverableId)).ok).toBe(false);

    expect((await decideDeliverable(ctxA, { deliverableId, decision: "changes_requested", notes: "Falta a capa." })).ok).toBe(true);
    expect((await generateAcceptanceTerm(admin, deliverableId)).ok).toBe(false);
    // pedido de ajustes volta a entrega para "doing"; conclui de novo e o cliente aprova
    await db.update(projectDeliverable).set({ status: "done", completedAt: new Date() }).where(eq(projectDeliverable.id, deliverableId));
    expect((await decideDeliverable(ctxA, { deliverableId, decision: "approved", notes: "Tudo certo." })).ok).toBe(true);

    const built = await buildAcceptanceRenderInput(deliverableId, { reservations: "Capa será trocada." });
    expect(built?.input?.approval.name).toBe("Cliente A");
    expect(built?.input?.approval.notes).toBe("Tudo certo.");
    expect(built?.input?.contractNumber).toMatch(/^CT-/); // contrato assinado da oportunidade do projeto
    expect(built?.input?.client.name).toBe("Construtora Horizonte S.A.");

    expect((await generateAcceptanceTerm(admin, deliverableId, { reservations: "x".repeat(2001) })).ok).toBe(false);
    const r = await generateAcceptanceTerm(admin, deliverableId, { reservations: "Capa será trocada." });
    expect(r.ok).toBe(true);
    const d = await db.query.projectDeliverable.findFirst({ where: eq(projectDeliverable.id, deliverableId) });
    expect(d?.acceptanceFileId).toBe(r.ok ? r.data.fileId : null);
    const f = await db.query.files.findFirst({ where: eq(files.id, d!.acceptanceFileId!) });
    expect(f?.originalName).toBe("termo-aceite-Laudo-final.pdf");
    expect(f?.sizeBytes).toBeGreaterThan(5000);
    const again = await generateAcceptanceTerm(admin, deliverableId);
    expect(again.ok && again.data.fileId).not.toBe(r.ok ? r.data.fileId : "");
    const audits = await db.select().from(auditLog).where(and(eq(auditLog.action, "project.deliverable.acceptance_pdf_generated"), eq(auditLog.entityId, deliverableId)));
    expect(audits).toHaveLength(2);
  });
});
