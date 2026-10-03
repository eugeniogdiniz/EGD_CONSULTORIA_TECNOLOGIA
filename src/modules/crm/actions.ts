import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmCompany,
  crmContact,
  crmInteraction,
  crmOpportunity,
  crmProposal,
  files,
  leads,
  organizations,
  crmService,
} from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { slugify } from "@/modules/tenancy/slug";
import { storeFile, uploadFile } from "@/modules/files/actions";
import { getObject } from "@/lib/storage";
import { sendProposalEmail } from "@/modules/mail/send";
import { formatIsoDate } from "@/lib/format";
import { parseStoredDocument, proposalDocumentSchema } from "./document";
import { serviceSchema, type ServiceInput } from "./validation";
import { renderProposalPdf } from "./proposal-pdf";
import { BRAND } from "./brand";
import { z } from "zod";
import { nextProposalNumber } from "./proposal-number";
import {
  changeProposalStatusSchema,
  changeStageSchema,
  companySchema,
  contactSchema,
  interactionSchema,
  opportunitySchema,
  proposalSchema,
  type ChangeProposalStatusInput,
  type ChangeStageInput,
  type CompanyInput,
  type ContactInput,
  type InteractionInput,
  type OpportunityInput,
  type ProposalInput,
} from "./validation";

// ────────────────────────────────────────────────────────────────────────────
// Slug único (Fase 1 tenancy usa check-then-fail; aqui geramos automático a
// partir do nome, então buscamos o próximo livre com sufixo numérico)
// ────────────────────────────────────────────────────────────────────────────

async function findFreeSlug(base: string, exceptId?: string): Promise<string> {
  const clean = base || "empresa";
  let candidate = clean;
  let suffix = 1;
  // Bounded loop: 1..99 é mais que suficiente na prática.
  while (suffix < 100) {
    const existing = await db.query.crmCompany.findFirst({
      where: eq(crmCompany.slug, candidate),
      columns: { id: true },
    });
    if (!existing || existing.id === exceptId) return candidate;
    suffix += 1;
    candidate = `${clean}-${suffix}`;
  }
  throw new Error(`Não foi possível gerar slug livre a partir de "${base}"`);
}

// ────────────────────────────────────────────────────────────────────────────
// Empresa
// ────────────────────────────────────────────────────────────────────────────

async function findCompanyByCnpj(cnpj: string, exceptId?: string) {
  const row = await db.query.crmCompany.findFirst({
    where: eq(crmCompany.cnpj, cnpj),
    columns: { id: true, name: true },
  });
  return row && row.id !== exceptId ? row : null;
}

export async function createCompany(
  ctx: AdminContext,
  input: CompanyInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  if (data.cnpj) {
    const dup = await findCompanyByCnpj(data.cnpj);
    if (dup)
      return fail(`Esse CNPJ já está cadastrado em "${dup.name}".`, { cnpj: ["Em uso"] });
  }

  const slug = await findFreeSlug(slugify(data.name));

  const [row] = await db
    .insert(crmCompany)
    .values({
      name: data.name,
      slug,
      cnpj: data.cnpj,
      website: data.website,
      industry: data.industry,
      size: data.size,
      source: data.source,
      notes: data.notes,
      ownerId: ctx.user.id,
    })
    .returning({ id: crmCompany.id });

  await audit({
    actorId: ctx.user.id,
    action: "crm.company.created",
    entityType: "crm_company",
    entityId: row.id,
    metadata: { name: data.name, slug, source: data.source },
  });

  return ok({ id: row.id, slug });
}

export async function updateCompany(
  ctx: AdminContext,
  id: string,
  input: CompanyInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Empresa não encontrada.");
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const existing = await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, id) });
  if (!existing) return fail("Empresa não encontrada.");

  if (data.cnpj && data.cnpj !== existing.cnpj) {
    const dup = await findCompanyByCnpj(data.cnpj, id);
    if (dup)
      return fail(`Esse CNPJ já está cadastrado em "${dup.name}".`, { cnpj: ["Em uso"] });
  }

  await db
    .update(crmCompany)
    .set({
      name: data.name,
      cnpj: data.cnpj,
      website: data.website,
      industry: data.industry,
      size: data.size,
      source: data.source,
      notes: data.notes,
    })
    .where(eq(crmCompany.id, id));

  await audit({
    actorId: ctx.user.id,
    action: "crm.company.updated",
    entityType: "crm_company",
    entityId: id,
    metadata: { name: data.name, cnpj: data.cnpj },
  });
  return ok(null);
}

export async function archiveCompany(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Empresa não encontrada.");
  const [row] = await db
    .update(crmCompany)
    .set({ archivedAt: new Date() })
    .where(and(eq(crmCompany.id, id), isNull(crmCompany.archivedAt)))
    .returning({ id: crmCompany.id });
  if (!row) return fail("Empresa não encontrada ou já arquivada.");
  await audit({
    actorId: ctx.user.id,
    action: "crm.company.archived",
    entityType: "crm_company",
    entityId: id,
  });
  return ok(null);
}

