import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";
import { beforeHook } from "@/modules/auth/hooks";
import { sendPasswordResetEmail } from "@/modules/mail/send";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
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
    window: 15 * 60,
    max: 20,
    customRules: {
      // sobrescreve a regra padrão do Better Auth (3 por 10 s) para seguir a spec: 20 por IP a cada 15 min
      "/sign-in/email": { window: 15 * 60, max: 20 },
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
  plugins: [nextCookies()], // deve ser o último plugin
});

export type Session = typeof auth.$Infer.Session;
