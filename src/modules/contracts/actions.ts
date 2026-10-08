import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, crmContact, crmContract, crmOpportunity, crmProposal, crmProposalDecision, files, project, projectDeliverable, projectDeliverableAcceptance, projectInvoice, users } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { storeFile } from "@/modules/files/actions";
import { formatDateTime, formatIsoDate } from "@/lib/format";
import { getLegalSettings } from "@/modules/settings/queries";
import { parseStoredDocument } from "@/modules/crm/document";
import { renderDocPdf } from "@/modules/crm/doc-pdf";
import { BRAND } from "@/modules/crm/brand";
import { contractDocumentSchema, contractFromProposal, parseStoredContractDocument } from "./document";
import { contractBlocks, missingContractFields, type ContractRenderInput } from "./template";
import { acceptanceBlocks, type AcceptanceRenderInput } from "./acceptance-template";
import { nextContractNumber } from "./number";

const brand = { email: BRAND.email, phone: BRAND.phone, site: BRAND.site };

async function loadProposal(proposalId: string) {
  const [row] = await db
    .select({ proposal: crmProposal, opportunity: crmOpportunity, company: crmCompany })
    .from(crmProposal)
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .where(eq(crmProposal.id, proposalId))
    .limit(1);
  return row ?? null;
}

/**
 * Cria o contrato da proposta aceita, pré-preenchido com o documento da
 * proposta, o contato, as parcelas do projeto (se houver) e os dados legais.
 */
export async function createContractFromProposal(ctx: AdminContext, proposalId: string): Promise<ActionResult<{ id: string; number: string }>> {
  if (!isUuid(proposalId)) return fail("Proposta não encontrada.");
  const row = await loadProposal(proposalId);
  if (!row) return fail("Proposta não encontrada.");
  if (row.proposal.status !== "accepted") return fail("Só uma proposta aceita gera contrato.");
  const existing = await db.query.crmContract.findFirst({ where: eq(crmContract.proposalId, proposalId), columns: { id: true, number: true } });
  if (existing) return fail("Esta proposta já tem contrato.", undefined);

  const contact = row.proposal.contactId
    ? await db.query.crmContact.findFirst({ where: eq(crmContact.id, row.proposal.contactId), columns: { name: true, email: true } })
    : null;
  const proj = await db.query.project.findFirst({ where: eq(project.opportunityId, row.opportunity.id), columns: { id: true } });
  const invoices = proj
    ? await db
        .select({ description: projectInvoice.description, amountCents: projectInvoice.amountCents, dueAt: projectInvoice.dueAt })
        .from(projectInvoice)
        .where(and(eq(projectInvoice.projectId, proj.id)))
        .orderBy(asc(projectInvoice.number))
    : [];
  const legal = await getLegalSettings();
  const document = contractFromProposal({
    title: row.proposal.title,
    valueCents: row.proposal.valueCents,
    document: parseStoredDocument(row.proposal.document),
    contact: contact ? { name: contact.name, email: contact.email } : null,
    invoices: invoices.filter((i) => i.amountCents > 0),
    legal: { foro: legal.foro, representante: legal.representante || ctx.user.name },
  });
  const number = await nextContractNumber(db);
  const [created] = await db
    .insert(crmContract)
    .values({ number, proposalId, document, createdBy: ctx.user.id })
    .returning({ id: crmContract.id });
  await audit({ actorId: ctx.user.id, action: "crm.contract.created", entityType: "crm_contract", entityId: created.id, metadata: { number, proposalId, invoices: invoices.length } });
  return ok({ id: created.id, number });
}

