import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  /** Origens extras confiáveis para login (ex.: domínio temporário antes do DNS), separadas por vírgula. */
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  MAIL_FROM: z.string().min(3),
  ADMIN_NOTIFY_EMAIL: z.email(),
  S3_ENDPOINT: z.url(),
  /** URL do storage alcançável pelo navegador (assina os links de download). Padrão: S3_ENDPOINT. */
  S3_PUBLIC_ENDPOINT: z.url().optional(),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  /** Agendador das automações: "1" liga, "0" desliga. Sem valor: ligado só em produção. */
  JOBS_ENABLED: z.enum(["0", "1"]).optional(),
  /** Logins por IP a cada 15 min no Better Auth (padrão 60). O CI sobe para a suíte E2E inteira, que entra pelo mesmo IP. */
  LOGIN_IP_LIMIT: z.coerce.number().int().positive().optional(),
  /** "1" no servidor da suíte E2E (CI roda em modo produção): libera rotas e regras só de teste. */
  E2E: z.enum(["0", "1"]).optional(),
  SEED_ADMIN_EMAIL: z.email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(10).optional(),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  return result.data;
}

export const env: Env = process.env.SKIP_ENV_VALIDATION === "1" ? (process.env as unknown as Env) : parseEnv(process.env);
