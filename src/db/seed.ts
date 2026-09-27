import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/modules/auth/normalize-email";

/**
 * Cria o admin inicial a partir de SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 * Usa o adapter interno do Better Auth (mesmo caminho do sign-up), porque o
 * endpoint público de cadastro exige convite.
 */
async function main() {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    throw new Error("SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD são obrigatórios");
  }
  const email = normalizeEmail(env.SEED_ADMIN_EMAIL);
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    console.log("admin já existe:", email);
    return;
  }
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser(
    { email, name: "Administrador", emailVerified: true, role: "admin", active: true },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(env.SEED_ADMIN_PASSWORD),
  });
  console.log("admin criado:", email);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
