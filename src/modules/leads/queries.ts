import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmCompany, leads } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";

export type LeadStatus = "new" | "seen" | "converted";

export function listLeads(_ctx: AdminContext, opts: { status?: LeadStatus } = {}) {
  const base = db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      company: leads.company,
      phone: leads.phone,
      message: leads.message,
      source: leads.source,
      status: leads.status,
      createdAt: leads.createdAt,
      convertedAt: leads.convertedAt,
      convertedCompanyId: leads.convertedCompanyId,
      convertedCompanyName: crmCompany.name,
    })
    .from(leads)
    .leftJoin(crmCompany, eq(leads.convertedCompanyId, crmCompany.id));
  const scoped = opts.status ? base.where(eq(leads.status, opts.status)) : base;
  return scoped.orderBy(desc(leads.createdAt)).limit(200);
}

export const countNewLeads = async () =>
  (await db.select({ n: count() }).from(leads).where(eq(leads.status, "new")))[0].n;