export async function updateContractDocument(ctx: AdminContext, id: string, raw: unknown): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Contrato não encontrado.");
  const c = await db.query.crmContract.findFirst({ where: eq(crmContract.id, id), columns: { status: true, document: true } });
  if (!c) return fail("Contrato não encontrado.");
  if (c.status !== "draft") return fail("Contrato emitido: volte para rascunho para editar.");
  // campos ausentes mantêm o valor gravado (o formulário manda tudo; a API pode mandar parte)
  const merged = { ...parseStoredContractDocument(c.document), ...(raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) };
  const parsed = contractDocumentSchema.safeParse(merged);
  if (!parsed.success) return fromZod(parsed.error);
  await db.update(crmContract).set({ document: parsed.data }).where(eq(crmContract.id, id));
  await audit({ actorId: ctx.user.id, action: "crm.contract.updated", entityType: "crm_contract", entityId: id });
  return ok(null);
}

/** Entrada do renderizador a partir do contrato gravado (também usada pela prévia). */
export async function buildContractRenderInput(id: string, opts: { version?: number; now?: Date } = {}) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({ contract: crmContract, proposal: crmProposal, opportunity: crmOpportunity, company: crmCompany, file: files, decidedAt: crmProposalDecision.decidedAt })
    .from(crmContract)
    .innerJoin(crmProposal, eq(crmContract.proposalId, crmProposal.id))
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .leftJoin(files, eq(crmContract.fileId, files.id))
    .leftJoin(crmProposalDecision, eq(crmProposalDecision.proposalId, crmProposal.id))
    .where(eq(crmContract.id, id))
    .limit(1);
  if (!row) return null;
  const legal = await getLegalSettings();
  const acceptedAt = row.decidedAt ?? row.proposal.decidedAt;
  const input: ContractRenderInput = {
    number: row.contract.number,
    version: opts.version ?? Math.max(1, row.contract.documentVersion),
    issuedOn: formatIsoDate(row.contract.issuedAt ?? opts.now ?? new Date()),
    proposal: { number: row.proposal.number, version: row.proposal.documentVersion, title: row.proposal.title, valueCents: row.proposal.valueCents, acceptedOn: acceptedAt ? formatIsoDate(acceptedAt) : null },
    parties: {
      egd: { razaoSocial: legal.razaoSocial, cnpj: legal.cnpj, endereco: legal.endereco, representante: legal.representante, cargo: legal.cargo },
      client: {
        name: row.company.name,
        legalName: row.company.legalName ?? "",
        cnpj: row.company.cnpj ?? "",
        address: row.company.address ?? "",
        representativeName: row.company.representativeName ?? "",
        representativeRole: row.company.representativeRole ?? "",
      },
    },
    document: parseStoredContractDocument(row.contract.document),
  };
  return { row, input, missing: missingContractFields(input) };
}

async function renderAndStore(ctx: AdminContext, id: string, now: Date): Promise<ActionResult<{ fileId: string; version: number }>> {
  const built = await buildContractRenderInput(id, { now });
  if (!built) return fail("Contrato não encontrado.");
  const version = built.row.contract.documentVersion + 1;
  const input = { ...built.input, version };
  const pdf = await renderDocPdf({
    headerLabel: `Contrato · ${input.number} · v${version}`,
    info: { title: `Contrato ${input.number} v${version} · ${input.proposal.title}`, subject: built.row.company.name },
    blocks: contractBlocks(input),
    brand,
  });
  const stored = await storeFile(ctx, new File([new Uint8Array(pdf)], `${input.number}-v${version}.pdf`, { type: "application/pdf" }), null);
  if (!stored.ok) return stored;
  await db.update(crmContract).set({ fileId: stored.data.id, documentVersion: version }).where(eq(crmContract.id, id));
  await audit({ actorId: ctx.user.id, action: "crm.contract.pdf_generated", entityType: "crm_contract", entityId: id, metadata: { version, fileId: stored.data.id, bytes: pdf.length, missing: built.missing } });
  return ok({ fileId: stored.data.id, version });
}

