/**
 * Cria duas organizações, usuários cliente e um arquivo em cada uma, e imprime JSON.
 * Chamado pelo Playwright via `tsx` (tests/e2e/fixtures.ts).
 *   --shared  => o mesmo cliente é membro das duas organizações
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { crmCompany, crmOpportunity, files, memberships, project, projectDeliverable } from "@/db/schema";
import { createOrganization } from "@/modules/tenancy/actions";
import { putObject } from "@/lib/storage";
import { buildBucketKey } from "@/modules/files/keys";
import type { AdminContext } from "@/modules/auth/context";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

const shared = process.argv.includes("--shared");
const stamp = Date.now();
const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? "admin@egdsystem.com.br").toLowerCase();

async function adminContext(): Promise<AdminContext> {
  const u = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) });
  if (!u) throw new Error("admin do seed não encontrado; rode npm run db:seed");
  return { kind: "admin", user: { id: u.id, name: u.name, email: u.email, role: "admin", active: true } };
}

async function createClient(email: string, password: string, name: string) {
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser({ email, name, emailVerified: true, role: "client", active: true }, { method: "admin" });
  await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: await ctx.password.hash(password) });
  return user.id;
}

async function createFile(ctx: AdminContext, organizationId: string, name: string) {
  const id = randomUUID();
  const bucketKey = buildBucketKey({ organizationId, fileId: id, filename: name });
  await putObject(bucketKey, Buffer.from(`arquivo ${name}`), "text/plain");
  await db.insert(files).values({ id, bucketKey, originalName: name, mimeType: "text/plain", sizeBytes: 10, organizationId, uploadedBy: ctx.user.id });
  return id;
}

/** Empresa vinculada à organização, projeto ativo e duas entregas (uma visível, uma interna). */
async function createProject(ctx: AdminContext, organizationId: string, label: string) {
  const [company] = await db
    .insert(crmCompany)
    .values({ name: `Empresa ${label} ${stamp}`, slug: `empresa-${label.toLowerCase()}-${stamp}`, ownerId: ctx.user.id, linkedOrganizationId: organizationId })
    .returning({ id: crmCompany.id });
  const [opp] = await db
    .insert(crmOpportunity)
    .values({ companyId: company.id, title: `Op ${label} ${stamp}`, stage: "won", ownerId: ctx.user.id, wonAt: new Date() })
    .returning({ id: crmOpportunity.id });
  const title = `Projeto ${label} ${stamp}`;
  const [p] = await db
    .insert(project)
    .values({ opportunityId: opp.id, companyId: company.id, title, status: "active", ownerId: ctx.user.id })
    .returning({ id: project.id });
  const visibleTitle = `Entrega visível ${label} ${stamp}`;
  const hiddenTitle = `Entrega interna ${label} ${stamp}`;
  const [visible] = await db
    .insert(projectDeliverable)
    .values({ projectId: p.id, title: visibleTitle, ownerId: ctx.user.id, visibleToClient: true, status: "doing", dueAt: "2030-06-15" })
    .returning({ id: projectDeliverable.id });
  const [hidden] = await db
    .insert(projectDeliverable)
    .values({ projectId: p.id, title: hiddenTitle, ownerId: ctx.user.id, visibleToClient: false })
    .returning({ id: projectDeliverable.id });
  return { id: p.id, title, visible: { id: visible.id, title: visibleTitle }, hiddenId: hidden.id, hiddenTitle };
}

async function main() {
  const ctx = await adminContext();
  const a = await createOrganization(ctx, { name: `Org A ${stamp}` });
  const b = await createOrganization(ctx, { name: `Org B ${stamp}` });
  if (!a.ok || !b.ok) throw new Error("falha ao criar organizações");

  const password = "senha-fixture-forte-1";
  const clientA = { email: `a${stamp}@test.local`, password };
  const clientB = { email: `b${stamp}@test.local`, password };
  const idA = await createClient(clientA.email, password, "Cliente A");
  await db.insert(memberships).values({ userId: idA, organizationId: a.data.id });
  if (shared) {
    await db.insert(memberships).values({ userId: idA, organizationId: b.data.id });
  } else {
    const idB = await createClient(clientB.email, password, "Cliente B");
    await db.insert(memberships).values({ userId: idB, organizationId: b.data.id });
  }
  const fileA = await createFile(ctx, a.data.id, `a-${stamp}.txt`);
  const fileB = await createFile(ctx, b.data.id, `b-${stamp}.txt`);
  const projectA = await createProject(ctx, a.data.id, "A");
  const projectB = await createProject(ctx, b.data.id, "B");

  console.log(
    JSON.stringify({
      orgA: { id: a.data.id, name: `Org A ${stamp}` },
      orgB: { id: b.data.id, name: `Org B ${stamp}` },
      clientA,
      clientB: shared ? clientA : clientB,
      fileA: { id: fileA },
      fileB: { id: fileB },
      projectA,
      projectB,
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
