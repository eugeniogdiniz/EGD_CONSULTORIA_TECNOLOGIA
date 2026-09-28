import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteCase } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import type { AdminContext } from "@/modules/auth/context";
import { slugify } from "@/modules/tenancy/slug";
import { isUuid } from "@/lib/uuid";
import { caseSchema, type CaseInput } from "./validation";

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "case";
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const hit = await db.query.siteCase.findFirst({ where: eq(siteCase.slug, candidate), columns: { id: true } });
    if (!hit) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function values(d: ReturnType<typeof caseSchema.parse>) {
  return {
    name: d.name,
    sector: d.sector,
    size: d.size,
    systems: d.systems,
    automations: d.automations,
    savingsCents: d.savings,
    capexCents: d.capex,
    featured: d.featured,
    published: d.published,
    deliverables: d.deliverables,
    statusNote: d.statusNote,
  };
}

export async function createCase(ctx: AdminContext, input: CaseInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = caseSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const slug = await uniqueSlug(parsed.data.name);
  const [row] = await db
    .insert(siteCase)
    .values({ slug, ...values(parsed.data) })
    .returning({ id: siteCase.id, slug: siteCase.slug });
  await audit({
    actorId: ctx.user.id,
    action: "case.created",
    entityType: "site_case",
    entityId: row.id,
    metadata: { slug, published: parsed.data.published },
  });
  return ok(row);
}

/** O slug não muda ao editar: âncoras e links públicos continuam estáveis. */
export async function updateCase(ctx: AdminContext, id: string, input: CaseInput): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Case não encontrado.");
  const parsed = caseSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const [row] = await db.update(siteCase).set(values(parsed.data)).where(eq(siteCase.id, id)).returning({ id: siteCase.id });
  if (!row) return fail("Case não encontrado.");
  await audit({
    actorId: ctx.user.id,
    action: "case.updated",
    entityType: "site_case",
    entityId: id,
    metadata: { published: parsed.data.published, featured: parsed.data.featured },
  });
  return ok(null);
}

export async function setCasePublished(ctx: AdminContext, id: string, published: boolean): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Case não encontrado.");
  const [row] = await db.update(siteCase).set({ published }).where(eq(siteCase.id, id)).returning({ id: siteCase.id });
  if (!row) return fail("Case não encontrado.");
  await audit({
    actorId: ctx.user.id,
    action: published ? "case.published" : "case.unpublished",
    entityType: "site_case",
    entityId: id,
  });
  return ok(null);
}

export async function deleteCase(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  if (!isUuid(id)) return fail("Case não encontrado.");
  const [row] = await db.delete(siteCase).where(eq(siteCase.id, id)).returning({ id: siteCase.id, slug: siteCase.slug });
  if (!row) return fail("Case não encontrado.");
  await audit({
    actorId: ctx.user.id,
    action: "case.deleted",
    entityType: "site_case",
    entityId: id,
    metadata: { slug: row.slug },
  });
  return ok(null);
}
