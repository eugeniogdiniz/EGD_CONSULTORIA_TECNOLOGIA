import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";
import { beforeHook } from "@/modules/auth/hooks";
import { sendPasswordResetEmail } from "@/modules/mail/send";
import { audit } from "@/modules/audit/log";
import { loginByEmail } from "@/modules/auth/login-limiter";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  advanced: {
    database: { generateId: "uuid" },
    useSecureCookies: env.NODE_ENV === "production",
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, url });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24, // renova a cada dia de uso
  },
  rateLimit: {
    enabled: true,
    // limite geral por IP em todos os endpoints de auth (várias pessoas atrás de um NAT)
    window: 60,
    max: 100,
    customRules: {
      // login: 60 por IP a cada 15 min (o limite de 5 por e-mail, no hook, é a defesa contra força bruta)
      "/sign-in/email": { window: 15 * 60, max: 60 },
      "/get-session": false,
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", input: false, defaultValue: "client" },
      active: { type: "boolean", input: false, defaultValue: true },
    },
  },
  hooks: { before: beforeHook },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          // login bem-sucedido zera o contador de tentativas do e-mail (só falhas consecutivas contam)
          const u = await db.query.users.findFirst({ where: eq(users.id, session.userId), columns: { email: true } });
          if (u) loginByEmail.reset(u.email);
          await audit({
            actorId: session.userId,
            action: "auth.login",
            entityType: "user",
            entityId: session.userId,
            metadata: { ip: session.ipAddress ?? null },
          });
        },
      },
    },
  },
  plugins: [nextCookies()], // deve ser o último plugin
});

export type Session = typeof auth.$Infer.Session;
