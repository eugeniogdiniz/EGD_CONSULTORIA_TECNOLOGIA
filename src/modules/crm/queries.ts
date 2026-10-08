import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmCompany,
  crmContact,
  crmInteraction,
  crmOpportunity,
  crmProposal,
  files,
  users,
  crmService,
} from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { extractEmailDomain, isPublicEmailDomain } from "./convert-lead";

/**
 * Escapa wildcards do LIKE (%, _, \) para busca segura em campos livres.
 * O ESCAPE fica no template do sql`` a seguir.
 */
const escapeLike = (q: string) => q.replace(/[\\%_]/g, "\\$&");
const contains = (q: string) => `%${escapeLike(q)}%`;

// ────────────────────────────────────────────────────────────────────────────
// Empresas
// ────────────────────────────────────────────────────────────────────────────

export function listCompanies(
  _ctx: AdminContext,
  opts: { search?: string; includeArchived?: boolean } = {},
) {
  const filters = [];
  if (!opts.includeArchived) filters.push(isNull(crmCompany.archivedAt));
  if (opts.search && opts.search.trim()) {
    const p = contains(opts.search.trim());
    filters.push(
      or(
        sql`${crmCompany.name} ilike ${p} escape '\\'`,
        sql`${crmCompany.cnpj} ilike ${p} escape '\\'`,
        sql`${crmCompany.website} ilike ${p} escape '\\'`,
      )!,
    );
  }
  return db
    .select({
      id: crmCompany.id,
      name: crmCompany.name,
      slug: crmCompany.slug,
      cnpj: crmCompany.cnpj,
      website: crmCompany.website,
      source: crmCompany.source,
      archivedAt: crmCompany.archivedAt,
      linkedOrganizationId: crmCompany.linkedOrganizationId,
      updatedAt: crmCompany.updatedAt,
    })
    .from(crmCompany)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(crmCompany.updatedAt))
    .limit(200);
}

