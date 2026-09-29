import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteCase } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { isUuid } from "@/lib/uuid";
import { computeTotals, toPublicCase, type CaseRow } from "./public";

const columns = {
  slug: siteCase.slug,
  name: siteCase.name,
  sector: siteCase.sector,
  size: siteCase.size,
  systems: siteCase.systems,
  automations: siteCase.automations,
  savingsCents: siteCase.savingsCents,
  capexCents: siteCase.capexCents,
  featured: siteCase.featured,
  deliverables: siteCase.deliverables,
  statusNote: siteCase.statusNote,
};

/** Cases publicados, do maior para o menor retorno. Base do site e da API pública. */
export async function listPublishedCaseRows(): Promise<CaseRow[]> {
  return db
    .select(columns)
    .from(siteCase)
    .where(eq(siteCase.published, true))
    .orderBy(desc(siteCase.savingsCents), asc(siteCase.name));
}

export async function listPublishedCases() {
  return (await listPublishedCaseRows()).map(toPublicCase);
}

export async function getPublishedTotals() {
  return computeTotals(await listPublishedCaseRows());
}

export function listAllCases(_ctx: AdminContext) {
  return db
    .select({ id: siteCase.id, published: siteCase.published, updatedAt: siteCase.updatedAt, ...columns })
    .from(siteCase)
    .orderBy(desc(siteCase.savingsCents), asc(siteCase.name));
}

export async function getCase(_ctx: AdminContext, id: string) {
  if (!isUuid(id)) return null;
  const row = await db.query.siteCase.findFirst({ where: eq(siteCase.id, id) });
  return row ?? null;
}
