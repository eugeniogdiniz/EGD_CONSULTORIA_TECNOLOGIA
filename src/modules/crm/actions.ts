import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmCompany,
  crmContact,
  crmInteraction,
  crmOpportunity,
  organizations,
} from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { slugify } from "@/modules/tenancy/slug";
import {
  changeStageSchema,
  companySchema,
  contactSchema,
  interactionSchema,
  opportunitySchema,
  type ChangeStageInput,
  type CompanyInput,
  type ContactInput,
  type InteractionInput,
  type OpportunityInput,
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
