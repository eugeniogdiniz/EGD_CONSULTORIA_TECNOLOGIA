import { and, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, organizations } from "@/db/schema";
import { slugify } from "./slug";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ProvisionedOrganization = {
  organizationId: string;
  /** o que aconteceu: já estava vinculada, vinculou a uma existente (mesmo CNPJ) ou criou uma nova */
  outcome: "existing" | "linked" | "created";
};

/** Próximo slug livre: `base`, `base-2`, `base-3`… */
async function freeSlug(tx: Tx, base: string): Promise<string> {
  const taken = new Set(
    (
      await tx
        .select({ slug: organizations.slug })
        .from(organizations)
        .where(or(eq(organizations.slug, base), like(organizations.slug, `${base}-%`)))
    ).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/**
 * Garante que a empresa do CRM tem uma organização no portal, para o cliente
 * acompanhar os projetos dela. Roda dentro da transação de quem chama e trava
 * a linha da empresa, então dois projetos criados ao mesmo tempo não geram
 * duas organizações. Ordem: vínculo existente → organização com o mesmo CNPJ
 * → organização nova com o nome da empresa. Não convida ninguém.
 */
export async function ensureCompanyOrganization(tx: Tx, companyId: string): Promise<ProvisionedOrganization | null> {
  const [company] = await tx
    .select({
      id: crmCompany.id,
      name: crmCompany.name,
      slug: crmCompany.slug,
      cnpj: crmCompany.cnpj,
      linkedOrganizationId: crmCompany.linkedOrganizationId,
    })
    .from(crmCompany)
    .where(eq(crmCompany.id, companyId))
    .for("update");
  if (!company) return null;
  if (company.linkedOrganizationId) return { organizationId: company.linkedOrganizationId, outcome: "existing" };

  const digits = company.cnpj?.replace(/\D/g, "") ?? "";
  let organizationId: string | null = null;
  let outcome: ProvisionedOrganization["outcome"] = "created";
  if (digits.length > 0) {
    const [sameCnpj] = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(sql`regexp_replace(coalesce(${organizations.cnpj}, ''), '\\D', '', 'g') = ${digits}`, eq(organizations.status, "active")))
      .limit(1);
    if (sameCnpj) {
      organizationId = sameCnpj.id;
      outcome = "linked";
    }
  }

  if (!organizationId) {
    const slug = await freeSlug(tx, slugify(company.name) || company.slug);
    const [row] = await tx
      .insert(organizations)
      .values({ name: company.name, cnpj: company.cnpj, slug })
      .returning({ id: organizations.id });
    organizationId = row.id;
  }

  await tx.update(crmCompany).set({ linkedOrganizationId: organizationId }).where(eq(crmCompany.id, company.id));
  return { organizationId, outcome };
}