export async function unarchiveCompany(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Empresa não encontrada.");
  const [row] = await db
    .update(crmCompany)
    .set({ archivedAt: null })
    .where(eq(crmCompany.id, id))
    .returning({ id: crmCompany.id });
  if (!row) return fail("Empresa não encontrada.");
  await audit({
    actorId: ctx.user.id,
    action: "crm.company.unarchived",
    entityType: "crm_company",
    entityId: id,
  });
  return ok(null);
}

export async function linkCompanyToOrganization(
  ctx: AdminContext,
  companyId: string,
  organizationId: string | null,
): Promise<ActionResult<null>> {
  if (!isUuid(companyId)) return fail("Empresa não encontrada.");
  if (organizationId !== null && !isUuid(organizationId))
    return fail("Organização inválida.");
  if (organizationId) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      columns: { id: true },
    });
    if (!org) return fail("Organização não encontrada.");
  }
  await db
    .update(crmCompany)
    .set({ linkedOrganizationId: organizationId })
    .where(eq(crmCompany.id, companyId));
  await audit({
    actorId: ctx.user.id,
    action: organizationId
      ? "crm.company.linked_to_organization"
      : "crm.company.unlinked_from_organization",
    entityType: "crm_company",
    entityId: companyId,
    organizationId: organizationId,
    metadata: organizationId ? { organizationId } : undefined,
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Contato
// ────────────────────────────────────────────────────────────────────────────

async function primaryExists(companyId: string, exceptId?: string) {
  const row = await db.query.crmContact.findFirst({
    where: and(
      eq(crmContact.companyId, companyId),
      eq(crmContact.role, "primary"),
      isNull(crmContact.archivedAt),
      exceptId ? ne(crmContact.id, exceptId) : undefined,
    ),
    columns: { id: true, name: true },
  });
  return row ?? null;
}

export async function createContact(
  ctx: AdminContext,
  input: ContactInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const company = await db.query.crmCompany.findFirst({
    where: eq(crmCompany.id, data.companyId),
    columns: { id: true },
  });
  if (!company) return fail("Empresa não encontrada.");

  if (data.role === "primary") {
    const other = await primaryExists(data.companyId);
    if (other)
      return fail(
        `Já existe um contato principal ativo ("${other.name}"). Mude o papel dele antes ou escolha outro papel aqui.`,
        { role: ["Já existe principal"] },
      );
  }

  const [row] = await db
    .insert(crmContact)
    .values({
      companyId: data.companyId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      title: data.title,
      notes: data.notes,
      ownerId: ctx.user.id,
    })
    .returning({ id: crmContact.id });

  await audit({
    actorId: ctx.user.id,
    action: "crm.contact.created",
    entityType: "crm_contact",
    entityId: row.id,
    metadata: { companyId: data.companyId, role: data.role },
  });
  return ok({ id: row.id });
}

export async function updateContact(
  ctx: AdminContext,
  id: string,
  input: ContactInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Contato não encontrado.");
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const existing = await db.query.crmContact.findFirst({ where: eq(crmContact.id, id) });
  if (!existing) return fail("Contato não encontrado.");
  if (existing.companyId !== data.companyId)
    return fail("Não é possível mover contato entre empresas.");

  if (data.role === "primary" && (existing.role !== "primary" || existing.archivedAt)) {
    const other = await primaryExists(data.companyId, id);
    if (other)
      return fail(
        `Já existe um contato principal ativo ("${other.name}"). Mude o papel dele antes ou escolha outro papel aqui.`,
        { role: ["Já existe principal"] },
      );
  }

  await db
    .update(crmContact)
    .set({
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      title: data.title,
      notes: data.notes,
    })
    .where(eq(crmContact.id, id));

  await audit({
    actorId: ctx.user.id,
    action: "crm.contact.updated",
    entityType: "crm_contact",
    entityId: id,
    metadata: { role: data.role },
  });
  return ok(null);
}

export async function archiveContact(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Contato não encontrado.");
  const [row] = await db
    .update(crmContact)
    .set({ archivedAt: new Date() })
    .where(and(eq(crmContact.id, id), isNull(crmContact.archivedAt)))
    .returning({ id: crmContact.id });
  if (!row) return fail("Contato não encontrado ou já arquivado.");
  await audit({
    actorId: ctx.user.id,
    action: "crm.contact.archived",
    entityType: "crm_contact",
    entityId: id,
  });
  return ok(null);
}

export async function unarchiveContact(
  ctx: AdminContext,
  id: string,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Contato não encontrado.");
  const existing = await db.query.crmContact.findFirst({ where: eq(crmContact.id, id) });
  if (!existing) return fail("Contato não encontrado.");
  if (existing.role === "primary") {
    const other = await primaryExists(existing.companyId, id);
    if (other)
      return fail(
        `Já existe um contato principal ativo ("${other.name}"). Mude o papel deste antes de desarquivar.`,
        { role: ["Já existe principal"] },
      );
  }
  await db.update(crmContact).set({ archivedAt: null }).where(eq(crmContact.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "crm.contact.unarchived",
    entityType: "crm_contact",
    entityId: id,
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Oportunidade
// ────────────────────────────────────────────────────────────────────────────

async function assertCompanyExists(companyId: string): Promise<string | null> {
  const c = await db.query.crmCompany.findFirst({
    where: eq(crmCompany.id, companyId),
    columns: { id: true },
  });
  return c ? null : "Empresa não encontrada.";
}

async function assertContactBelongsToCompany(
  contactId: string,
  companyId: string,
): Promise<string | null> {
  const c = await db.query.crmContact.findFirst({
    where: eq(crmContact.id, contactId),
    columns: { id: true, companyId: true, archivedAt: true },
  });
  if (!c) return "Contato principal não encontrado.";
  if (c.companyId !== companyId) return "Contato principal não pertence à empresa.";
  if (c.archivedAt) return "Contato principal está arquivado.";
  return null;
}

export async function createOpportunity(
  ctx: AdminContext,
  input: OpportunityInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = opportunitySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const companyErr = await assertCompanyExists(data.companyId);
  if (companyErr) return fail(companyErr, { companyId: [companyErr] });
  if (data.primaryContactId) {
    const contactErr = await assertContactBelongsToCompany(data.primaryContactId, data.companyId);
    if (contactErr) return fail(contactErr, { primaryContactId: [contactErr] });
  }

  const [row] = await db
    .insert(crmOpportunity)
    .values({
      companyId: data.companyId,
      primaryContactId: data.primaryContactId,
      title: data.title,
      stage: data.stage,
      valueCents: data.valueCents,
      currency: data.currency,
      expectedCloseAt: data.expectedCloseAt,
      nextStep: data.nextStep,
      nextStepAt: data.nextStepAt,
      ownerId: ctx.user.id,
    })
    .returning({ id: crmOpportunity.id });

  await audit({
    actorId: ctx.user.id,
    action: "crm.opportunity.created",
    entityType: "crm_opportunity",
    entityId: row.id,
    metadata: { companyId: data.companyId, stage: data.stage },
  });
  return ok({ id: row.id });
}

export async function updateOpportunity(
  ctx: AdminContext,
  id: string,
  input: OpportunityInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Oportunidade não encontrada.");
  const parsed = opportunitySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const existing = await db.query.crmOpportunity.findFirst({ where: eq(crmOpportunity.id, id) });
  if (!existing) return fail("Oportunidade não encontrada.");
  if (existing.companyId !== data.companyId)
    return fail("Não é possível mover oportunidade entre empresas.");
  if (data.primaryContactId) {
    const contactErr = await assertContactBelongsToCompany(data.primaryContactId, data.companyId);
    if (contactErr) return fail(contactErr, { primaryContactId: [contactErr] });
  }

  await db
    .update(crmOpportunity)
    .set({
      primaryContactId: data.primaryContactId,
      title: data.title,
      valueCents: data.valueCents,
      currency: data.currency,
      expectedCloseAt: data.expectedCloseAt,
      nextStep: data.nextStep,
      nextStepAt: data.nextStepAt,
    })
    .where(eq(crmOpportunity.id, id));

  await audit({
    actorId: ctx.user.id,
    action: "crm.opportunity.updated",
    entityType: "crm_opportunity",
    entityId: id,
  });
  return ok(null);
}

/**
 * Muda o estágio. Won grava wonAt e zera lostAt/lostReason; lost exige
 * motivo e zera wonAt; qualquer reabertura (voltar para estágio aberto)
 * zera ambos. Se o estágio de destino é o mesmo do atual, não grava audit.
 */
export async function changeOpportunityStage(
  ctx: AdminContext,
  id: string,
  input: ChangeStageInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Oportunidade não encontrada.");
  const parsed = changeStageSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { to, lostReason } = parsed.data;

  const existing = await db.query.crmOpportunity.findFirst({ where: eq(crmOpportunity.id, id) });
  if (!existing) return fail("Oportunidade não encontrada.");
  if (existing.stage === to) return ok(null);

  const patch: {
    stage: typeof to;
    wonAt: Date | null;
    lostAt: Date | null;
    lostReason: string | null;
  } = { stage: to, wonAt: null, lostAt: null, lostReason: null };

  if (to === "won") patch.wonAt = new Date();
  if (to === "lost") {
    patch.lostAt = new Date();
    patch.lostReason = lostReason ?? null;
  }

  await db.update(crmOpportunity).set(patch).where(eq(crmOpportunity.id, id));
  await audit({
    actorId: ctx.user.id,
    action:
      to === "won"
        ? "crm.opportunity.won"
        : to === "lost"
          ? "crm.opportunity.lost"
          : "crm.opportunity.stage_changed",
    entityType: "crm_opportunity",
    entityId: id,
    metadata: to === "lost"
      ? { from: existing.stage, to, reason: patch.lostReason }
      : { from: existing.stage, to },
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Interação
// ────────────────────────────────────────────────────────────────────────────

export async function createInteraction(
  ctx: AdminContext,
  input: InteractionInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = interactionSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const [row] = await db
    .insert(crmInteraction)
    .values({
      type: data.type,
      at: data.at,
      byUserId: ctx.user.id,
      summary: data.summary,
      body: data.body,
      companyId: data.companyId,
      contactId: data.contactId,
      opportunityId: data.opportunityId,
    })
    .returning({ id: crmInteraction.id });

  await audit({
    actorId: ctx.user.id,
    action: "crm.interaction.created",
    entityType: "crm_interaction",
    entityId: row.id,
    metadata: {
      type: data.type,
      companyId: data.companyId,
      contactId: data.contactId,
      opportunityId: data.opportunityId,
    },
  });
  return ok({ id: row.id });
}

export async function updateInteraction(
  ctx: AdminContext,
  id: string,
  input: InteractionInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Interação não encontrada.");
  const parsed = interactionSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const [row] = await db
    .update(crmInteraction)
    .set({
      type: data.type,
      at: data.at,
      summary: data.summary,
      body: data.body,
      companyId: data.companyId,
      contactId: data.contactId,
      opportunityId: data.opportunityId,
    })
    .where(and(eq(crmInteraction.id, id), isNull(crmInteraction.deletedAt)))
    .returning({ id: crmInteraction.id });
  if (!row) return fail("Interação não encontrada ou já removida.");

  await audit({
    actorId: ctx.user.id,
    action: "crm.interaction.updated",
    entityType: "crm_interaction",
    entityId: id,
  });
  return ok(null);
}

export async function deleteInteraction(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Interação não encontrada.");
  const [row] = await db
    .update(crmInteraction)
    .set({ deletedAt: new Date() })
    .where(and(eq(crmInteraction.id, id), isNull(crmInteraction.deletedAt)))
    .returning({ id: crmInteraction.id });
  if (!row) return fail("Interação não encontrada ou já removida.");
  await audit({
    actorId: ctx.user.id,
    action: "crm.interaction.deleted",
    entityType: "crm_interaction",
    entityId: id,
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Proposta
// ────────────────────────────────────────────────────────────────────────────

export async function createProposal(
  ctx: AdminContext,
  input: ProposalInput,
): Promise<ActionResult<{ id: string; number: string }>> {
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const opportunity = await db.query.crmOpportunity.findFirst({
    where: eq(crmOpportunity.id, data.opportunityId),
    columns: { id: true },
  });
  if (!opportunity) return fail("Oportunidade não encontrada.");

  const result = await db.transaction(async (tx) => {
    const number = await nextProposalNumber(tx);
    const [row] = await tx
      .insert(crmProposal)
      .values({
        number,
        opportunityId: data.opportunityId,
        title: data.title,
        valueCents: data.valueCents,
        currency: data.currency,
        status: "draft",
        validUntil: data.validUntil,
        ownerId: ctx.user.id,
      })
      .returning({ id: crmProposal.id });
    return { id: row.id, number };
  });

  await audit({
    actorId: ctx.user.id,
    action: "crm.proposal.created",
    entityType: "crm_proposal",
    entityId: result.id,
    metadata: { number: result.number, opportunityId: data.opportunityId },
  });
  return ok(result);
}

export async function updateProposal(
  ctx: AdminContext,
  id: string,
  input: ProposalInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Proposta não encontrada.");
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;

  const existing = await db.query.crmProposal.findFirst({ where: eq(crmProposal.id, id) });
  if (!existing) return fail("Proposta não encontrada.");
  if (existing.opportunityId !== data.opportunityId)
    return fail("Não é possível mover proposta entre oportunidades.");
  if (existing.status !== "draft")
    return fail("Uma proposta enviada só muda por transição de status.", { status: ["Só em rascunho"] });

  await db
    .update(crmProposal)
    .set({
      title: data.title,
      valueCents: data.valueCents,
      currency: data.currency,
      validUntil: data.validUntil,
    })
    .where(eq(crmProposal.id, id));
  await audit({
    actorId: ctx.user.id,
    action: "crm.proposal.updated",
    entityType: "crm_proposal",
    entityId: id,
  });
  return ok(null);
}

/**
 * Anexa (ou substitui) o arquivo da proposta. Reusa o módulo files da
 * Fase 1 para o upload; o proprietário do arquivo é o admin, sem organização.
 */
export async function attachProposalFile(
  ctx: AdminContext,
  proposalId: string,
  formData: FormData,
): Promise<ActionResult<{ fileId: string }>> {
  if (!isUuid(proposalId)) return fail("Proposta não encontrada.");
  const proposal = await db.query.crmProposal.findFirst({
    where: eq(crmProposal.id, proposalId),
    columns: { id: true },
  });
  if (!proposal) return fail("Proposta não encontrada.");

  // Garante que uploadFile leia organizationId = null (arquivo interno do admin).
  if (!formData.has("organizationId")) formData.append("organizationId", "");

  const upload = await uploadFile(ctx, formData);
  if (!upload.ok) return upload;

  await db.update(crmProposal).set({ fileId: upload.data.id }).where(eq(crmProposal.id, proposalId));
  await audit({
    actorId: ctx.user.id,
    action: "crm.proposal.file_attached",
    entityType: "crm_proposal",
    entityId: proposalId,
    metadata: { fileId: upload.data.id },
  });
  return ok({ fileId: upload.data.id });
}

// ────────────────────────────────────────────────────────────────────────────
// Conversão de lead → empresa + contato + oportunidade (transação)
// ────────────────────────────────────────────────────────────────────────────

export type ConversionPlan =
  | {
      mode: "link";
      companyId: string;
      contact: Omit<ContactInput, "companyId">;
      opportunity: Omit<OpportunityInput, "companyId">;
    }
  | {
      mode: "create";
      company: CompanyInput;
      contact: Omit<ContactInput, "companyId">;
      opportunity: Omit<OpportunityInput, "companyId">;
    };

/**
 * Converte um lead do site em empresa + contato + oportunidade, tudo em
 * uma transação. Se o lead já foi convertido (segunda tentativa, corrida
 * entre duas abas), devolve fail citando a empresa existente.
 */
export async function convertLead(
  ctx: AdminContext,
  leadId: string,
  plan: ConversionPlan,
): Promise<ActionResult<{ companyId: string; contactId: string; opportunityId: string }>> {
  if (!isUuid(leadId)) return fail("Lead não encontrado.");

  // Validações prévias (fora da transação, pra falhar rápido)
  let companyData: ReturnType<typeof companySchema.parse> | null = null;

  if (plan.mode === "create") {
    const parsedCompany = companySchema.safeParse(plan.company);
    if (!parsedCompany.success) return fromZod(parsedCompany.error);
    companyData = parsedCompany.data;
    if (companyData.cnpj) {
      const dup = await findCompanyByCnpj(companyData.cnpj);
      if (dup) return fail(`Esse CNPJ já está cadastrado em "${dup.name}".`, { cnpj: ["Em uso"] });
    }
  } else if (!isUuid(plan.companyId)) {
    return fail("Empresa não encontrada.");
  }

  // Validação de contato e oportunidade usa companyId provisório se create,
  // então injetamos um placeholder e trocamos depois.
  const linkedCompanyId = plan.mode === "link" ? plan.companyId : "00000000-0000-4000-8000-000000000000";
  const parsedContact = contactSchema.safeParse({ ...plan.contact, companyId: linkedCompanyId });
  if (!parsedContact.success) return fromZod(parsedContact.error);
  let contactData = parsedContact.data;

  const parsedOpportunity = opportunitySchema.safeParse({ ...plan.opportunity, companyId: linkedCompanyId });
  if (!parsedOpportunity.success) return fromZod(parsedOpportunity.error);
  const opportunityData = parsedOpportunity.data;

  // Auto-downgrade do contato principal quando a empresa já tem um (link mode).
  if (plan.mode === "link" && contactData.role === "primary") {
    const other = await primaryExists(plan.companyId);
    if (other) contactData = { ...contactData, role: "other" };
  }

  const result = await db.transaction(async (tx) => {
    // Lock pessimista no lead pra impedir duas conversões simultâneas.
    const locked = await tx.execute<{
      id: string;
      converted_at: Date | null;
      converted_company_id: string | null;
    }>(
      sql`select id, converted_at, converted_company_id from leads where id = ${leadId} for update`,
    );
    const lead = locked[0];
    if (!lead) return { type: "fail" as const, error: "Lead não encontrado." };
    if (lead.converted_at) {
      const other = lead.converted_company_id
        ? await tx.query.crmCompany.findFirst({
            where: eq(crmCompany.id, lead.converted_company_id),
            columns: { name: true },
          })
        : null;
      return {
        type: "fail" as const,
        error: `Este lead já foi convertido${other ? ` em "${other.name}"` : ""}.`,
      };
    }

    // Empresa
    let companyId: string;
    if (plan.mode === "create" && companyData) {
      const slug = await findFreeSlug(slugify(companyData.name));
      const [row] = await tx
        .insert(crmCompany)
        .values({
          name: companyData.name,
          slug,
          cnpj: companyData.cnpj,
          website: companyData.website,
          industry: companyData.industry,
          size: companyData.size,
          source: "site_contact",
          notes: companyData.notes,
          ownerId: ctx.user.id,
        })
        .returning({ id: crmCompany.id });
      companyId = row.id;
    } else if (plan.mode === "link") {
      const c = await tx.query.crmCompany.findFirst({
        where: eq(crmCompany.id, plan.companyId),
        columns: { id: true },
      });
      if (!c) return { type: "fail" as const, error: "Empresa não encontrada." };
      companyId = c.id;
    } else {
      return { type: "fail" as const, error: "Plano de conversão inválido." };
    }

    // Contato
    const [contactRow] = await tx
      .insert(crmContact)
      .values({
        companyId,
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        role: contactData.role,
        title: contactData.title,
        notes: contactData.notes,
        ownerId: ctx.user.id,
      })
      .returning({ id: crmContact.id });

    // Oportunidade
    const [oppRow] = await tx
      .insert(crmOpportunity)
      .values({
        companyId,
        primaryContactId: contactRow.id,
        title: opportunityData.title,
        stage: opportunityData.stage,
        valueCents: opportunityData.valueCents,
        currency: opportunityData.currency,
        expectedCloseAt: opportunityData.expectedCloseAt,
        nextStep: opportunityData.nextStep,
        nextStepAt: opportunityData.nextStepAt,
        ownerId: ctx.user.id,
      })
      .returning({ id: crmOpportunity.id });

    // Lead
    await tx
      .update(leads)
      .set({
        convertedCompanyId: companyId,
        convertedContactId: contactRow.id,
        convertedOpportunityId: oppRow.id,
        convertedAt: new Date(),
        convertedBy: ctx.user.id,
        status: "converted",
      })
      .where(eq(leads.id, leadId));

    return {
      type: "ok" as const,
      created: plan.mode === "create",
      companyId,
      contactId: contactRow.id,
      opportunityId: oppRow.id,
    };
  });

  if (result.type === "fail") return fail(result.error);

  if (result.created) {
    await audit({
      actorId: ctx.user.id,
      action: "crm.company.created",
      entityType: "crm_company",
      entityId: result.companyId,
      metadata: { via: "lead_conversion", leadId },
    });
  }
  await audit({
    actorId: ctx.user.id,
    action: "crm.contact.created",
    entityType: "crm_contact",
    entityId: result.contactId,
    metadata: { via: "lead_conversion", leadId, companyId: result.companyId },
  });
  await audit({
    actorId: ctx.user.id,
    action: "crm.opportunity.created",
    entityType: "crm_opportunity",
    entityId: result.opportunityId,
    metadata: { via: "lead_conversion", leadId, companyId: result.companyId },
  });
  await audit({
    actorId: ctx.user.id,
    action: "crm.lead.converted",
    entityType: "lead",
    entityId: leadId,
    metadata: {
      companyId: result.companyId,
      contactId: result.contactId,
      opportunityId: result.opportunityId,
    },
  });

  return ok({
    companyId: result.companyId,
    contactId: result.contactId,
    opportunityId: result.opportunityId,
  });
}

/**
 * Regras da transição de status:
 *  - draft → sent: exige file_id (fieldError em status).
 *  - sent → accepted/rejected/expired: grava decidedAt.
 *  - qualquer → draft: reabre (limpa sentAt e decidedAt).
 *  - Mesmo status devolve ok(null) sem gravar audit.
 */
export async function changeProposalStatus(
  ctx: AdminContext,
  id: string,
  input: ChangeProposalStatusInput,
): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Proposta não encontrada.");
  const parsed = changeProposalStatusSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { to, decisionNotes, sentAt, validUntil } = parsed.data;

  const existing = await db.query.crmProposal.findFirst({ where: eq(crmProposal.id, id) });
  if (!existing) return fail("Proposta não encontrada.");
  if (existing.status === to) return ok(null);

  if (to === "sent" && !existing.fileId)
    return fail("Uma proposta enviada precisa ter arquivo anexado.", { status: ["Anexo obrigatório"] });

  const patch: {
    status: typeof to;
    sentAt: Date | null;
    decidedAt: Date | null;
    decisionNotes: string | null;
    validUntil: string | null;
  } = {
    status: to,
    sentAt: existing.sentAt,
    decidedAt: existing.decidedAt,
    decisionNotes: existing.decisionNotes,
    validUntil: existing.validUntil,
  };

  if (to === "sent") {
    patch.sentAt = sentAt ? new Date(`${sentAt}T00:00:00Z`) : new Date();
    patch.validUntil = validUntil ?? existing.validUntil;
    patch.decidedAt = null;
    patch.decisionNotes = null;
  } else if (to === "accepted" || to === "rejected" || to === "expired") {
    patch.decidedAt = new Date();
    if (decisionNotes) patch.decisionNotes = decisionNotes;
  } else if (to === "draft") {
    patch.sentAt = null;
    patch.decidedAt = null;
    patch.decisionNotes = null;
  }

  await db.update(crmProposal).set(patch).where(eq(crmProposal.id, id));
  await audit({
    actorId: ctx.user.id,
    action:
      to === "sent"
        ? "crm.proposal.sent"
        : to === "accepted"
          ? "crm.proposal.accepted"
          : to === "rejected"
            ? "crm.proposal.rejected"
            : to === "expired"
              ? "crm.proposal.expired"
              : "crm.proposal.reopened",
    entityType: "crm_proposal",
    entityId: id,
    metadata: { from: existing.status, to },
  });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Documento da proposta: conteúdo, PDF e envio por e-mail (Fase 16)
// ────────────────────────────────────────────────────────────────────────────

/** Só em rascunho: o conteúdo enviado ao cliente não muda por baixo do PDF. */
export async function updateProposalDocument(ctx: AdminContext, id: string, input: unknown): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Proposta não encontrada.");
  const existing = await db.query.crmProposal.findFirst({ where: eq(crmProposal.id, id), columns: { id: true, status: true } });
  if (!existing) return fail("Proposta não encontrada.");
  if (existing.status !== "draft") return fail("O documento só pode ser editado enquanto a proposta é rascunho.");
  const parsed = proposalDocumentSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  await db.update(crmProposal).set({ document: parsed.data }).where(eq(crmProposal.id, id));
  await audit({ actorId: ctx.user.id, action: "crm.proposal.document_updated", entityType: "crm_proposal", entityId: id });
  return ok(null);
}

async function loadProposalForDocument(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({ proposal: crmProposal, opportunity: crmOpportunity, company: crmCompany })
    .from(crmProposal)
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .where(eq(crmProposal.id, id))
    .limit(1);
  return row ?? null;
}

/** Monta a entrada do renderizador a partir da proposta gravada. `contactId` sobrescreve o contato gravado. */
export async function buildProposalPdfInput(id: string, opts: { version?: number; contactId?: string | null; signerName: string; now?: Date } ) {
  const row = await loadProposalForDocument(id);
  if (!row) return null;
  const contactId = opts.contactId === undefined ? row.proposal.contactId : opts.contactId;
  const contact = contactId
    ? await db.query.crmContact.findFirst({ where: and(eq(crmContact.id, contactId), eq(crmContact.companyId, row.company.id)), columns: { name: true, title: true, email: true } })
    : null;
  return {
    row,
    input: {
      number: row.proposal.number,
      version: opts.version ?? Math.max(1, row.proposal.documentVersion),
      title: row.proposal.title,
      valueCents: row.proposal.valueCents,
      issuedOn: formatIsoDate(opts.now ?? new Date()),
      validUntil: row.proposal.validUntil ? formatIsoDate(row.proposal.validUntil) : null,
      companyName: row.company.name,
      contactName: contact?.name ?? null,
      contactRole: contact?.title ?? null,
      document: parseStoredDocument(row.proposal.document),
      signer: { name: opts.signerName, role: BRAND.signerRole },
      brand: { email: BRAND.email, phone: BRAND.phone, site: BRAND.site },
    },
  };
}

/** Gera o PDF da versão seguinte, grava em `files` (interno) e passa a ser o anexo da proposta. */
export async function generateProposalPdf(ctx: AdminContext, id: string, now = new Date()): Promise<ActionResult<{ fileId: string; version: number }>> {
  const built = await buildProposalPdfInput(id, { signerName: ctx.user.name, now, version: undefined });
  if (!built) return fail("Proposta não encontrada.");
  const { row } = built;
  if (row.proposal.status !== "draft" && row.proposal.status !== "sent")
    return fail("Proposta decidida: o documento não pode ser gerado de novo.");
  const version = row.proposal.documentVersion + 1;
  const pdf = await renderProposalPdf({ ...built.input, version });
  const filename = `${row.proposal.number}-v${version}.pdf`;
  const stored = await storeFile(ctx, new File([new Uint8Array(pdf)], filename, { type: "application/pdf" }), null);
  if (!stored.ok) return stored;
  await db.update(crmProposal).set({ fileId: stored.data.id, documentVersion: version }).where(eq(crmProposal.id, id));
  await audit({ actorId: ctx.user.id, action: "crm.proposal.pdf_generated", entityType: "crm_proposal", entityId: id, metadata: { version, fileId: stored.data.id, bytes: pdf.length } });
  return ok({ fileId: stored.data.id, version });
}

export const sendProposalSchema = z.object({
  contactId: z.uuid("Escolha o contato."),
  message: z.string().trim().min(5, "Escreva uma mensagem.").max(4000, "Máximo 4000 caracteres"),
});
export type SendProposalInput = z.input<typeof sendProposalSchema>;

/**
 * Envia o PDF anexado ao contato da empresa. Em rascunho, a proposta passa a
 * Enviada (mesma regra de `changeProposalStatus`); registra a interação de
 * e-mail na linha do tempo e guarda contato e data do envio.
 */
export async function sendProposalByEmail(ctx: AdminContext, id: string, input: SendProposalInput, now = new Date()): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Proposta não encontrada.");
  const parsed = sendProposalSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const row = await loadProposalForDocument(id);
  if (!row) return fail("Proposta não encontrada.");
  if (row.proposal.status !== "draft" && row.proposal.status !== "sent") return fail("Proposta decidida: não pode ser reenviada.");
  if (!row.proposal.fileId) return fail("Gere o PDF (ou anexe o arquivo) antes de enviar.", { contactId: ["Sem PDF"] });
  const file = await db.query.files.findFirst({ where: eq(files.id, row.proposal.fileId) });
  if (!file) return fail("O arquivo da proposta não foi encontrado.");
  const contact = await db.query.crmContact.findFirst({
    where: and(eq(crmContact.id, parsed.data.contactId), eq(crmContact.companyId, row.company.id), isNull(crmContact.archivedAt)),
    columns: { id: true, name: true, email: true },
  });
  if (!contact) return fail("Contato não encontrado nesta empresa.", { contactId: ["Escolha um contato da empresa."] });
  if (!contact.email) return fail("Este contato não tem e-mail.", { contactId: ["Contato sem e-mail."] });

  const pdf = await getObject(file.bucketKey);
  const sent = await sendProposalEmail({
    to: contact.email,
    contactName: contact.name,
    number: row.proposal.number,
    title: row.proposal.title,
    validUntil: row.proposal.validUntil ? formatIsoDate(row.proposal.validUntil) : null,
    message: parsed.data.message,
    senderName: ctx.user.name,
    pdf: { filename: file.originalName, content: pdf, contentType: "application/pdf" },
  });
  if (!sent) return fail("Não foi possível enviar o e-mail agora. Tente de novo em instantes.");

  if (row.proposal.status === "draft") {
    const r = await changeProposalStatus(ctx, id, { to: "sent" });
    if (!r.ok) return r;
  }
  await db.update(crmProposal).set({ emailedAt: now, contactId: contact.id }).where(eq(crmProposal.id, id));
  const [interaction] = await db
    .insert(crmInteraction)
    .values({
      type: "email",
      at: now,
      byUserId: ctx.user.id,
      summary: `Proposta ${row.proposal.number} enviada por e-mail para ${contact.name}`,
      body: parsed.data.message,
      companyId: row.company.id,
      contactId: contact.id,
      opportunityId: row.opportunity.id,
    })
    .returning({ id: crmInteraction.id });
  await audit({ actorId: ctx.user.id, action: "crm.interaction.created", entityType: "crm_interaction", entityId: interaction.id, metadata: { type: "email", companyId: row.company.id, contactId: contact.id, opportunityId: row.opportunity.id, proposalId: id } });
  await audit({ actorId: ctx.user.id, action: "crm.proposal.emailed", entityType: "crm_proposal", entityId: id, metadata: { contactId: contact.id, version: row.proposal.documentVersion, fileId: file.id } });
  return ok(null);
}

// ────────────────────────────────────────────────────────────────────────────
// Catálogo de serviços (Fase 19)
// ────────────────────────────────────────────────────────────────────────────

export async function createService(ctx: AdminContext, input: ServiceInput): Promise<ActionResult<{ id: string }>> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const [row] = await db.insert(crmService).values(parsed.data).returning({ id: crmService.id });
  await audit({ actorId: ctx.user.id, action: "crm.service.created", entityType: "crm_service", entityId: row.id, metadata: { name: parsed.data.name, defaultPriceCents: parsed.data.defaultPriceCents } });
  return ok({ id: row.id });
}

export async function updateService(ctx: AdminContext, id: string, input: ServiceInput): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Serviço não encontrado.");
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const [row] = await db.update(crmService).set(parsed.data).where(eq(crmService.id, id)).returning({ id: crmService.id });
  if (!row) return fail("Serviço não encontrado.");
  await audit({ actorId: ctx.user.id, action: "crm.service.updated", entityType: "crm_service", entityId: id, metadata: { name: parsed.data.name, defaultPriceCents: parsed.data.defaultPriceCents } });
  return ok(null);
}

export async function setServiceActive(ctx: AdminContext, id: string, active: boolean): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Serviço não encontrado.");
  const [row] = await db.update(crmService).set({ active }).where(eq(crmService.id, id)).returning({ id: crmService.id });
  if (!row) return fail("Serviço não encontrado.");
  await audit({ actorId: ctx.user.id, action: active ? "crm.service.unarchived" : "crm.service.archived", entityType: "crm_service", entityId: id });
  return ok(null);
}