/** Gera a próxima versão do PDF e a guarda como arquivo interno (só em rascunho). */
export async function generateContractPdf(ctx: AdminContext, id: string, now = new Date()): Promise<ActionResult<{ fileId: string; version: number }>> {
  if (!isUuid(id)) return fail("Contrato não encontrado.");
  const c = await db.query.crmContract.findFirst({ where: eq(crmContract.id, id), columns: { status: true } });
  if (!c) return fail("Contrato não encontrado.");
  if (c.status !== "draft") return fail("Contrato emitido: o PDF final já foi gerado.");
  return renderAndStore(ctx, id, now);
}

/** Emite: gera a versão final do PDF, bloqueia a edição e libera o download no portal. */
export async function issueContract(ctx: AdminContext, id: string, now = new Date()): Promise<ActionResult<{ version: number }>> {
  if (!isUuid(id)) return fail("Contrato não encontrado.");
  const c = await db.query.crmContract.findFirst({ where: eq(crmContract.id, id), columns: { status: true } });
  if (!c) return fail("Contrato não encontrado.");
  if (c.status !== "draft") return fail("Contrato já emitido.");
  await db.update(crmContract).set({ issuedAt: now }).where(eq(crmContract.id, id));
  const r = await renderAndStore(ctx, id, now);
  if (!r.ok) {
    await db.update(crmContract).set({ issuedAt: null }).where(eq(crmContract.id, id));
    return r;
  }
  await db.update(crmContract).set({ status: "issued" }).where(eq(crmContract.id, id));
  await audit({ actorId: ctx.user.id, action: "crm.contract.issued", entityType: "crm_contract", entityId: id, metadata: { version: r.data.version } });
  return ok({ version: r.data.version });
}

/** Volta um contrato emitido (não assinado) para rascunho: o PDF emitido some do portal até nova emissão. */
export async function reopenContract(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Contrato não encontrado.");
  const c = await db.query.crmContract.findFirst({ where: eq(crmContract.id, id), columns: { status: true } });
  if (!c) return fail("Contrato não encontrado.");
  if (c.status !== "issued") return fail(c.status === "signed" ? "Contrato assinado não volta para rascunho." : "Contrato já está em rascunho.");
  await db.update(crmContract).set({ status: "draft", issuedAt: null }).where(eq(crmContract.id, id));
  await audit({ actorId: ctx.user.id, action: "crm.contract.reopened", entityType: "crm_contract", entityId: id });
  return ok(null);
}

export async function markContractSigned(ctx: AdminContext, id: string, signedAt: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Contrato não encontrado.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(signedAt) || Number.isNaN(Date.parse(signedAt))) return fail("Informe a data da assinatura.", { signedAt: ["Data inválida"] });
  const c = await db.query.crmContract.findFirst({ where: eq(crmContract.id, id), columns: { status: true } });
  if (!c) return fail("Contrato não encontrado.");
  if (c.status !== "issued") return fail("Só um contrato emitido pode ser marcado como assinado.");
  await db.update(crmContract).set({ status: "signed", signedAt: new Date(`${signedAt}T12:00:00Z`) }).where(eq(crmContract.id, id));
  await audit({ actorId: ctx.user.id, action: "crm.contract.signed", entityType: "crm_contract", entityId: id, metadata: { signedAt } });
  return ok(null);
}

// ── Termo de aceite da entrega aprovada ─────────────────────────────────────

