import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";

/** Admin vê todos os arquivos; portal vê só os da organização ativa. */
export function listFiles(ctx: AdminContext | PortalContext) {
  const base = db.select().from(files);
  const scoped = ctx.kind === "portal" ? base.where(eq(files.organizationId, ctx.organization.id)) : base;
  return scoped.orderBy(desc(files.createdAt));
}

/** Retorna o arquivo só se o contexto pode vê-lo; null caso contrário (sem distinguir "não existe" de "não é seu"). */
export async function getFileForContext(ctx: AdminContext | PortalContext, id: string) {
  const f = await db.query.files.findFirst({ where: eq(files.id, id) });
  if (!f) return null;
  if (ctx.kind === "portal" && f.organizationId !== ctx.organization.id) return null;
  return f;
}