export async function getCompany(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const row = await db.query.crmCompany.findFirst({ where: eq(crmCompany.id, id) });
  return row ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// Contatos
// ────────────────────────────────────────────────────────────────────────────

export function listContactsByCompany(_ctx: AdminContext, companyId: string) {
  if (!isUuid(companyId)) return Promise.resolve([]);
  return db
    .select()
    .from(crmContact)
    .where(and(eq(crmContact.companyId, companyId), isNull(crmContact.archivedAt)))
    .orderBy(asc(crmContact.name));
}

export function listContacts(
  _ctx: AdminContext,
  opts: { search?: string; companyId?: string; includeArchived?: boolean } = {},
) {
  const filters = [];
  if (!opts.includeArchived) filters.push(isNull(crmContact.archivedAt));
  if (opts.companyId && isUuid(opts.companyId)) filters.push(eq(crmContact.companyId, opts.companyId));
  if (opts.search && opts.search.trim()) {
    const p = contains(opts.search.trim());
    filters.push(
      or(
        sql`${crmContact.name} ilike ${p} escape '\\'`,
        sql`${crmContact.email} ilike ${p} escape '\\'`,
      )!,
    );
  }
  return db
    .select({
      id: crmContact.id,
      name: crmContact.name,
      email: crmContact.email,
      phone: crmContact.phone,
      role: crmContact.role,
      title: crmContact.title,
      companyId: crmContact.companyId,
      companyName: crmCompany.name,
      archivedAt: crmContact.archivedAt,
    })
    .from(crmContact)
    .innerJoin(crmCompany, eq(crmContact.companyId, crmCompany.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(crmContact.name))
    .limit(200);
}

export async function getContact(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const row = await db.query.crmContact.findFirst({ where: eq(crmContact.id, id) });
  return row ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// Oportunidades
// ────────────────────────────────────────────────────────────────────────────

const OPEN_STAGES = ["new", "qualified", "meeting", "proposal"] as const;

export function listOpportunities(
  _ctx: AdminContext,
  opts: {
    stage?: (typeof OPEN_STAGES)[number] | "won" | "lost";
    ownerId?: string;
    includeClosed?: boolean;
    search?: string;
    companyId?: string;
  } = {},
) {
  const filters = [];
  if (opts.stage) filters.push(eq(crmOpportunity.stage, opts.stage));
  else if (!opts.includeClosed) filters.push(inArray(crmOpportunity.stage, [...OPEN_STAGES]));
  if (opts.ownerId && isUuid(opts.ownerId)) filters.push(eq(crmOpportunity.ownerId, opts.ownerId));
  if (opts.companyId && isUuid(opts.companyId)) filters.push(eq(crmOpportunity.companyId, opts.companyId));
  if (opts.search && opts.search.trim()) {
    const p = contains(opts.search.trim());
    filters.push(
      or(
        sql`${crmOpportunity.title} ilike ${p} escape '\\'`,
        sql`${crmCompany.name} ilike ${p} escape '\\'`,
      )!,
    );
  }
  return db
    .select({
      id: crmOpportunity.id,
      title: crmOpportunity.title,
      stage: crmOpportunity.stage,
      valueCents: crmOpportunity.valueCents,
      currency: crmOpportunity.currency,
      expectedCloseAt: crmOpportunity.expectedCloseAt,
      nextStep: crmOpportunity.nextStep,
      nextStepAt: crmOpportunity.nextStepAt,
      ownerId: crmOpportunity.ownerId,
      companyId: crmCompany.id,
      companyName: crmCompany.name,
      companyArchivedAt: crmCompany.archivedAt,
      updatedAt: crmOpportunity.updatedAt,
    })
    .from(crmOpportunity)
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(crmOpportunity.updatedAt))
    .limit(500);
}

export type OpportunityCard = Awaited<ReturnType<typeof listOpportunities>>[number];

/** Proposta mais recente da oportunidade, mostrada no card do funil. */
export type LatestProposal = { id: string; number: string; status: "draft" | "sent" | "accepted" | "rejected" | "expired"; valueCents: number | null };
export type FunnelCard = OpportunityCard & { proposal: LatestProposal | null };

export type FunnelColumn = {
  stage: "new" | "qualified" | "meeting" | "proposal" | "won" | "lost";
  opportunities: FunnelCard[];
  count: number;
  totalValueCents: number;
};

async function latestProposalByOpportunity(ids: string[]): Promise<Map<string, LatestProposal>> {
  const out = new Map<string, LatestProposal>();
  if (ids.length === 0) return out;
  const rows = await db
    .select({ id: crmProposal.id, number: crmProposal.number, status: crmProposal.status, valueCents: crmProposal.valueCents, opportunityId: crmProposal.opportunityId })
    .from(crmProposal)
    .where(inArray(crmProposal.opportunityId, ids))
    .orderBy(desc(crmProposal.updatedAt));
  for (const r of rows) if (!out.has(r.opportunityId)) out.set(r.opportunityId, { id: r.id, number: r.number, status: r.status, valueCents: r.valueCents });
  return out;
}

const STAGE_ORDER = ["new", "qualified", "meeting", "proposal", "won", "lost"] as const;

export async function listOpportunitiesGroupedByStage(
  ctx: AdminContext,
  opts: { ownerId?: string; search?: string; includeClosed?: boolean } = {},
): Promise<FunnelColumn[]> {
  const rows = await listOpportunities(ctx, {
    ownerId: opts.ownerId,
    search: opts.search,
    includeClosed: opts.includeClosed ?? true, // kanban mostra tudo, UI colapsa
  });
  const latest = await latestProposalByOpportunity(rows.map((r) => r.id));
  const grouped = new Map<string, FunnelCard[]>();
  for (const stage of STAGE_ORDER) grouped.set(stage, []);
  for (const row of rows) grouped.get(row.stage)!.push({ ...row, proposal: latest.get(row.id) ?? null });
  return STAGE_ORDER.map((stage) => {
    const opportunities = grouped.get(stage)!;
    return {
      stage,
      opportunities,
      count: opportunities.length,
      totalValueCents: opportunities.reduce((s, o) => s + (o.valueCents ?? 0), 0),
    };
  });
}

export async function getOpportunity(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      opportunity: crmOpportunity,
      company: crmCompany,
      primaryContact: crmContact,
    })
    .from(crmOpportunity)
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .leftJoin(crmContact, eq(crmOpportunity.primaryContactId, crmContact.id))
    .where(eq(crmOpportunity.id, id))
    .limit(1);
  return row ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// Interações
// ────────────────────────────────────────────────────────────────────────────

export function listInteractions(
  _ctx: AdminContext,
  opts: { companyId?: string; opportunityId?: string; contactId?: string; limit?: number } = {},
) {
  const filters = [isNull(crmInteraction.deletedAt)];
  if (opts.companyId && isUuid(opts.companyId)) filters.push(eq(crmInteraction.companyId, opts.companyId));
  if (opts.opportunityId && isUuid(opts.opportunityId)) filters.push(eq(crmInteraction.opportunityId, opts.opportunityId));
  if (opts.contactId && isUuid(opts.contactId)) filters.push(eq(crmInteraction.contactId, opts.contactId));
  return db
    .select({
      id: crmInteraction.id,
      type: crmInteraction.type,
      at: crmInteraction.at,
      summary: crmInteraction.summary,
      body: crmInteraction.body,
      companyId: crmInteraction.companyId,
      contactId: crmInteraction.contactId,
      opportunityId: crmInteraction.opportunityId,
      byUserId: crmInteraction.byUserId,
      byUserName: users.name,
    })
    .from(crmInteraction)
    .innerJoin(users, eq(crmInteraction.byUserId, users.id))
    .where(and(...filters))
    .orderBy(desc(crmInteraction.at))
    .limit(opts.limit ?? 50);
}

// ────────────────────────────────────────────────────────────────────────────
// Propostas
// ────────────────────────────────────────────────────────────────────────────

export function listProposals(
  _ctx: AdminContext,
  opts: { status?: "draft" | "sent" | "accepted" | "rejected" | "expired"; opportunityId?: string } = {},
) {
  const filters = [];
  if (opts.status) filters.push(eq(crmProposal.status, opts.status));
  if (opts.opportunityId && isUuid(opts.opportunityId)) filters.push(eq(crmProposal.opportunityId, opts.opportunityId));
  return db
    .select({
      id: crmProposal.id,
      number: crmProposal.number,
      title: crmProposal.title,
      valueCents: crmProposal.valueCents,
      currency: crmProposal.currency,
      status: crmProposal.status,
      sentAt: crmProposal.sentAt,
      validUntil: crmProposal.validUntil,
      decidedAt: crmProposal.decidedAt,
      fileId: crmProposal.fileId,
      opportunityId: crmProposal.opportunityId,
      opportunityTitle: crmOpportunity.title,
      companyId: crmCompany.id,
      companyName: crmCompany.name,
      updatedAt: crmProposal.updatedAt,
    })
    .from(crmProposal)
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(crmProposal.updatedAt))
    .limit(200);
}