/** Entrada do termo: entrega, projeto, cliente, última aprovação e contrato (se houver). */
export async function buildAcceptanceRenderInput(deliverableId: string, opts: { reservations?: string; now?: Date } = {}) {
  if (!isUuid(deliverableId)) return null;
  const [row] = await db
    .select({ deliverable: projectDeliverable, project, company: crmCompany })
    .from(projectDeliverable)
    .innerJoin(project, eq(projectDeliverable.projectId, project.id))
    .innerJoin(crmCompany, eq(project.companyId, crmCompany.id))
    .where(eq(projectDeliverable.id, deliverableId))
    .limit(1);
  if (!row) return null;
  const [last] = await db
    .select({ decision: projectDeliverableAcceptance.decision, notes: projectDeliverableAcceptance.notes, createdAt: projectDeliverableAcceptance.createdAt, name: users.name, email: users.email })
    .from(projectDeliverableAcceptance)
    .innerJoin(users, eq(projectDeliverableAcceptance.userId, users.id))
    .where(eq(projectDeliverableAcceptance.deliverableId, deliverableId))
    .orderBy(desc(projectDeliverableAcceptance.createdAt))
    .limit(1);
  if (!last || last.decision !== "approved") return { row, input: null as AcceptanceRenderInput | null, reason: "A entrega ainda não foi aprovada pelo cliente no portal." };
  // contrato emitido ou assinado mais recente da oportunidade do projeto (rascunho não vale como referência)
  const [contract] = await db
    .select({ number: crmContract.number })
    .from(crmContract)
    .innerJoin(crmProposal, eq(crmContract.proposalId, crmProposal.id))
    .where(and(eq(crmProposal.opportunityId, row.project.opportunityId), inArray(crmContract.status, ["issued", "signed"])))
    .orderBy(desc(crmContract.createdAt))
    .limit(1);
  const legal = await getLegalSettings();
  const input: AcceptanceRenderInput = {
    contractNumber: contract?.number ?? null,
    projectTitle: row.project.title,
    client: { name: row.company.legalName || row.company.name, representative: row.company.representativeName || null },
    deliverable: { title: row.deliverable.title, description: row.deliverable.description, completedOn: row.deliverable.completedAt ? formatIsoDate(row.deliverable.completedAt) : null },
    approval: { name: last.name, email: last.email, at: formatDateTime(last.createdAt), notes: last.notes, ipHash: null },
    reservations: opts.reservations ?? "",
    egd: { representante: legal.representante, cargo: legal.cargo, razaoSocial: legal.razaoSocial },
    place: "São Paulo",
    issuedOn: formatIsoDate(opts.now ?? new Date()),
    version: 1,
  };
  return { row, input, reason: null };
}

/** Gera o termo de aceite da entrega aprovada e o anexa à entrega (`acceptance_file_id`). */
export async function generateAcceptanceTerm(ctx: AdminContext, deliverableId: string, opts: { reservations?: string; now?: Date } = {}): Promise<ActionResult<{ fileId: string }>> {
  const reservations = (opts.reservations ?? "").trim();
  if (reservations.length > 2000) return fail("Ressalvas: máximo 2000 caracteres.", { reservations: ["Máximo 2000 caracteres"] });
  const built = await buildAcceptanceRenderInput(deliverableId, { reservations, now: opts.now });
  if (!built) return fail("Entrega não encontrada.");
  if (!built.input) return fail(built.reason ?? "Entrega sem aprovação.");
  const prior = await db.select({ n: files.id }).from(files).where(eq(files.id, built.row.deliverable.acceptanceFileId ?? "00000000-0000-0000-0000-000000000000"));
  const version = prior.length ? 2 : 1;
  const input = { ...built.input, version };
  const pdf = await renderDocPdf({
    headerLabel: `Termo de aceite · ${built.row.project.title}`,
    info: { title: `Termo de aceite · ${input.deliverable.title}`, subject: built.row.company.name },
    blocks: acceptanceBlocks(input),
    brand,
  });
  const safe = input.deliverable.title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "entrega";
  const stored = await storeFile(ctx, new File([new Uint8Array(pdf)], `termo-aceite-${safe}.pdf`, { type: "application/pdf" }), null);
  if (!stored.ok) return stored;
  await db.update(projectDeliverable).set({ acceptanceFileId: stored.data.id }).where(eq(projectDeliverable.id, deliverableId));
  await audit({ actorId: ctx.user.id, action: "project.deliverable.acceptance_pdf_generated", entityType: "project_deliverable", entityId: deliverableId, metadata: { fileId: stored.data.id, reservations: Boolean(reservations), bytes: pdf.length } });
  return ok({ fileId: stored.data.id });
}
