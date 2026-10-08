/** Busca global do admin (Fase 20): `ilike` nas entidades principais, até 8 por grupo. */
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { AdminContext } from "@/modules/auth/context";
import { STAGE_LABEL } from "@/modules/crm/forecast";
import { ADMIN_STATUS_LABEL, PROJECT_STATUS_ADMIN_LABEL } from "@/modules/reports/labels";
import { STATUS_LABEL as REQUEST_STATUS_LABEL } from "@/modules/requests/status";

export type SearchGroupKey = "companies" | "contacts" | "opportunities" | "proposals" | "projects" | "deliverables" | "requests" | "meetings" | "organizations";
export type SearchHit = { id: string; label: string; sub: string | null; href: string };
export type SearchGroup = { key: SearchGroupKey; label: string; hits: SearchHit[] };

const OWNER_ONLY: SearchGroupKey[] = ["companies", "contacts", "opportunities", "proposals", "organizations"];
const ALL: { key: SearchGroupKey; label: string }[] = [
  { key: "companies", label: "Empresas" },
  { key: "contacts", label: "Contatos" },
  { key: "opportunities", label: "Oportunidades" },
  { key: "proposals", label: "Propostas" },
  { key: "projects", label: "Projetos" },
  { key: "deliverables", label: "Entregas" },
  { key: "requests", label: "Solicitações" },
  { key: "meetings", label: "Atas" },
  { key: "organizations", label: "Organizações" },
];

/** Quais grupos cada papel vê (puro). */
export function searchGroupsFor(role: "admin" | "collaborator"): { key: SearchGroupKey; label: string }[] {
  return role === "admin" ? ALL : ALL.filter((g) => !OWNER_ONLY.includes(g.key));
}

const PROPOSAL_STATUS_LABEL: Record<string, string> = { draft: "Rascunho", sent: "Enviada", accepted: "Aceita", rejected: "Recusada", expired: "Expirada" };
const ORG_STATUS_LABEL: Record<string, string> = { active: "Ativa", inactive: "Inativa" };
/** Rótulo em português do status/estágio vindo do banco; cai no valor cru se não conhecer. */
const pt = (map: Record<string, string>, value: string) => map[value] ?? value;

const esc = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function searchAll(ctx: AdminContext, q: string, limit = 8): Promise<SearchGroup[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const p = `%${esc(term)}%`;
  const digits = term.replace(/\D/g, "");
  const groups = searchGroupsFor(ctx.user.role);
  const runners: Record<SearchGroupKey, () => Promise<SearchHit[]>> = {
    companies: async () =>
      (await db.execute<{ id: string; name: string; cnpj: string | null }>(sql`select id, name, cnpj from crm_company where archived_at is null and (name ilike ${p} escape '\\' ${digits.length >= 4 ? sql`or cnpj like ${`%${digits}%`}` : sql``}) order by name limit ${limit}`)).map((r) => ({ id: r.id, label: r.name, sub: r.cnpj, href: `/admin/crm/empresas/${r.id}` })),
    contacts: async () =>
      (await db.execute<{ id: string; name: string; email: string | null; company_id: string }>(sql`select id, name, email, company_id from crm_contact where archived_at is null and (name ilike ${p} escape '\\' or email ilike ${p} escape '\\') order by name limit ${limit}`)).map((r) => ({ id: r.id, label: r.name, sub: r.email, href: `/admin/crm/empresas/${r.company_id}` })),
    opportunities: async () =>
      (await db.execute<{ id: string; title: string; stage: string; company: string }>(sql`select o.id, o.title, o.stage::text as stage, c.name as company from crm_opportunity o join crm_company c on c.id = o.company_id where o.title ilike ${p} escape '\\' order by o.updated_at desc limit ${limit}`)).map((r) => ({ id: r.id, label: r.title, sub: `${r.company} · ${pt(STAGE_LABEL, r.stage)}`, href: `/admin/crm/oportunidades/${r.id}` })),
    proposals: async () =>
      (await db.execute<{ id: string; number: string; title: string; status: string }>(sql`select id, number, title, status::text as status from crm_proposal where number ilike ${p} escape '\\' or title ilike ${p} escape '\\' order by created_at desc limit ${limit}`)).map((r) => ({ id: r.id, label: `${r.number} · ${r.title}`, sub: pt(PROPOSAL_STATUS_LABEL, r.status), href: `/admin/crm/propostas/${r.id}` })),
    projects: async () =>
      (await db.execute<{ id: string; title: string; status: string; company: string }>(sql`select p.id, p.title, p.status::text as status, c.name as company from project p join crm_company c on c.id = p.company_id where p.title ilike ${p} escape '\\' order by p.updated_at desc limit ${limit}`)).map((r) => ({ id: r.id, label: r.title, sub: `${r.company} · ${pt(PROJECT_STATUS_ADMIN_LABEL, r.status)}`, href: `/admin/projetos/${r.id}` })),
    deliverables: async () =>
      (await db.execute<{ id: string; title: string; project_id: string; project: string; status: string }>(sql`select d.id, d.title, d.project_id, p.title as project, d.status::text as status from project_deliverable d join project p on p.id = d.project_id where d.title ilike ${p} escape '\\' order by d.updated_at desc limit ${limit}`)).map((r) => ({ id: r.id, label: r.title, sub: `${r.project} · ${pt(ADMIN_STATUS_LABEL, r.status)}`, href: `/admin/projetos/${r.project_id}/entregas/${r.id}` })),
    requests: async () =>
      (await db.execute<{ id: string; title: string; org: string; status: string }>(sql`select r.id, r.title, o.name as org, r.status::text as status from portal_request r join organizations o on o.id = r.organization_id where r.title ilike ${p} escape '\\' order by r.updated_at desc limit ${limit}`)).map((r) => ({ id: r.id, label: r.title, sub: `${r.org} · ${pt(REQUEST_STATUS_LABEL, r.status)}`, href: `/admin/solicitacoes/${r.id}` })),
    meetings: async () =>
      (await db.execute<{ id: string; title: string; held_at: Date }>(sql`select id, title, held_at from meeting where title ilike ${p} escape '\\' order by held_at desc limit ${limit}`)).map((r) => ({ id: r.id, label: r.title, sub: new Date(r.held_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }), href: `/admin/atas/${r.id}` })),
    organizations: async () =>
      (await db.execute<{ id: string; name: string; status: string }>(sql`select id, name, status::text as status from organizations where name ilike ${p} escape '\\' order by name limit ${limit}`)).map((r) => ({ id: r.id, label: r.name, sub: pt(ORG_STATUS_LABEL, r.status), href: `/admin/organizacoes/${r.id}` })),
  };
  const results = await Promise.all(groups.map(async (g) => ({ key: g.key, label: g.label, hits: await runners[g.key]() })));
  return results.filter((g) => g.hits.length > 0);
}