export async function getProposal(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({
      proposal: crmProposal,
      opportunity: crmOpportunity,
      company: crmCompany,
      file: files,
    })
    .from(crmProposal)
    .innerJoin(crmOpportunity, eq(crmProposal.opportunityId, crmOpportunity.id))
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id))
    .leftJoin(files, eq(crmProposal.fileId, files.id))
    .where(eq(crmProposal.id, id))
    .limit(1);
  return row ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// Busca unificada e sugestão por domínio (usadas pelo wizard de conversão)
// ────────────────────────────────────────────────────────────────────────────

export type SearchResult =
  | { kind: "company"; id: string; label: string; sub: string | null }
  | { kind: "contact"; id: string; label: string; sub: string | null; companyId: string }
  | { kind: "opportunity"; id: string; label: string; sub: string | null; companyId: string };

export async function searchCrm(_ctx: AdminContext, q: string, limit = 10): Promise<SearchResult[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const p = contains(trimmed);
  const [companies, contacts, opportunities] = await Promise.all([
    db
      .select({ id: crmCompany.id, name: crmCompany.name, cnpj: crmCompany.cnpj })
      .from(crmCompany)
      .where(and(isNull(crmCompany.archivedAt), sql`${crmCompany.name} ilike ${p} escape '\\'`))
      .limit(limit),
    db
      .select({ id: crmContact.id, name: crmContact.name, email: crmContact.email, companyId: crmContact.companyId })
      .from(crmContact)
      .where(
        and(
          isNull(crmContact.archivedAt),
          or(sql`${crmContact.name} ilike ${p} escape '\\'`, sql`${crmContact.email} ilike ${p} escape '\\'`),
        ),
      )
      .limit(limit),
    db
      .select({ id: crmOpportunity.id, title: crmOpportunity.title, stage: crmOpportunity.stage, companyId: crmOpportunity.companyId })
      .from(crmOpportunity)
      .where(sql`${crmOpportunity.title} ilike ${p} escape '\\'`)
      .limit(limit),
  ]);
  return [
    ...companies.map((c) => ({ kind: "company" as const, id: c.id, label: c.name, sub: c.cnpj })),
    ...contacts.map((c) => ({ kind: "contact" as const, id: c.id, label: c.name, sub: c.email, companyId: c.companyId })),
    ...opportunities.map((o) => ({ kind: "opportunity" as const, id: o.id, label: o.title, sub: o.stage, companyId: o.companyId })),
  ].slice(0, limit);
}

