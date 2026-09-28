import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";

export function listLeads(_ctx: AdminContext, opts: { status?: "new" | "seen" } = {}) {
  const base = db.select().from(leads);
  const scoped = opts.status ? base.where(eq(leads.status, opts.status)) : base;
  return scoped.orderBy(desc(leads.createdAt)).limit(200);
}

export const countNewLeads = async () =>
  (await db.select({ n: count() }).from(leads).where(eq(leads.status, "new")))[0].n;
