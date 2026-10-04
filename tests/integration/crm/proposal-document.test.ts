import { describe, it, expect, beforeAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, crmCompany, crmContact, crmInteraction, crmOpportunity, crmProposal, files } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { createProposal, generateProposalPdf, sendProposalByEmail, updateProposalDocument } from "@/modules/crm/actions";
import { getProposal } from "@/modules/crm/queries";
import { emptyDocument } from "@/modules/crm/document";
import { ensureTestAdmin } from "../setup";

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
let admin: AdminContext;
let companyId: string;
let otherCompanyId: string;
let opportunityId: string;
let contactId: string;
let contactNoEmail: string;
let otherContact: string;

beforeAll(async () => {
  admin = await ensureTestAdmin();
  const [c] = await db.insert(crmCompany).values({ name: "Construtora Horizonte", slug: "horizonte", ownerId: admin.user.id }).returning({ id: crmCompany.id });
  const [o] = await db.insert(crmCompany).values({ name: "Outra", slug: "outra", ownerId: admin.user.id }).returning({ id: crmCompany.id });
  companyId = c.id;
  otherCompanyId = o.id;
  const [opp] = await db.insert(crmOpportunity).values({ companyId, title: "Integração ERP", stage: "proposal", ownerId: admin.user.id }).returning({ id: crmOpportunity.id });
  opportunityId = opp.id;
  const stamp = Date.now();
  const [ct] = await db.insert(crmContact).values({ companyId, name: "Marina Souza", email: `marina-${stamp}@horizonte.test`, title: "Diretora", ownerId: admin.user.id }).returning({ id: crmContact.id });
  const [ct2] = await db.insert(crmContact).values({ companyId, name: "Sem Email", role: "other", ownerId: admin.user.id }).returning({ id: crmContact.id });
  const [ct3] = await db.insert(crmContact).values({ companyId: otherCompanyId, name: "De Outra", email: "outra@x.test", ownerId: admin.user.id }).returning({ id: crmContact.id });
  contactId = ct.id;
  contactNoEmail = ct2.id;
  otherContact = ct3.id;
});

async function newProposal(title = "Proposta de integração") {
  const r = await createProposal(admin, { opportunityId, title, valueCents: "4850000", currency: "BRL", validUntil: "2026-12-31" });
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.data;
}

describe("documento", () => {
  it("salva só em rascunho e recusa conteúdo inválido", async () => {
    const { id } = await newProposal();
    const doc = { ...emptyDocument(), context: "Cenário atual.", deliverables: [{ title: "Conector", acceptance: "D+1", due: "Semana 4" }] };
    expect((await updateProposalDocument(admin, id, doc)).ok).toBe(true);
    const row = await getProposal(admin, id);
    expect((row?.proposal.document as { context: string }).context).toBe("Cenário atual.");
    const bad = await updateProposalDocument(admin, id, { ...doc, deliverables: Array.from({ length: 13 }, () => ({ title: "x" })) });
    expect(bad.ok).toBe(false);
    expect(await db.select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, "crm.proposal.document_updated")))).toHaveLength(1);
  });

  it("gera o PDF, grava arquivo interno, versiona e substitui o anexo", async () => {
    const { id, number } = await newProposal();
    await updateProposalDocument(admin, id, { ...emptyDocument(), context: "Contexto." });
    const v1 = await generateProposalPdf(admin, id);
    expect(v1.ok && v1.data.version).toBe(1);
    const f1 = await db.query.files.findFirst({ where: eq(files.id, (v1.ok && v1.data.fileId) as string) });
    expect(f1?.originalName).toBe(`${number}-v1.pdf`);
    expect(f1?.mimeType).toBe("application/pdf");
    expect(f1?.organizationId).toBeNull();
    expect(f1?.sizeBytes).toBeGreaterThan(5000);
    const v2 = await generateProposalPdf(admin, id);
    expect(v2.ok && v2.data.version).toBe(2);
    const row = await getProposal(admin, id);
    expect(row?.proposal.documentVersion).toBe(2);
    expect(row?.file?.originalName).toBe(`${number}-v2.pdf`);
    // o v1 continua em files
    expect(await db.query.files.findFirst({ where: eq(files.id, f1!.id) })).toBeTruthy();
  });
});

describe("envio por e-mail", () => {
  it("sem PDF falha; contato de outra empresa ou sem e-mail é recusado", async () => {
    const { id } = await newProposal();
    const noPdf = await sendProposalByEmail(admin, id, { contactId, message: "Segue a proposta." });
    expect(noPdf.ok).toBe(false);
    await generateProposalPdf(admin, id);
    expect((await sendProposalByEmail(admin, id, { contactId: otherContact, message: "Segue a proposta." })).ok).toBe(false);
    expect((await sendProposalByEmail(admin, id, { contactId: contactNoEmail, message: "Segue a proposta." })).ok).toBe(false);
    expect((await sendProposalByEmail(admin, id, { contactId, message: "oi" })).ok).toBe(false);
  });

  it("envia com o PDF anexo, muda rascunho → enviada, registra a interação e o contato", async () => {
    const { id, number } = await newProposal("Painel de custos");
    await updateProposalDocument(admin, id, { ...emptyDocument(), objective: "Objetivo." });
    await generateProposalPdf(admin, id);
    const r = await sendProposalByEmail(admin, id, { contactId, message: "Conforme conversamos, segue a proposta." });
    expect(r).toEqual({ ok: true, data: null });
    const row = await getProposal(admin, id);
    expect(row?.proposal.status).toBe("sent");
    expect(row?.proposal.sentAt).not.toBeNull();
    expect(row?.proposal.emailedAt).not.toBeNull();
    expect(row?.proposal.contactId).toBe(contactId);
    const inter = await db.select().from(crmInteraction).where(and(eq(crmInteraction.opportunityId, opportunityId), eq(crmInteraction.contactId, contactId)));
    expect(inter.some((i) => i.type === "email" && i.summary.includes(number))).toBe(true);
    expect(await db.select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, "crm.proposal.emailed")))).toHaveLength(1);

    // Mailpit recebeu com o anexo PDF
    let found: { Subject: string; Attachments: number } | undefined;
    for (let i = 0; i < 20 && !found; i++) {
      const list = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=20`)).json()) as { messages?: { ID: string; Subject: string; Attachments: number }[] };
      found = list.messages?.find((m) => m.Subject.includes(number));
      if (!found) await new Promise((res) => setTimeout(res, 500));
    }
    expect(found?.Subject).toBe(`Proposta ${number} · Painel de custos`);
    expect(found?.Attachments).toBe(1);

    // reenvio em "sent" continua permitido; depois de aceita, não
    expect((await sendProposalByEmail(admin, id, { contactId, message: "Reenviando a proposta." })).ok).toBe(true);
    await db.update(crmProposal).set({ status: "accepted" }).where(eq(crmProposal.id, id));
    expect((await sendProposalByEmail(admin, id, { contactId, message: "Reenviando a proposta." })).ok).toBe(false);
    expect((await generateProposalPdf(admin, id)).ok).toBe(false);
    expect((await updateProposalDocument(admin, id, emptyDocument())).ok).toBe(false);
  });
});
