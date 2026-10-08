import "dotenv/config";
import { beforeAll } from "vitest";
import { eq, like, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { users } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";

const TEST_ADMIN_EMAIL = "admin@test.local";

/** Trava: o truncate abaixo destrói dados. Só roda em banco cujo nome termina em "_test". */
const dbName = new URL(process.env.DATABASE_URL ?? "postgres://x/").pathname.replace(/^\//, "");
if (!/_test$/.test(dbName)) {
  throw new Error(`Testes de integração recusados: o banco "${dbName}" não termina em "_test". Rode via npm run test:integration.`);
}

/** Limpa dados de teste antes de cada arquivo: tabelas de domínio inteiras e usuários @test.local. */
beforeAll(async () => {
  await db.execute(
    sql`truncate table audit_log, job_run, job_setting, notification, notification_preference, app_error, rate_limit_bucket, api_key, webhook_delivery, webhook_endpoint, project_daily_snapshot, project_invoice, crm_service, portal_request, project_deliverable, project_milestone, project_phase, project, crm_contract, crm_proposal, crm_interaction, crm_opportunity, crm_contact, crm_company, files, leads, invitations, memberships, organizations cascade`,
  );
  await db.delete(users).where(like(users.email, "%@test.local"));
});

/** Cria (ou reaproveita) um admin de teste e devolve o contexto de autorização. */
export async function ensureTestAdmin(): Promise<AdminContext> {
  let u = await db.query.users.findFirst({ where: eq(users.email, TEST_ADMIN_EMAIL) });
  if (!u) {
    const ctx = await auth.$context;
    const created = await ctx.internalAdapter.createUser(
      { email: TEST_ADMIN_EMAIL, name: "Admin Teste", emailVerified: true, role: "admin", active: true },
      { method: "admin" },
    );
    await ctx.internalAdapter.linkAccount({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: await ctx.password.hash("senha-admin-teste-1"),
    });
    u = await db.query.users.findFirst({ where: eq(users.id, created.id) });
  }
  if (!u) throw new Error("não foi possível criar o admin de teste");
  return { kind: "admin", user: { id: u.id, name: u.name, email: u.email, role: "admin", active: true } };
}
