import { desc, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { appError } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";

export function listErrors(_ctx: AdminContext, opts: { resolved?: boolean; limit?: number } = {}) {
  return db
    .select()
    .from(appError)
    .where(opts.resolved ? isNotNull(appError.resolvedAt) : isNull(appError.resolvedAt))
    .orderBy(desc(appError.lastSeenAt))
    .limit(opts.limit ?? 100);
}

export async function countOpenErrors(): Promise<number> {
  const rows = await db.select({ id: appError.id }).from(appError).where(isNull(appError.resolvedAt));
  return rows.length;
}
