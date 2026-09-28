import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, crmContact, organizations } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { slugify } from "@/modules/tenancy/slug";
import { companySchema, contactSchema, type CompanyInput, type ContactInput } from "./validation";

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