/**
 * Sugere uma empresa para vincular ao lead baseado no domínio do e-mail.
 * Devolve null se: e-mail vazio/inválido, domínio público, nenhuma empresa
 * bate ou mais de uma bate (a UI então oferece "criar empresa nova").
 */
export async function suggestCompanyByEmailDomain(_ctx: AdminContext, email: string | null | undefined) {
  const domain = extractEmailDomain(email);
  if (!domain || isPublicEmailDomain(domain)) return null;

  const pattern = `%${escapeLike(domain)}%`;
  const contactDomain = `%@${escapeLike(domain)}`;

  // Empresas com o domínio no website OU com contato ativo cujo e-mail termina no domínio.
  const rows = await db
    .select({ id: crmCompany.id, name: crmCompany.name, cnpj: crmCompany.cnpj })
    .from(crmCompany)
    .leftJoin(
      crmContact,
      and(eq(crmContact.companyId, crmCompany.id), isNull(crmContact.archivedAt), isNotNull(crmContact.email)),
    )
    .where(
      and(
        isNull(crmCompany.archivedAt),
        or(
          sql`${crmCompany.website} ilike ${pattern} escape '\\'`,
          sql`${crmContact.email} ilike ${contactDomain} escape '\\'`,
        ),
      ),
    )
    .groupBy(crmCompany.id, crmCompany.name, crmCompany.cnpj)
    .limit(2);

  if (rows.length !== 1) return null;
  return rows[0];
}

/** Empresas do CRM vinculadas a uma organização do portal, com contagem de projetos. */
export async function listCompaniesByOrganization(_ctx: AdminContext, organizationId: string) {
  if (!isUuid(organizationId)) return [];
  const rows = await db.execute<{ id: string; name: string; project_count: number }>(sql`
    select c.id, c.name,
      (select count(*)::int from project p where p.company_id = c.id) as project_count
    from crm_company c
    where c.linked_organization_id = ${organizationId}
      and c.archived_at is null
    order by c.name asc
  `);
  return rows.map((r) => ({ id: r.id, name: r.name, projectCount: r.project_count }));
}

// ────────────────────────────────────────────────────────────────────────────
// Catálogo e previsão (Fase 19)
// ────────────────────────────────────────────────────────────────────────────

export function listServices(_ctx: AdminContext, opts: { activeOnly?: boolean } = {}) {
  return db
    .select()
    .from(crmService)
    .where(opts.activeOnly ? eq(crmService.active, true) : undefined)
    .orderBy(desc(crmService.active), asc(crmService.position), asc(crmService.name));
}

/** O que a previsão precisa de cada oportunidade (todas, inclusive ganhas e perdidas). */
export function loadForecastInput(_ctx: AdminContext) {
  return db
    .select({
      id: crmOpportunity.id,
      title: crmOpportunity.title,
      companyName: crmCompany.name,
      stage: crmOpportunity.stage,
      valueCents: crmOpportunity.valueCents,
      expectedCloseAt: crmOpportunity.expectedCloseAt,
      createdAt: crmOpportunity.createdAt,
      wonAt: crmOpportunity.wonAt,
      lostAt: crmOpportunity.lostAt,
      lostReason: crmOpportunity.lostReason,
    })
    .from(crmOpportunity)
    .innerJoin(crmCompany, eq(crmOpportunity.companyId, crmCompany.id));
}
