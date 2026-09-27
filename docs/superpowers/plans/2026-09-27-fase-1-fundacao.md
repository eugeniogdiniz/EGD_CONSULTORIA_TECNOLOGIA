# Fase 1 — Fundação: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o site estático EGD em um app Next.js com login, organizações multi-tenant, esqueleto dos portais admin e cliente, formulário de contato gravando leads, e deploy no Coolify em egdsystem.com.br.

**Architecture:** Monolito Next.js 16 (App Router) com quatro grupos de rotas (site, auth, portal, admin) e módulos por domínio em `src/modules/*`, cada um com `schema.ts` (Drizzle), `queries.ts` e `actions.ts`. Better Auth cuida de sessão e senha; a autorização vive em `requireAdmin()`/`requirePortal()` que toda query e action recebe. Um container roda migrations e depois o servidor.

**Tech Stack:** Next.js 16.3, React 19.3, TypeScript, Tailwind 4.3, shadcn/ui, Drizzle ORM 0.45 + drizzle-kit 0.31 + postgres.js 3.4, Better Auth 1.7, Zod 4.6, nodemailer 10, @aws-sdk/client-s3 (MinIO), Vitest 5, Playwright 1.63, Node 24, Docker, Coolify.

**Spec:** `docs/superpowers/specs/2026-09-27-fase-1-fundacao-design.md`

## Global Constraints

- Páginas e componentes nunca importam `@/lib/db`; só `queries.ts`/`actions.ts` dos módulos.
- Toda query do portal filtra por `organization_id` vindo do contexto de sessão, nunca de URL/form.
- Actions retornam `ActionResult<T>` (`{ ok: true, data } | { ok: false, error, fieldErrors? }`), nunca lançam para o cliente.
- Toda tabela de dado de cliente tem `organization_id`.
- Segredos só em variáveis de ambiente validadas por `src/lib/env.ts`; chave ausente derruba o processo.
- Sem cadastro aberto: `/api/auth/sign-up/email` só aceita requisição com `invitationToken` válido.
- Senha mínima 10 caracteres; checada no HIBP (k-anonimato); falha de rede no HIBP aceita a senha e loga aviso.
- Rate limit login: 5/e-mail e 20/IP por 15 min. Contato: 3/IP por hora.
- Convite expira em 7 dias, uso único; reset de senha expira em 1 h.
- Arquivos: máx. 50 MB; nunca servidos direto do bucket; URL assinada com 5 min.
- UI: mockup HTML aprovado antes de qualquer código de tela (Task 10 é gate). Sem Inter/Roboto/Arial/Helvetica/system-ui como fonte principal; sem gradiente roxo; sem grid de 3 cards com ícone genérico; sem emoji em título. Textos passam por `stop-slop`.
- Usuário `client` em `/admin/*` recebe 404, não 403.
- Site antigo continua publicado no GitHub Pages até o novo responder no domínio.
- Commits pequenos; mensagem termina com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. **E-mail com maiúsculas ou espaços no convite/login** (`" Joao@Empresa.com "`): deve normalizar para minúsculas e trim antes de comparar; testado na Task 8 (`normalizeEmail`) e no hook de sign-up.
2. **Convite aceito duas vezes ou após expirar**: segunda tentativa recebe erro claro e não cria membership duplicada; testado na Task 8 (`acceptInvitation`).
3. **Cookie de organização ativa apontando para organização da qual o usuário foi removido ou que foi inativada**: cai para a primeira organização válida ou bloqueia com mensagem; testado na Task 4 (`resolveActiveOrganization`).
4. **Nome de arquivo com caracteres perigosos** (`../../etc/passwd`, `ação ç.PDF`, 300 caracteres): a chave no bucket é sanitizada e truncada; testado na Task 6 (`sanitizeFilename`).
5. **Formulário de contato com honeypot preenchido ou mensagem acima de 4000 caracteres**: não grava lead, responde como sucesso silencioso no honeypot e erro de campo no tamanho; testado na Task 9.

---

## Mapa de arquivos

| Caminho | Responsabilidade |
|---------|------------------|
| `legacy/` | site antigo (referência de conteúdo; publicado pelo Pages até o fim) |
| `src/lib/env.ts` | validação Zod das variáveis de ambiente |
| `src/lib/db.ts` | instância Drizzle + postgres.js |
| `src/lib/auth.ts` | instância Better Auth |
| `src/lib/mail.ts` | transporter nodemailer |
| `src/lib/storage.ts` | S3Client para MinIO |
| `src/lib/rate-limit.ts` | limitador em memória reutilizável |
| `src/lib/action-result.ts` | tipo `ActionResult` e helpers |
| `src/lib/logger.ts` | log estruturado com id de correlação |
| `src/db/schema.ts` | agrega `schema.ts` de todos os módulos |
| `src/db/migrations/` | SQL gerado pelo drizzle-kit |
| `src/db/seed.ts` | cria admin inicial |
| `scripts/migrate.mjs` | aplica migrations no boot do container |
| `src/modules/auth/` | tabelas Better Auth, contexto de sessão, hooks (convite, HIBP, limiter) |
| `src/modules/tenancy/` | organizations, memberships, invitations |
| `src/modules/leads/` | leads do formulário |
| `src/modules/files/` | metadados e acesso a arquivos |
| `src/modules/audit/` | audit_log |
| `src/modules/mail/` | templates e funções de envio |
| `src/content/` | textos do site público |
| `src/components/ui/` | shadcn/ui |
| `src/components/site/` | chrome do site público |
| `src/components/shell/` | chrome dos portais |
| `src/app/(site)|(auth)|(portal)|(admin)/` | rotas |
| `src/proxy.ts` | proteção de rotas |
| `tests/unit/`, `tests/e2e/` | Vitest, Playwright |
| `docs/specs/design-system.md`, `docs/mockups/*.html` | design aprovado |
| `docs/runbooks/coolify.md` | provisionamento manual |
| `Dockerfile`, `docker-compose.dev.yml`, `.env.example` | infra |

---

### Task 1: Scaffold do app Next.js e preservação do site antigo

**Files:**
- Move: `index.html, servicos.html, produtos.html, sobre.html, contato.html, cases.html, assets/, .nojekyll` → `legacy/`
- Delete: `export/`, `uploads/` (avisar o usuário: `uploads/Planilha de Capex.xlsx` sai do repo; copiar para fora antes)
- Modify: `.github/workflows/pages.yml` (copiar de `legacy/`)
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/health/route.ts`, `src/lib/env.ts`, `vitest.config.ts`, `tests/unit/env.test.ts`, `.env.example`, `.gitignore`, `README.md`

**Interfaces:**
- Produces: `env` (objeto tipado) de `@/lib/env`; rota `GET /api/health` → `{ ok: true }`.

- [ ] **Step 1: Mover site antigo e ajustar o workflow do Pages**

```bash
mkdir legacy && git mv index.html servicos.html produtos.html sobre.html contato.html cases.html assets .nojekyll legacy/
git rm -r export uploads
```

Em `.github/workflows/pages.yml`, substituir o bloco "Prepare static site" por:

```yaml
      - name: Prepare static site
        shell: bash
        run: |
          mkdir -p dist
          cp -R legacy/. dist/
```

- [ ] **Step 2: Criar o app Next.js dentro do repo**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --yes
```

Se o CLI recusar por a pasta não estar vazia, criar em `../egd-tmp` e mover os arquivos gerados para a raiz (exceto `.git`). Confirmar `next` em `^16.3`, `react` em `^19.3`, `tailwindcss` em `^4.3`.

- [ ] **Step 3: Instalar dependências da fundação**

```bash
npm i drizzle-orm postgres better-auth zod nodemailer @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm i -D drizzle-kit vitest @vitest/coverage-v8 @playwright/test @types/nodemailer tsx dotenv
```

- [ ] **Step 4: `next.config.ts` com standalone e cabeçalhos de segurança**

```ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
export default nextConfig;
```

- [ ] **Step 5: Teste falhando para `env.ts`**

`tests/unit/env.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://egd:egd@localhost:5432/egd",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  SMTP_HOST: "localhost", SMTP_PORT: "1025", SMTP_USER: "", SMTP_PASS: "",
  MAIL_FROM: "EGD <no-reply@egdsystem.com.br>",
  ADMIN_NOTIFY_EMAIL: "admin@egdsystem.com.br",
  S3_ENDPOINT: "http://localhost:9000", S3_BUCKET: "egd",
  S3_ACCESS_KEY: "minio", S3_SECRET_KEY: "minio12345",
};

describe("parseEnv", () => {
  it("aceita ambiente válido e converte porta para número", () => {
    const env = parseEnv(valid);
    expect(env.SMTP_PORT).toBe(1025);
  });
  it("rejeita segredo curto com mensagem que cita a chave", () => {
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: "curto" })).toThrow(/BETTER_AUTH_SECRET/);
  });
  it("rejeita chave ausente", () => {
    const { DATABASE_URL: _omit, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow(/DATABASE_URL/);
  });
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

Adicionar em `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"typecheck": "tsc --noEmit"`.

- [ ] **Step 6: Rodar e ver falhar**

Run: `npm test -- env` → FAIL: cannot find module `@/lib/env`.

- [ ] **Step 7: Implementar `src/lib/env.ts`**

```ts
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  MAIL_FROM: z.string().min(3),
  ADMIN_NOTIFY_EMAIL: z.email(),
  S3_ENDPOINT: z.url(),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
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
```

`SKIP_ENV_VALIDATION=1` é usado só no estágio de build do Docker (Task 17), onde não há segredos.

- [ ] **Step 8: Rodar e ver passar**

Run: `npm test -- env` → PASS (3 testes).

- [ ] **Step 9: Health route, layout mínimo, `.env.example`, `.gitignore`, README**

`src/app/api/health/route.ts`:

```ts
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ ok: true, ts: new Date().toISOString() });
}
```

`src/app/layout.tsx` fica o gerado pelo CLI com `lang="pt-BR"`. `src/app/page.tsx` mostra só `<h1>EGD</h1>` (substituído na Task 12).

`.env.example` lista todas as chaves de `env.ts` com valores do compose local (Task 2). `.gitignore`: acrescentar `.env`, `.env.local`, `test-results/`, `playwright-report/`.

`README.md`: substituir por seções "Requisitos (Node 24, Docker)", "Rodar local (`docker compose -f docker-compose.dev.yml up -d`, `cp .env.example .env`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`)", "Testes", "Deploy (ver docs/runbooks/coolify.md)".

- [ ] **Step 10: Typecheck, lint, commit**

Run: `npm run typecheck && npm run lint && npm test` → tudo verde.

```bash
git add -A
git commit -m "Scaffold Next.js 16 e move site antigo para legacy/

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Ambiente local (Compose), Drizzle e tabelas da fundação

**Files:**
- Create: `docker-compose.dev.yml`, `drizzle.config.ts`, `src/lib/db.ts`, `src/db/schema.ts`, `src/modules/auth/schema.ts`, `src/modules/tenancy/schema.ts`, `src/modules/leads/schema.ts`, `src/modules/files/schema.ts`, `src/modules/audit/schema.ts`, `scripts/migrate.mjs`, `src/db/migrations/*`

**Interfaces:**
- Produces: `db` de `@/lib/db`; tabelas exportadas: `users, sessions, accounts, verifications, organizations, memberships, invitations, leads, files, auditLog`; enums `userRole`, `organizationStatus`, `leadStatus`.

- [ ] **Step 1: `docker-compose.dev.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: egd, POSTGRES_PASSWORD: egd, POSTGRES_DB: egd }
    ports: ["5432:5432"]
    volumes: ["egd_pg:/var/lib/postgresql/data"]
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment: { MINIO_ROOT_USER: minio, MINIO_ROOT_PASSWORD: minio12345 }
    ports: ["9000:9000", "9001:9001"]
    volumes: ["egd_minio:/data"]
  minio-init:
    image: minio/mc:latest
    depends_on: [minio]
    entrypoint: >
      /bin/sh -c "sleep 3; mc alias set local http://minio:9000 minio minio12345; mc mb -p local/egd || true"
  mailpit:
    image: axllent/mailpit:latest
    ports: ["1025:1025", "8025:8025"]
volumes: { egd_pg: {}, egd_minio: {} }
```

Run: `docker compose -f docker-compose.dev.yml up -d` e confirmar `http://localhost:8025` (Mailpit) e `http://localhost:9001` (MinIO) abrem.

- [ ] **Step 2: `src/lib/db.ts` e `drizzle.config.ts`**

```ts
// src/lib/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };
const client = globalForDb.pgClient ?? postgres(env.DATABASE_URL, { max: 10 });
if (env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Db = typeof db;
```

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import "dotenv/config";
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 3: Tabelas do Better Auth (`src/modules/auth/schema.ts`)**

Colunas seguem o que `npx auth generate --adapter drizzle --dialect pg` produz, com ids `uuid` e campos extras `role`/`active`:

```ts
import { pgTable, pgEnum, text, timestamp, boolean, uuid, index } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "client"]);

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().default(false).notNull(),
  image: text(),
  role: userRole().default("client").notNull(),
  active: boolean().default(true).notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  token: text().notNull().unique(),
  ipAddress: text(),
  userAgent: text(),
  userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [index("sessions_user_id_idx").on(t.userId)]);

export const accounts = pgTable("accounts", {
  id: uuid().primaryKey().defaultRandom(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text(), refreshToken: text(), idToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  password: text(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [index("accounts_user_id_idx").on(t.userId)]);

export const verifications = pgTable("verifications", {
  id: uuid().primaryKey().defaultRandom(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [index("verifications_identifier_idx").on(t.identifier)]);
```

- [ ] **Step 4: Tenancy, leads, files, audit**

`src/modules/tenancy/schema.ts`:

```ts
import { pgTable, pgEnum, text, timestamp, uuid, primaryKey, index } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";

export const organizationStatus = pgEnum("organization_status", ["active", "inactive"]);

export const organizations = pgTable("organizations", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  cnpj: text(),
  status: organizationStatus().default("active").notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const memberships = pgTable("memberships", {
  userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.organizationId] })]);

export const invitations = pgTable("invitations", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull(),
  organizationId: uuid().notNull().references(() => organizations.id, { onDelete: "cascade" }),
  tokenHash: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  acceptedAt: timestamp({ withTimezone: true }),
  invitedBy: uuid().notNull().references(() => users.id),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("invitations_email_idx").on(t.email)]);
```

`src/modules/leads/schema.ts`:

```ts
import { pgTable, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";
export const leadStatus = pgEnum("lead_status", ["new", "seen"]);
export const leads = pgTable("leads", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull(),
  company: text(),
  phone: text(),
  message: text().notNull(),
  source: text().default("site_contact").notNull(),
  status: leadStatus().default("new").notNull(),
  ipHash: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
```

`src/modules/files/schema.ts`:

```ts
import { pgTable, text, timestamp, uuid, bigint, index } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/schema";
import { organizations } from "@/modules/tenancy/schema";
export const files = pgTable("files", {
  id: uuid().primaryKey().defaultRandom(),
  bucketKey: text().notNull().unique(),
  originalName: text().notNull(),
  mimeType: text().notNull(),
  sizeBytes: bigint({ mode: "number" }).notNull(),
  organizationId: uuid().references(() => organizations.id, { onDelete: "cascade" }),
  uploadedBy: uuid().notNull().references(() => users.id),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("files_org_idx").on(t.organizationId)]);
```

`src/modules/audit/schema.ts`:

```ts
import { pgTable, text, timestamp, uuid, bigserial, jsonb, index } from "drizzle-orm/pg-core";
export const auditLog = pgTable("audit_log", {
  id: bigserial({ mode: "number" }).primaryKey(),
  actorId: uuid(),
  action: text().notNull(),
  entityType: text().notNull(),
  entityId: text().notNull(),
  organizationId: uuid(),
  metadata: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("audit_org_idx").on(t.organizationId), index("audit_created_idx").on(t.createdAt)]);
```

`src/db/schema.ts`:

```ts
export * from "@/modules/auth/schema";
export * from "@/modules/tenancy/schema";
export * from "@/modules/leads/schema";
export * from "@/modules/files/schema";
export * from "@/modules/audit/schema";
```

- [ ] **Step 5: Gerar migration e aplicar**

Scripts em `package.json`: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "node scripts/migrate.mjs"`, `"db:studio": "drizzle-kit studio"`.

`scripts/migrate.mjs` (JS puro para rodar na imagem standalone sem tsx):

```js
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL ausente"); process.exit(1); }
const client = postgres(url, { max: 1 });
try {
  await migrate(drizzle(client), { migrationsFolder: "./src/db/migrations" });
  console.log("migrations aplicadas");
} finally { await client.end(); }
```

Run: `cp .env.example .env && npm run db:generate && npm run db:migrate` → pasta `src/db/migrations/0000_*.sql` criada e "migrations aplicadas".

- [ ] **Step 6: Verificar tabelas e commitar**

Run: `docker compose -f docker-compose.dev.yml exec db psql -U egd -c "\dt"` → lista `users, sessions, accounts, verifications, organizations, memberships, invitations, leads, files, audit_log`.

```bash
git add -A
git commit -m "Adiciona compose local, Drizzle e tabelas da fundação

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Utilitários compartilhados (ActionResult, rate limiter, logger)

**Files:**
- Create: `src/lib/action-result.ts`, `src/lib/rate-limit.ts`, `src/lib/logger.ts`, `tests/unit/rate-limit.test.ts`, `tests/unit/action-result.test.ts`

**Interfaces:**
- Produces:
  - `type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }`
  - `ok<T>(data: T)`, `fail(error: string, fieldErrors?)`, `fromZod(error: ZodError)` → `ActionResult<never>`
  - `createRateLimiter({ windowMs, max }) → { hit(key: string, now?: number): { allowed: boolean; remaining: number } }`
  - `logger.info/warn/error(msg: string, meta?: Record<string, unknown>)`, `newCorrelationId(): string`

- [ ] **Step 1: Testes falhando**

`tests/unit/rate-limit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("permite até max dentro da janela e bloqueia o seguinte", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 2 });
    expect(rl.hit("a", 0).allowed).toBe(true);
    expect(rl.hit("a", 10).allowed).toBe(true);
    expect(rl.hit("a", 20)).toEqual({ allowed: false, remaining: 0 });
  });
  it("libera após a janela expirar", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 1 });
    rl.hit("a", 0);
    expect(rl.hit("a", 1001).allowed).toBe(true);
  });
  it("chaves independentes não se afetam", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 1 });
    rl.hit("a", 0);
    expect(rl.hit("b", 0).allowed).toBe(true);
  });
});
```

`tests/unit/action-result.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ok, fail, fromZod } from "@/lib/action-result";

describe("ActionResult", () => {
  it("ok e fail têm o formato esperado", () => {
    expect(ok(1)).toEqual({ ok: true, data: 1 });
    expect(fail("x")).toEqual({ ok: false, error: "x" });
  });
  it("fromZod agrupa erros por campo", () => {
    const r = z.object({ email: z.email() }).safeParse({ email: "nope" });
    if (r.success) throw new Error("esperava falha");
    const out = fromZod(r.error);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.fieldErrors?.email?.length).toBe(1);
  });
});
```

Run: `npm test` → FAIL (módulos ausentes).

- [ ] **Step 2: Implementar**

```ts
// src/lib/action-result.ts
import { z, type ZodError } from "zod";
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> =>
  fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
export function fromZod(error: ZodError): ActionResult<never> {
  const flat = z.flattenError(error);
  const fieldErrors = Object.fromEntries(
    Object.entries(flat.fieldErrors).filter(([, v]) => v && v.length).map(([k, v]) => [k, v as string[]]),
  );
  return fail("Verifique os campos destacados.", fieldErrors);
}
```

```ts
// src/lib/rate-limit.ts
export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();
  return {
    hit(key: string, now: number = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) { hits.set(key, recent); return { allowed: false, remaining: 0 }; }
      recent.push(now); hits.set(key, recent);
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
      return { allowed: true, remaining: max - recent.length };
    },
  };
}
```

```ts
// src/lib/logger.ts
import { randomUUID } from "node:crypto";
type Meta = Record<string, unknown>;
const write = (level: "info" | "warn" | "error", msg: string, meta?: Meta) =>
  console[level](JSON.stringify({ level, msg, ts: new Date().toISOString(), ...meta }));
export const logger = {
  info: (m: string, meta?: Meta) => write("info", m, meta),
  warn: (m: string, meta?: Meta) => write("warn", m, meta),
  error: (m: string, meta?: Meta) => write("error", m, meta),
};
export const newCorrelationId = () => randomUUID().slice(0, 8);
```

- [ ] **Step 3: Rodar e commitar**

Run: `npm test` → PASS.

```bash
git add -A && git commit -m "Adiciona ActionResult, rate limiter e logger

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Better Auth, hooks de segurança e contexto de sessão

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/app/api/auth/[...all]/route.ts`, `src/modules/auth/hibp.ts`, `src/modules/auth/login-limiter.ts`, `src/modules/auth/hooks.ts`, `src/modules/auth/context.ts`, `src/modules/auth/normalize-email.ts`, `src/modules/tenancy/tokens.ts`, `src/proxy.ts`, `src/db/seed.ts`, `tests/unit/hibp.test.ts`, `tests/unit/context.test.ts`, `tests/unit/tokens.test.ts`, `tests/unit/normalize-email.test.ts`

**Interfaces:**
- Consumes: `db`, tabelas de `@/db/schema`, `createRateLimiter`, `env`.
- Produces:
  - `auth` (instância Better Auth) com `user.role: "admin"|"client"`, `user.active: boolean`.
  - `authClient` (`createAuthClient` de `better-auth/react`) para formulários client-side.
  - `normalizeEmail(s: string): string`.
  - `generateToken(): { raw: string; hash: string }`, `hashToken(raw: string): string`.
  - `isPwnedPassword(pw: string, fetchImpl?: typeof fetch): Promise<boolean>` (false em erro de rede).
  - `type SessionUser = { id: string; name: string; email: string; role: "admin" | "client"; active: boolean }`
  - `type OrgSummary = { id: string; name: string; slug: string; status: "active" | "inactive" }`
  - `type AdminContext = { kind: "admin"; user: SessionUser }`
  - `type PortalContext = { kind: "portal"; user: SessionUser; organization: OrgSummary; organizations: OrgSummary[] }`
  - `getSessionUser(): Promise<SessionUser | null>`, `requireAdmin(): Promise<AdminContext>` (redirect/notFound), `requirePortal(): Promise<PortalContext>` (redirect), `resolveActiveOrganization(orgs: OrgSummary[], cookieValue: string | undefined): OrgSummary | null` (pura).
  - Cookie `egd_org` com id da organização ativa.

- [ ] **Step 1: Testes puros falhando**

`tests/unit/normalize-email.test.ts`:

```ts
import { it, expect } from "vitest";
import { normalizeEmail } from "@/modules/auth/normalize-email";
it("trim + lowercase", () => expect(normalizeEmail("  Joao@Empresa.COM ")).toBe("joao@empresa.com"));
```

`tests/unit/tokens.test.ts`:

```ts
import { it, expect } from "vitest";
import { generateToken, hashToken } from "@/modules/tenancy/tokens";
it("gera token de 43+ chars url-safe e hash determinístico", () => {
  const { raw, hash } = generateToken();
  expect(raw).toMatch(/^[A-Za-z0-9_-]{43,}$/);
  expect(hashToken(raw)).toBe(hash);
  expect(generateToken().raw).not.toBe(raw);
});
```

`tests/unit/hibp.test.ts`:

```ts
import { it, expect } from "vitest";
import { isPwnedPassword } from "@/modules/auth/hibp";
// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8 → prefixo 5BAA6, sufixo 1E4C9...
const fakeFetch = (body: string, status = 200) => (async () => new Response(body, { status })) as unknown as typeof fetch;
it("detecta senha vazada quando sufixo aparece na resposta", async () => {
  expect(await isPwnedPassword("password", fakeFetch("1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\nABC:1"))).toBe(true);
});
it("retorna false quando sufixo não aparece", async () => {
  expect(await isPwnedPassword("password", fakeFetch("ABC:1"))).toBe(false);
});
it("falha aberta em erro de rede", async () => {
  const boom = (async () => { throw new Error("net"); }) as unknown as typeof fetch;
  expect(await isPwnedPassword("password", boom)).toBe(false);
});
```

`tests/unit/context.test.ts`:

```ts
import { it, expect } from "vitest";
import { resolveActiveOrganization, type OrgSummary } from "@/modules/auth/context";
const a: OrgSummary = { id: "a", name: "A", slug: "a", status: "active" };
const b: OrgSummary = { id: "b", name: "B", slug: "b", status: "active" };
const off: OrgSummary = { id: "c", name: "C", slug: "c", status: "inactive" };
it("usa o cookie quando aponta para organização ativa do usuário", () =>
  expect(resolveActiveOrganization([a, b], "b")).toEqual(b));
it("cai para a primeira ativa quando cookie é inválido ou de org removida", () =>
  expect(resolveActiveOrganization([a, b], "zzz")).toEqual(a));
it("ignora organizações inativas", () =>
  expect(resolveActiveOrganization([off, b], "c")).toEqual(b));
it("retorna null sem organizações ativas", () =>
  expect(resolveActiveOrganization([off], undefined)).toBeNull());
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implementar utilitários puros**

```ts
// src/modules/auth/normalize-email.ts
export const normalizeEmail = (s: string) => s.trim().toLowerCase();
```

```ts
// src/modules/tenancy/tokens.ts
import { createHash, randomBytes } from "node:crypto";
export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");
export function generateToken() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}
```

```ts
// src/modules/auth/hibp.ts
import { createHash } from "node:crypto";
import { logger } from "@/lib/logger";
export async function isPwnedPassword(password: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5), suffix = sha1.slice(5);
  try {
    const res = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" }, signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HIBP status ${res.status}`);
    const text = await res.text();
    return text.split(/\r?\n/).some((line) => line.split(":")[0] === suffix && Number(line.split(":")[1]) > 0);
  } catch (err) {
    logger.warn("hibp.unavailable", { err: String(err) });
    return false;
  }
}
```

- [ ] **Step 3: Better Auth (`src/lib/auth.ts`) com hooks**

```ts
// src/modules/auth/login-limiter.ts
import { createRateLimiter } from "@/lib/rate-limit";
export const loginByEmail = createRateLimiter({ windowMs: 15 * 60_000, max: 5 });
```

```ts
// src/modules/auth/hooks.ts
import { createAuthMiddleware, APIError } from "better-auth/api";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, users } from "@/db/schema";
import { hashToken } from "@/modules/tenancy/tokens";
import { normalizeEmail } from "./normalize-email";
import { isPwnedPassword } from "./hibp";
import { loginByEmail } from "./login-limiter";

const PASSWORD_PATHS = new Set(["/sign-up/email", "/reset-password", "/change-password"]);

export const beforeHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/sign-in/email") {
    const email = normalizeEmail(String(ctx.body?.email ?? ""));
    if (!loginByEmail.hit(email).allowed)
      throw new APIError("TOO_MANY_REQUESTS", { message: "Muitas tentativas. Aguarde 15 minutos." });
    const u = await db.query.users.findFirst({ where: eq(users.email, email), columns: { active: true } });
    if (u && !u.active)
      throw new APIError("UNAUTHORIZED", { message: "E-mail ou senha incorretos." }); // mesma mensagem: não revela status
    ctx.body.email = email;
  }
  if (ctx.path === "/sign-up/email") {
    const token = String(ctx.body?.invitationToken ?? "");
    const email = normalizeEmail(String(ctx.body?.email ?? ""));
    const inv = token
      ? await db.query.invitations.findFirst({
          where: and(eq(invitations.tokenHash, hashToken(token)), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date())),
        })
      : undefined;
    if (!inv || inv.email !== email)
      throw new APIError("FORBIDDEN", { message: "Convite inválido ou expirado." });
    ctx.body.email = email;
  }
  if (PASSWORD_PATHS.has(ctx.path)) {
    const pw = String(ctx.body?.password ?? ctx.body?.newPassword ?? "");
    if (pw && (await isPwnedPassword(pw)))
      throw new APIError("BAD_REQUEST", { message: "Essa senha apareceu em vazamentos públicos. Escolha outra." });
  }
});
```

```ts
// src/lib/auth.ts
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
  advanced: { database: { generateId: "uuid" }, useSecureCookies: env.NODE_ENV === "production" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => { await sendPasswordResetEmail({ to: user.email, url }); },
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, window: 15 * 60, max: 20, customRules: { "/get-session": false } },
  user: {
    additionalFields: {
      role: { type: "string", input: false, defaultValue: "client" },
      active: { type: "boolean", input: false, defaultValue: true },
    },
  },
  hooks: { before: beforeHook },
  plugins: [nextCookies()],
});
export type Session = typeof auth.$Infer.Session;
```

Se o adapter reclamar de `generateId: "uuid"`, usar `generateId: false` (o banco gera via `defaultRandom()`); registrar no commit qual funcionou.

```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
```

```ts
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

`sendPasswordResetEmail` é criado na Task 5; até lá, criar `src/modules/mail/send.ts` com a assinatura e corpo `logger.info("mail.stub", {...})` para o typecheck passar.

- [ ] **Step 4: Contexto de sessão (`src/modules/auth/context.ts`)**

```ts
import { headers, cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/db/schema";

export type SessionUser = { id: string; name: string; email: string; role: "admin" | "client"; active: boolean };
export type OrgSummary = { id: string; name: string; slug: string; status: "active" | "inactive" };
export type AdminContext = { kind: "admin"; user: SessionUser };
export type PortalContext = { kind: "portal"; user: SessionUser; organization: OrgSummary; organizations: OrgSummary[] };
export const ORG_COOKIE = "egd_org";

export function resolveActiveOrganization(orgs: OrgSummary[], cookieValue: string | undefined): OrgSummary | null {
  const active = orgs.filter((o) => o.status === "active");
  return active.find((o) => o.id === cookieValue) ?? active[0] ?? null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as SessionUser;
  return u.active ? { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active } : null;
}

export async function requireAdmin(): Promise<AdminContext> {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/admin");
  if (user.role !== "admin") notFound();
  return { kind: "admin", user };
}

export async function listUserOrganizations(userId: string): Promise<OrgSummary[]> {
  return db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, status: organizations.status })
    .from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId)).orderBy(organizations.name);
}

export async function requirePortal(): Promise<PortalContext> {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?next=/portal");
  const orgs = await listUserOrganizations(user.id);
  const organization = resolveActiveOrganization(orgs, (await cookies()).get(ORG_COOKIE)?.value);
  if (!organization) redirect("/portal/sem-acesso");
  return { kind: "portal", user, organization, organizations: orgs.filter((o) => o.status === "active") };
}
```

Admin também pode entrar em `/portal`? Não na Fase 1: `requirePortal` para role `admin` redireciona para `/admin` (adicionar `if (user.role === "admin") redirect("/admin")` após obter `user`).

- [ ] **Step 5: `src/proxy.ts` (proteção barata na borda)**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(getSessionCookie(req));
  if (!hasSession && (pathname.startsWith("/admin") || pathname.startsWith("/portal"))) {
    const url = new URL("/entrar", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (hasSession && pathname === "/entrar") return NextResponse.redirect(new URL("/portal", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*", "/portal/:path*", "/entrar"] };
```

O proxy só checa existência do cookie; a validação real e a checagem de role ficam em `requireAdmin`/`requirePortal` nos layouts (Tasks 14 e 15).

- [ ] **Step 6: Seed do admin (`src/db/seed.ts`)**

```ts
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/modules/auth/normalize-email";

async function main() {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) throw new Error("SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD são obrigatórios");
  const email = normalizeEmail(env.SEED_ADMIN_EMAIL);
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) { console.log("admin já existe"); return; }
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser({ email, name: "Administrador", emailVerified: true, role: "admin", active: true });
  await ctx.internalAdapter.linkAccount({
    userId: user.id, providerId: "credential", accountId: user.id,
    password: await ctx.password.hash(env.SEED_ADMIN_PASSWORD),
  });
  console.log("admin criado:", email);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

Script: `"db:seed": "tsx src/db/seed.ts"`. Adicionar `SEED_ADMIN_EMAIL=admin@egdsystem.com.br` e `SEED_ADMIN_PASSWORD=troque-esta-senha-local` no `.env.example`.

- [ ] **Step 7: Verificar**

Run: `npm test` → PASS. `npm run typecheck` → OK. `npm run db:seed` → "admin criado". `npm run dev` e `curl -X POST localhost:3000/api/auth/sign-in/email -H 'content-type: application/json' -d '{"email":"admin@egdsystem.com.br","password":"troque-esta-senha-local"}'` → 200 com `token`. Repetir com senha errada 6 vezes → 6ª resposta 429. `psql -c "update users set active=false where email='admin@egdsystem.com.br'"` e tentar login → 401; reverter com `active=true`. `curl -X POST .../sign-up/email -d '{"name":"x","email":"x@x.com","password":"abcdefghij"}'` → 403 "Convite inválido ou expirado."

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Configura Better Auth com hooks de convite, HIBP e rate limit; contexto de sessão e proxy

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Módulo de e-mail

**Files:**
- Create: `src/lib/mail.ts`, `src/modules/mail/send.ts`, `src/modules/mail/templates.ts`, `tests/unit/mail-templates.test.ts`

**Interfaces:**
- Produces: `sendInvitationEmail({ to, organizationName, acceptUrl })`, `sendPasswordResetEmail({ to, url })`, `sendLeadNotification({ name, email, company, message })` → `Promise<void>`; todas capturam erro, logam `mail.failed` e não lançam. `renderInvitation`, `renderPasswordReset`, `renderLeadNotification` → `{ subject: string; text: string; html: string }`.

- [ ] **Step 1: Teste falhando**

```ts
// tests/unit/mail-templates.test.ts
import { it, expect } from "vitest";
import { renderInvitation, renderLeadNotification } from "@/modules/mail/templates";
it("convite inclui organização e link", () => {
  const m = renderInvitation({ organizationName: "ACME", acceptUrl: "https://egdsystem.com.br/convite/abc" });
  expect(m.subject).toContain("ACME");
  expect(m.text).toContain("https://egdsystem.com.br/convite/abc");
  expect(m.html).toContain("href=\"https://egdsystem.com.br/convite/abc\"");
});
it("notificação de lead escapa HTML da mensagem", () => {
  const m = renderLeadNotification({ name: "X", email: "x@x.com", company: null, message: "<script>alert(1)</script>" });
  expect(m.html).not.toContain("<script>");
  expect(m.html).toContain("&lt;script&gt;");
});
```

- [ ] **Step 2: Implementar**

```ts
// src/lib/mail.ts
import nodemailer from "nodemailer";
import { env } from "@/lib/env";
export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});
```

```ts
// src/modules/mail/templates.ts
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const layout = (title: string, body: string) =>
  `<!doctype html><html lang="pt-BR"><body style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:20px">${esc(title)}</h1>${body}
  <p style="margin-top:32px;font-size:12px;color:#666">EGD Consultoria & Tecnologia · egdsystem.com.br</p></body></html>`;

export function renderInvitation(p: { organizationName: string; acceptUrl: string }) {
  const subject = `Acesso ao portal EGD: ${p.organizationName}`;
  const text = `Você foi convidado para o portal da ${p.organizationName} na EGD.\n\nCrie sua senha em: ${p.acceptUrl}\n\nO link vale por 7 dias.`;
  const html = layout(subject, `<p>Você foi convidado para o portal da <strong>${esc(p.organizationName)}</strong> na EGD.</p>
    <p><a href="${esc(p.acceptUrl)}">Criar minha senha</a></p><p>O link vale por 7 dias.</p>`);
  return { subject, text, html };
}
export function renderPasswordReset(p: { url: string }) {
  const subject = "Redefinição de senha · EGD";
  const text = `Para redefinir sua senha acesse: ${p.url}\n\nO link vale por 1 hora. Se não foi você, ignore este e-mail.`;
  const html = layout(subject, `<p><a href="${esc(p.url)}">Redefinir senha</a></p><p>O link vale por 1 hora. Se não foi você, ignore este e-mail.</p>`);
  return { subject, text, html };
}
export function renderLeadNotification(p: { name: string; email: string; company: string | null; message: string }) {
  const subject = `Novo contato pelo site: ${p.name}${p.company ? ` (${p.company})` : ""}`;
  const text = `Nome: ${p.name}\nE-mail: ${p.email}\nEmpresa: ${p.company ?? "-"}\n\n${p.message}`;
  const html = layout(subject, `<p><strong>Nome:</strong> ${esc(p.name)}<br><strong>E-mail:</strong> ${esc(p.email)}<br><strong>Empresa:</strong> ${esc(p.company ?? "-")}</p><pre style="white-space:pre-wrap">${esc(p.message)}</pre>`);
  return { subject, text, html };
}
```

```ts
// src/modules/mail/send.ts
import { transporter } from "@/lib/mail";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { renderInvitation, renderPasswordReset, renderLeadNotification } from "./templates";

async function deliver(to: string, m: { subject: string; text: string; html: string }) {
  try { await transporter.sendMail({ from: env.MAIL_FROM, to, ...m }); }
  catch (err) { logger.error("mail.failed", { to, subject: m.subject, err: String(err) }); }
}
export const sendInvitationEmail = (p: { to: string; organizationName: string; acceptUrl: string }) => deliver(p.to, renderInvitation(p));
export const sendPasswordResetEmail = (p: { to: string; url: string }) => deliver(p.to, renderPasswordReset(p));
export const sendLeadNotification = (p: { name: string; email: string; company: string | null; message: string }) => deliver(env.ADMIN_NOTIFY_EMAIL, renderLeadNotification(p));
```

- [ ] **Step 3: Verificar e commitar**

Run: `npm test` → PASS. Com dev server: `curl -X POST localhost:3000/api/auth/request-password-reset -H 'content-type: application/json' -d '{"email":"admin@egdsystem.com.br","redirectTo":"/redefinir-senha"}'` → e-mail aparece no Mailpit (localhost:8025).

```bash
git add -A && git commit -m "Adiciona módulo de e-mail com templates de convite, reset e lead

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Módulo de arquivos (MinIO)

**Files:**
- Create: `src/lib/storage.ts`, `src/modules/files/keys.ts`, `src/modules/files/queries.ts`, `src/modules/files/actions.ts`, `tests/unit/file-keys.test.ts`

**Interfaces:**
- Consumes: `AdminContext | PortalContext`, `db`, `files`, `audit()` (Task 7; até lá importar stub).
- Produces:
  - `sanitizeFilename(name: string): string`, `buildBucketKey({ organizationId, fileId, filename }): string`.
  - `putObject(key, body: Buffer, contentType)`, `getSignedDownloadUrl(key, filename): Promise<string>` (5 min).
  - `listFiles(ctx)` → arquivos da org (portal) ou todos (admin); `uploadFile(ctx, formData): Promise<ActionResult<{ id: string }>>`; `getDownloadUrl(ctx, fileId): Promise<ActionResult<{ url: string }>>`.
  - `MAX_FILE_BYTES = 50 * 1024 * 1024`.

- [ ] **Step 1: Teste falhando**

```ts
// tests/unit/file-keys.test.ts
import { it, expect } from "vitest";
import { sanitizeFilename, buildBucketKey } from "@/modules/files/keys";
it("remove path traversal e caracteres não seguros", () =>
  expect(sanitizeFilename("../../etc/passwd")).toBe("etc-passwd"));
it("normaliza acentos, espaços e mantém extensão em minúsculas", () =>
  expect(sanitizeFilename("Relatório Final ç.PDF")).toBe("relatorio-final-c.pdf"));
it("trunca nomes longos preservando extensão", () => {
  const out = sanitizeFilename("a".repeat(300) + ".xlsx");
  expect(out.length).toBeLessThanOrEqual(120);
  expect(out.endsWith(".xlsx")).toBe(true);
});
it("chave por organização e chave interna", () => {
  expect(buildBucketKey({ organizationId: "org1", fileId: "f1", filename: "x.pdf" })).toBe("org/org1/f1-x.pdf");
  expect(buildBucketKey({ organizationId: null, fileId: "f1", filename: "x.pdf" })).toBe("internal/f1-x.pdf");
});
```

- [ ] **Step 2: Implementar**

```ts
// src/modules/files/keys.ts
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).filter((p) => p && p !== "." && p !== "..").join("-");
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) : "";
  let stem = (dot > 0 ? base.slice(0, dot) : base)
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "arquivo";
  const max = 120 - (ext ? ext.length + 1 : 0);
  if (stem.length > max) stem = stem.slice(0, max);
  return ext ? `${stem}.${ext}` : stem;
}
export function buildBucketKey(p: { organizationId: string | null; fileId: string; filename: string }) {
  const safe = sanitizeFilename(p.filename);
  return p.organizationId ? `org/${p.organizationId}/${p.fileId}-${safe}` : `internal/${p.fileId}-${safe}`;
}
```

```ts
// src/lib/storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT, region: "us-east-1", forcePathStyle: true,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});
export const putObject = (key: string, body: Buffer, contentType: string) =>
  s3.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
export const getSignedDownloadUrl = (key: string, filename: string) =>
  getSignedUrl(s3, new GetObjectCommand({
    Bucket: env.S3_BUCKET, Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
  }), { expiresIn: 300 });
```

```ts
// src/modules/files/queries.ts
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files } from "@/db/schema";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
export function listFiles(ctx: AdminContext | PortalContext) {
  const q = db.select().from(files).orderBy(desc(files.createdAt));
  return ctx.kind === "portal" ? q.where(eq(files.organizationId, ctx.organization.id)) : q;
}
export async function getFileForContext(ctx: AdminContext | PortalContext, id: string) {
  const f = await db.query.files.findFirst({ where: eq(files.id, id) });
  if (!f) return null;
  if (ctx.kind === "portal" && f.organizationId !== ctx.organization.id) return null;
  return f;
}
```

```ts
// src/modules/files/actions.ts
"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { files } from "@/db/schema";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { putObject, getSignedDownloadUrl } from "@/lib/storage";
import { audit } from "@/modules/audit/log";
import type { AdminContext, PortalContext } from "@/modules/auth/context";
import { buildBucketKey, MAX_FILE_BYTES } from "./keys";
import { getFileForContext } from "./queries";

export async function uploadFile(ctx: AdminContext, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const file = formData.get("file");
  const orgRaw = formData.get("organizationId");
  const organizationId = z.uuid().nullable().parse(orgRaw ? String(orgRaw) : null);
  if (!(file instanceof File) || file.size === 0) return fail("Selecione um arquivo.", { file: ["Obrigatório"] });
  if (file.size > MAX_FILE_BYTES) return fail("Arquivo acima de 50 MB.", { file: ["Máximo 50 MB"] });
  const id = randomUUID();
  const bucketKey = buildBucketKey({ organizationId, fileId: id, filename: file.name });
  await putObject(bucketKey, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
  await db.insert(files).values({ id, bucketKey, originalName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, organizationId, uploadedBy: ctx.user.id });
  await audit({ actorId: ctx.user.id, action: "file.uploaded", entityType: "file", entityId: id, organizationId, metadata: { name: file.name, size: file.size } });
  return ok({ id });
}

export async function getDownloadUrl(ctx: AdminContext | PortalContext, fileId: string): Promise<ActionResult<{ url: string }>> {
  const f = await getFileForContext(ctx, fileId);
  if (!f) return fail("Arquivo não encontrado.");
  await audit({ actorId: ctx.user.id, action: "file.downloaded", entityType: "file", entityId: f.id, organizationId: f.organizationId });
  return ok({ url: await getSignedDownloadUrl(f.bucketKey, f.originalName) });
}
```

Nota: actions com `"use server"` recebem `ctx` de quem chama (page/route handler) e não do cliente. Na UI (Task 14), a action exportada para o formulário é um wrapper `async (prev, fd) => uploadFile(await requireAdmin(), fd)` definido no server component.

- [ ] **Step 3: Verificar e commitar**

Run: `npm test` → PASS; `npm run typecheck` → OK (com stub de `audit` se Task 7 ainda não existir).

```bash
git add -A && git commit -m "Adiciona módulo de arquivos com MinIO e URL assinada

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Módulo de auditoria

**Files:**
- Create: `src/modules/audit/log.ts`, `src/modules/audit/queries.ts`

**Interfaces:**
- Produces: `audit({ actorId: string | null, action: string, entityType: string, entityId: string, organizationId?: string | null, metadata?: Record<string, unknown> }): Promise<void>` (nunca lança); `listAudit(ctx: AdminContext, { limit = 100 })`.

- [ ] **Step 1: Implementar**

```ts
// src/modules/audit/log.ts
import { db } from "@/lib/db";
import { auditLog } from "@/db/schema";
import { logger } from "@/lib/logger";
export async function audit(e: { actorId: string | null; action: string; entityType: string; entityId: string; organizationId?: string | null; metadata?: Record<string, unknown> }) {
  try {
    await db.insert(auditLog).values({ actorId: e.actorId, action: e.action, entityType: e.entityType, entityId: e.entityId, organizationId: e.organizationId ?? null, metadata: e.metadata ?? {} });
  } catch (err) { logger.error("audit.failed", { action: e.action, err: String(err) }); }
}
```

```ts
// src/modules/audit/queries.ts
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
export function listAudit(_ctx: AdminContext, { limit = 100 } = {}) {
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}
```

- [ ] **Step 2: Registrar login na auditoria**

Em `src/lib/auth.ts`, adicionar `databaseHooks.session.create.after`:

```ts
databaseHooks: {
  session: { create: { after: async (session) => { await audit({ actorId: session.userId, action: "auth.login", entityType: "user", entityId: session.userId, metadata: { ip: session.ipAddress ?? null } }); } } },
},
```

- [ ] **Step 3: Verificar e commitar**

Run: `npm run typecheck` → OK. Login via curl e `psql -c "select action from audit_log"` → `auth.login`.

```bash
git add -A && git commit -m "Adiciona auditoria e registra logins

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Módulo tenancy (organizações, convites, membros)

**Files:**
- Create: `src/modules/tenancy/validation.ts`, `src/modules/tenancy/slug.ts`, `src/modules/tenancy/queries.ts`, `src/modules/tenancy/actions.ts`, `tests/unit/tenancy-validation.test.ts`, `tests/unit/slug.test.ts`, `tests/integration/tenancy.test.ts`, `vitest.integration.config.ts`

**Interfaces:**
- Produces:
  - `organizationSchema` (Zod): `{ name: string(2..120), cnpj?: /^\d{14}$/ após remover pontuação, slug?: string }`; `inviteSchema: { email, organizationId }`.
  - `slugify(name: string): string`.
  - queries: `listOrganizations(ctx)`, `getOrganization(ctx, id)`, `listOrganizationMembers(ctx, orgId)` → `{ id, name, email, active }[]`, `listPendingInvitations(ctx, orgId)`, `getInvitationByToken(raw)` → `{ id, email, organizationId, organizationName } | null` (válido, não aceito, não expirado), `countOrganizations()`.
  - actions: `createOrganization(ctx, input) → ActionResult<{ id }>`, `updateOrganization(ctx, id, input)`, `setOrganizationStatus(ctx, id, status)`, `inviteUser(ctx, input) → ActionResult<{ invitationId }>`, `resendInvitation(ctx, invitationId)`, `acceptInvitation({ token, name, password, headers }) → ActionResult<{ organizationId }>`, `setUserActive(ctx, userId, active)`.

- [ ] **Step 1: Testes unitários falhando**

```ts
// tests/unit/slug.test.ts
import { it, expect } from "vitest";
import { slugify } from "@/modules/tenancy/slug";
it("slugifica com acentos e símbolos", () => expect(slugify("Construtora São João & Cia.")).toBe("construtora-sao-joao-cia"));
```

```ts
// tests/unit/tenancy-validation.test.ts
import { it, expect } from "vitest";
import { organizationSchema, inviteSchema } from "@/modules/tenancy/validation";
it("normaliza CNPJ com pontuação", () =>
  expect(organizationSchema.parse({ name: "ACME", cnpj: "12.345.678/0001-95" }).cnpj).toBe("12345678000195"));
it("rejeita CNPJ com tamanho errado", () =>
  expect(organizationSchema.safeParse({ name: "ACME", cnpj: "123" }).success).toBe(false));
it("aceita cnpj vazio como null", () =>
  expect(organizationSchema.parse({ name: "ACME", cnpj: "" }).cnpj).toBeNull());
it("convite normaliza e-mail", () =>
  expect(inviteSchema.parse({ email: " A@B.com ", organizationId: "0b8f8a2e-4c1a-4a38-9a5e-2f0d9a1c6b11" }).email).toBe("a@b.com"));
```

- [ ] **Step 2: Implementar validação e slug**

```ts
// src/modules/tenancy/slug.ts
export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
```

```ts
// src/modules/tenancy/validation.ts
import { z } from "zod";
import { normalizeEmail } from "@/modules/auth/normalize-email";
export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  cnpj: z.string().trim().transform((v) => v.replace(/\D/g, "")).refine((v) => v === "" || v.length === 14, "CNPJ deve ter 14 dígitos").transform((v) => (v === "" ? null : v)).optional().default(""),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(80).optional(),
});
export type OrganizationInput = z.input<typeof organizationSchema>;
export const inviteSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email("E-mail inválido")),
  organizationId: z.uuid(),
});
export const acceptInvitationSchema = z.object({
  token: z.string().min(20),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(10, "Mínimo 10 caracteres").max(128),
});
```

Run: `npm test` → PASS nos dois arquivos.

- [ ] **Step 3: Queries**

```ts
// src/modules/tenancy/queries.ts
import { and, eq, gt, isNull, count, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, memberships, invitations, users } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
import { hashToken } from "./tokens";

export const listOrganizations = (_ctx: AdminContext) => db.select().from(organizations).orderBy(asc(organizations.name));
export const getOrganization = (_ctx: AdminContext, id: string) => db.query.organizations.findFirst({ where: eq(organizations.id, id) });
export const countOrganizations = async () => (await db.select({ n: count() }).from(organizations))[0].n;
export const listOrganizationMembers = (_ctx: AdminContext, orgId: string) =>
  db.select({ id: users.id, name: users.name, email: users.email, active: users.active })
    .from(memberships).innerJoin(users, eq(memberships.userId, users.id)).where(eq(memberships.organizationId, orgId)).orderBy(asc(users.name));
export const listPendingInvitations = (_ctx: AdminContext, orgId: string) =>
  db.select({ id: invitations.id, email: invitations.email, expiresAt: invitations.expiresAt, createdAt: invitations.createdAt })
    .from(invitations).where(and(eq(invitations.organizationId, orgId), isNull(invitations.acceptedAt))).orderBy(asc(invitations.createdAt));
export async function getInvitationByToken(raw: string) {
  const [row] = await db.select({ id: invitations.id, email: invitations.email, organizationId: invitations.organizationId, organizationName: organizations.name })
    .from(invitations).innerJoin(organizations, eq(invitations.organizationId, organizations.id))
    .where(and(eq(invitations.tokenHash, hashToken(raw)), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date()))).limit(1);
  return row ?? null;
}
```

- [ ] **Step 4: Actions**

```ts
// src/modules/tenancy/actions.ts
"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { organizations, memberships, invitations, users } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { audit } from "@/modules/audit/log";
import { auth } from "@/lib/auth";
import type { AdminContext } from "@/modules/auth/context";
import { sendInvitationEmail } from "@/modules/mail/send";
import { organizationSchema, inviteSchema, acceptInvitationSchema, type OrganizationInput } from "./validation";
import { slugify } from "./slug";
import { generateToken } from "./tokens";
import { getInvitationByToken } from "./queries";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createOrganization(ctx: AdminContext, input: OrganizationInput): Promise<ActionResult<{ id: string }>> {
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const slug = parsed.data.slug ?? slugify(parsed.data.name);
  const dup = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
  if (dup) return fail("Já existe uma organização com esse identificador.", { slug: ["Em uso"] });
  const [row] = await db.insert(organizations).values({ name: parsed.data.name, cnpj: parsed.data.cnpj, slug }).returning({ id: organizations.id });
  await audit({ actorId: ctx.user.id, action: "organization.created", entityType: "organization", entityId: row.id, organizationId: row.id, metadata: { name: parsed.data.name } });
  return ok({ id: row.id });
}

export async function updateOrganization(ctx: AdminContext, id: string, input: OrganizationInput): Promise<ActionResult<null>> {
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const slug = parsed.data.slug ?? slugify(parsed.data.name);
  const dup = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
  if (dup && dup.id !== id) return fail("Identificador em uso.", { slug: ["Em uso"] });
  await db.update(organizations).set({ name: parsed.data.name, cnpj: parsed.data.cnpj, slug }).where(eq(organizations.id, id));
  await audit({ actorId: ctx.user.id, action: "organization.updated", entityType: "organization", entityId: id, organizationId: id, metadata: parsed.data });
  return ok(null);
}

export async function setOrganizationStatus(ctx: AdminContext, id: string, status: "active" | "inactive"): Promise<ActionResult<null>> {
  await db.update(organizations).set({ status }).where(eq(organizations.id, id));
  await audit({ actorId: ctx.user.id, action: `organization.${status === "active" ? "activated" : "deactivated"}`, entityType: "organization", entityId: id, organizationId: id });
  return ok(null);
}

export async function inviteUser(ctx: AdminContext, input: { email: string; organizationId: string }): Promise<ActionResult<{ invitationId: string }>> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, parsed.data.organizationId) });
  if (!org) return fail("Organização não encontrada.");
  const existing = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (existing) {
    const member = await db.query.memberships.findFirst({ where: and(eq(memberships.userId, existing.id), eq(memberships.organizationId, org.id)) });
    if (member) return fail("Essa pessoa já é membro desta organização.", { email: ["Já é membro"] });
  }
  const { raw, hash } = generateToken();
  const [inv] = await db.insert(invitations).values({ email: parsed.data.email, organizationId: org.id, tokenHash: hash, expiresAt: new Date(Date.now() + INVITE_TTL_MS), invitedBy: ctx.user.id }).returning({ id: invitations.id });
  await sendInvitationEmail({ to: parsed.data.email, organizationName: org.name, acceptUrl: `${env.BETTER_AUTH_URL}/convite/${raw}` });
  await audit({ actorId: ctx.user.id, action: "invitation.sent", entityType: "invitation", entityId: inv.id, organizationId: org.id, metadata: { email: parsed.data.email } });
  return ok({ invitationId: inv.id });
}

export async function resendInvitation(ctx: AdminContext, invitationId: string): Promise<ActionResult<null>> {
  const inv = await db.query.invitations.findFirst({ where: eq(invitations.id, invitationId) });
  if (!inv || inv.acceptedAt) return fail("Convite não encontrado ou já aceito.");
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, inv.organizationId) });
  const { raw, hash } = generateToken();
  await db.update(invitations).set({ tokenHash: hash, expiresAt: new Date(Date.now() + INVITE_TTL_MS) }).where(eq(invitations.id, inv.id));
  await sendInvitationEmail({ to: inv.email, organizationName: org!.name, acceptUrl: `${env.BETTER_AUTH_URL}/convite/${raw}` });
  await audit({ actorId: ctx.user.id, action: "invitation.resent", entityType: "invitation", entityId: inv.id, organizationId: inv.organizationId });
  return ok(null);
}

export async function acceptInvitation(input: { token: string; name: string; password: string }, requestHeaders: Headers): Promise<ActionResult<{ organizationId: string }>> {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const inv = await getInvitationByToken(parsed.data.token);
  if (!inv) return fail("Convite inválido ou expirado. Peça um novo convite.");
  const existing = await db.query.users.findFirst({ where: eq(users.email, inv.email) });
  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    try {
      const res = await auth.api.signUpEmail({
        body: { name: parsed.data.name, email: inv.email, password: parsed.data.password, invitationToken: parsed.data.token } as never,
        headers: requestHeaders,
      });
      userId = res.user.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível criar a conta.";
      return fail(msg, { password: [msg] });
    }
  }
  await db.transaction(async (tx) => {
    await tx.insert(memberships).values({ userId, organizationId: inv.organizationId }).onConflictDoNothing();
    await tx.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, inv.id));
  });
  await audit({ actorId: userId, action: "invitation.accepted", entityType: "invitation", entityId: inv.id, organizationId: inv.organizationId });
  return ok({ organizationId: inv.organizationId });
}

export async function setUserActive(ctx: AdminContext, userId: string, active: boolean): Promise<ActionResult<null>> {
  if (userId === ctx.user.id) return fail("Você não pode desativar a própria conta.");
  await db.update(users).set({ active }).where(eq(users.id, userId));
  if (!active) await auth.api.revokeUserSessions({ body: { userId } as never, headers: new Headers() }).catch(() => undefined);
  await audit({ actorId: ctx.user.id, action: active ? "user.activated" : "user.deactivated", entityType: "user", entityId: userId });
  return ok(null);
}
```

Se `auth.api.revokeUserSessions` não existir sem o plugin admin, substituir por `db.delete(sessions).where(eq(sessions.userId, userId))`.

Nota sobre o aceite quando o usuário já existe: a página de convite (Task 13) não pede senha nesse caso e, após `acceptInvitation`, manda a pessoa para `/entrar`. Quando é usuário novo, `signUpEmail` com `nextCookies` já cria a sessão.

- [ ] **Step 5: Teste de integração (banco real do compose)**

`vitest.integration.config.ts` igual ao unitário com `include: ["tests/integration/**/*.test.ts"]` e `setupFiles: ["tests/integration/setup.ts"]` que carrega `dotenv/config` e trunca `organizations, invitations, memberships, leads, files, audit_log` e usuários com e-mail `%@test.local` antes de cada arquivo. Script: `"test:integration": "vitest run -c vitest.integration.config.ts"`.

```ts
// tests/integration/tenancy.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations } from "@/db/schema";
import { createOrganization, inviteUser, acceptInvitation } from "@/modules/tenancy/actions";
import { getInvitationByToken } from "@/modules/tenancy/queries";
import { hashToken } from "@/modules/tenancy/tokens";
import type { AdminContext } from "@/modules/auth/context";
import { ensureTestAdmin } from "./setup";

let ctx: AdminContext;
beforeAll(async () => { ctx = await ensureTestAdmin(); });

describe("tenancy", () => {
  it("cria organização, convida, aceita e bloqueia segundo aceite", async () => {
    const org = await createOrganization(ctx, { name: "Empresa Teste" });
    expect(org.ok).toBe(true);
    if (!org.ok) return;
    const inv = await inviteUser(ctx, { email: " Pessoa@Test.local ", organizationId: org.data.id });
    expect(inv.ok).toBe(true);
    if (!inv.ok) return;
    const row = await db.query.invitations.findFirst({ where: eq(invitations.id, inv.data.invitationId) });
    expect(row!.email).toBe("pessoa@test.local");
    // Recupera o token bruto pelo hash não é possível; para o teste, gera-se um convite direto com token conhecido:
    const raw = "token-de-teste-conhecido-com-mais-de-vinte-chars";
    await db.update(invitations).set({ tokenHash: hashToken(raw) }).where(eq(invitations.id, inv.data.invitationId));
    expect(await getInvitationByToken(raw)).not.toBeNull();
    const acc = await acceptInvitation({ token: raw, name: "Pessoa", password: "senha-forte-1234" }, new Headers());
    expect(acc.ok).toBe(true);
    const again = await acceptInvitation({ token: raw, name: "Pessoa", password: "senha-forte-1234" }, new Headers());
    expect(again.ok).toBe(false);
  });
  it("convite expirado não é encontrado", async () => {
    const org = await createOrganization(ctx, { name: "Outra" });
    if (!org.ok) throw new Error();
    const raw = "token-expirado-conhecido-com-mais-de-vinte-chars";
    await db.insert(invitations).values({ email: "x@test.local", organizationId: org.data.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() - 1000), invitedBy: ctx.user.id });
    expect(await getInvitationByToken(raw)).toBeNull();
  });
  it("slug duplicado é rejeitado", async () => {
    await createOrganization(ctx, { name: "Dup" });
    const r = await createOrganization(ctx, { name: "Dup" });
    expect(r.ok).toBe(false);
  });
});
```

`tests/integration/setup.ts` exporta `ensureTestAdmin()` que cria (ou reaproveita) um usuário `admin@test.local` com role admin via `auth.$context.internalAdapter` (mesmo código do seed) e devolve `{ kind: "admin", user }`.

Run: `npm run test:integration` → PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Adiciona módulo tenancy: organizações, convites e membros

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Módulo de leads (formulário de contato)

**Files:**
- Create: `src/modules/leads/validation.ts`, `src/modules/leads/queries.ts`, `src/modules/leads/actions.ts`, `tests/unit/lead-validation.test.ts`, `tests/integration/leads.test.ts`

**Interfaces:**
- Produces: `leadSchema`; `submitContact(prev: ContactState, formData: FormData): Promise<ContactState>` onde `type ContactState = ActionResult<null> | null` (assinatura para `useActionState`); `listLeads(ctx, { status? })`, `countNewLeads()`, `markLeadSeen(ctx, id)`.
- Honeypot: campo `website`; se preenchido, retorna `ok(null)` sem gravar.

- [ ] **Step 1: Teste unitário falhando**

```ts
// tests/unit/lead-validation.test.ts
import { it, expect } from "vitest";
import { leadSchema } from "@/modules/leads/validation";
const base = { name: "Ana", email: "ana@x.com", message: "Olá, quero um orçamento." };
it("aceita lead mínimo", () => expect(leadSchema.safeParse(base).success).toBe(true));
it("rejeita mensagem acima de 4000", () =>
  expect(leadSchema.safeParse({ ...base, message: "a".repeat(4001) }).success).toBe(false));
it("normaliza e-mail e trata empresa vazia como null", () => {
  const out = leadSchema.parse({ ...base, email: " ANA@X.com ", company: "" });
  expect(out.email).toBe("ana@x.com"); expect(out.company).toBeNull();
});
```

- [ ] **Step 2: Implementar**

```ts
// src/modules/leads/validation.ts
import { z } from "zod";
import { normalizeEmail } from "@/modules/auth/normalize-email";
const optional = z.string().trim().max(120).transform((v) => (v === "" ? null : v)).optional().default("");
export const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().transform(normalizeEmail).pipe(z.email("E-mail inválido")),
  company: optional,
  phone: optional,
  message: z.string().trim().min(10, "Conte um pouco mais").max(4000, "Máximo de 4000 caracteres"),
});
```

```ts
// src/modules/leads/queries.ts
import { desc, eq, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/db/schema";
import type { AdminContext } from "@/modules/auth/context";
export function listLeads(_ctx: AdminContext, opts: { status?: "new" | "seen" } = {}) {
  const q = db.select().from(leads).orderBy(desc(leads.createdAt)).limit(200);
  return opts.status ? q.where(eq(leads.status, opts.status)) : q;
}
export const countNewLeads = async () => (await db.select({ n: count() }).from(leads).where(eq(leads.status, "new")))[0].n;
```

```ts
// src/modules/leads/actions.ts
"use server";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/db/schema";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { createRateLimiter } from "@/lib/rate-limit";
import { audit } from "@/modules/audit/log";
import { sendLeadNotification } from "@/modules/mail/send";
import type { AdminContext } from "@/modules/auth/context";
import { leadSchema } from "./validation";

export type ContactState = ActionResult<null> | null;
const contactLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 3 });

async function clientIpHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  if (String(formData.get("website") ?? "") !== "") return ok(null); // honeypot
  const parsed = leadSchema.safeParse({
    name: formData.get("name"), email: formData.get("email"), company: formData.get("company") ?? "",
    phone: formData.get("phone") ?? "", message: formData.get("message"),
  });
  if (!parsed.success) return fromZod(parsed.error);
  const ipHash = await clientIpHash();
  if (!contactLimiter.hit(ipHash).allowed) return fail("Recebemos várias mensagens deste endereço. Tente novamente em uma hora.");
  const [row] = await db.insert(leads).values({ ...parsed.data, ipHash }).returning({ id: leads.id });
  await audit({ actorId: null, action: "lead.created", entityType: "lead", entityId: row.id, metadata: { email: parsed.data.email } });
  await sendLeadNotification({ name: parsed.data.name, email: parsed.data.email, company: parsed.data.company, message: parsed.data.message });
  return ok(null);
}

export async function markLeadSeen(ctx: AdminContext, id: string): Promise<ActionResult<null>> {
  await db.update(leads).set({ status: "seen" }).where(eq(leads.id, id));
  await audit({ actorId: ctx.user.id, action: "lead.seen", entityType: "lead", entityId: id });
  return ok(null);
}
```

- [ ] **Step 3: Teste de integração**

```ts
// tests/integration/leads.test.ts
import { it, expect, vi } from "vitest";
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
import { submitContact } from "@/modules/leads/actions";
import { db } from "@/lib/db";
import { leads } from "@/db/schema";
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const valid = { name: "Ana", email: "ana@test.local", message: "Quero um orçamento para automação." };

it("grava lead válido", async () => {
  const r = await submitContact(null, fd(valid));
  expect(r?.ok).toBe(true);
  expect((await db.select().from(leads)).some((l) => l.email === "ana@test.local")).toBe(true);
});
it("honeypot preenchido responde ok sem gravar", async () => {
  const before = (await db.select().from(leads)).length;
  const r = await submitContact(null, fd({ ...valid, email: "bot@test.local", website: "http://spam" }));
  expect(r?.ok).toBe(true);
  expect((await db.select().from(leads)).length).toBe(before);
});
it("mensagem longa devolve erro de campo", async () => {
  const r = await submitContact(null, fd({ ...valid, message: "a".repeat(4001) }));
  expect(r?.ok).toBe(false);
  if (r && !r.ok) expect(r.fieldErrors?.message).toBeTruthy();
});
it("quarto envio do mesmo IP na hora é bloqueado", async () => {
  await submitContact(null, fd(valid)); await submitContact(null, fd(valid));
  const r = await submitContact(null, fd(valid));
  expect(r?.ok).toBe(false);
});
```

Run: `npm test && npm run test:integration` → PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Adiciona módulo de leads com honeypot e rate limit

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Design system e mockups (GATE DE APROVAÇÃO DO USUÁRIO)

**Files:**
- Create: `docs/specs/design-system.md`, `docs/mockups/tokens.css`, `docs/mockups/site-inicio.html`, `docs/mockups/site-servicos.html`, `docs/mockups/site-produtos.html`, `docs/mockups/site-sobre.html`, `docs/mockups/site-contato.html`, `docs/mockups/auth-entrar.html`, `docs/mockups/auth-convite.html`, `docs/mockups/admin-shell.html`, `docs/mockups/portal-shell.html`

Nenhuma tela do app (Tasks 11 a 15) pode começar antes do usuário aprovar estes mockups. Isso é exigência do CLAUDE.md global.

- [ ] **Step 1: Ler o conteúdo atual como insumo**

Ler `legacy/assets/index.jsx`, `servicos.jsx`, `produtos.jsx`, `sobre.jsx`, `contato.jsx`, `shared.jsx`, `styles.css`, `pages.css`. Anotar em `docs/specs/conteudo-atual.md`: serviços listados, produtos, texto do sobre, tom de voz, paleta atual (Space Grotesk + JetBrains Mono, accent atual). O conteúdo continua; a apresentação muda.

- [ ] **Step 2: Definir o design system com as skills**

Invocar `ui-ux-pro-max:design-system` e depois `frontend-design:frontend-design` com o briefing: consultoria de engenharia de dados, sistemas e automação; público B2B técnico; um mesmo sistema visual para site (expressivo) e portais (denso); restrições da seção Global Constraints. Resultado em `docs/specs/design-system.md` contendo, sem exceção:

- Paleta: fundo, superfície, texto, texto secundário, borda, acento primário, acento secundário, sucesso, aviso, erro. Valores hex e nomes de variável CSS para tema público e tema portais.
- Tipografia: família display, família texto, família mono (todas fora da lista proibida), escala em rem (6 níveis), pesos, altura de linha.
- Espaçamento: escala de 4 px, largura de container, breakpoints.
- Componentes: botão (3 variantes, 3 tamanhos), input, select, textarea, card, tabela, badge de status, alerta, dialog, sidebar/topbar dos portais, navbar/footer do site.
- Regras de movimento: durações e curvas.
- Anti-padrões proibidos (copiar da Global Constraints).

`docs/mockups/tokens.css` materializa as variáveis para os mockups usarem.

- [ ] **Step 3: Escrever os textos e passar pelo stop-slop**

Redigir em `docs/specs/copy-site.md` todos os textos do site (hero, serviços, produtos, sobre, contato, rodapé, mensagens do formulário) e invocar a skill `stop-slop` sobre o arquivo. Aplicar as correções. Os mockups usam esses textos finais.

- [ ] **Step 4: Gerar os mockups HTML**

Cada mockup é um HTML autônomo que linka `tokens.css` e fontes do Google Fonts, com viewport responsivo. Conteúdo real (não lorem ipsum). Os shells de admin e portal mostram: sidebar/topbar, seletor de organização (portal), uma tabela (organizações ou leads), um formulário (convidar usuário), estados vazio e de erro.

- [ ] **Step 5: Validar visualmente**

Abrir cada mockup com o MCP `playwright` (`browser_navigate` em `file:///...`), capturar screenshot desktop (1440) e mobile (390) e revisar contra as restrições. Corrigir.

- [ ] **Step 6: Commit e PARAR para aprovação**

```bash
git add docs && git commit -m "Adiciona design system, copy e mockups da Fase 1 para aprovação

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Apresentar ao usuário a lista de arquivos e pedir aprovação explícita. Só continuar para a Task 11 após "aprovado". Se pedir mudanças, ajustar mockups e repetir Step 5 e 6.

---

### Task 11: shadcn/ui, tokens e temas

**Files:**
- Create: `components.json`, `src/components/ui/*` (button, input, label, textarea, select, card, table, badge, alert, dialog, dropdown-menu, sheet, separator, sonner), `src/app/globals.css`, `src/lib/utils.ts`, `src/app/fonts.ts`

**Interfaces:**
- Produces: classes `theme-site` e `theme-app` no `<body>` de cada grupo de rotas; variáveis CSS conforme `docs/specs/design-system.md`.

- [ ] **Step 1: Inicializar shadcn**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input label textarea select card table badge alert dialog dropdown-menu sheet separator sonner
```

Conferir que `components.json` aponta `tailwind.css` para `src/app/globals.css` e `aliases.components` para `@/components`.

- [ ] **Step 2: Fontes**

`src/app/fonts.ts` com `next/font/google` carregando as três famílias definidas no design system (display, texto, mono) com `variable: "--font-display"`, `--font-body`, `--font-mono`, `display: "swap"`, subsets `["latin", "latin-ext"]`.

- [ ] **Step 3: Tokens em `globals.css`**

Copiar os valores de `docs/mockups/tokens.css` para `:root` (tema público) e `.theme-app` (tema portais), mapeando para as variáveis que o shadcn espera (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, `--destructive`, `--radius`, etc.) via `@theme inline`. Registrar `--font-sans: var(--font-body)`, `--font-heading: var(--font-display)`.

- [ ] **Step 4: Verificar**

Criar página temporária `src/app/(site)/_kit/page.tsx` renderizando todos os componentes adicionados nos dois temas. `npm run dev`, screenshot com Playwright, comparar com `docs/mockups/tokens.css` e com os shells. Remover `_kit` antes do commit.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Configura shadcn/ui, fontes e tokens dos dois temas

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Site público

**Files:**
- Create: `src/content/site.ts`, `src/content/servicos.ts`, `src/content/produtos.ts`, `src/content/sobre.ts`, `src/components/site/navbar.tsx`, `src/components/site/footer.tsx`, `src/components/site/section.tsx`, `src/components/site/contact-form.tsx`, `src/app/(site)/layout.tsx`, `src/app/(site)/page.tsx`, `src/app/(site)/servicos/page.tsx`, `src/app/(site)/produtos/page.tsx`, `src/app/(site)/sobre/page.tsx`, `src/app/(site)/contato/page.tsx`, `src/app/(site)/cases/page.tsx`, `src/app/(site)/not-found.tsx`, `src/app/(site)/error.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `tests/e2e/site.spec.ts`, `playwright.config.ts`
- Delete: `src/app/page.tsx` (substituído pelo do grupo `(site)`)

**Interfaces:**
- Consumes: `submitContact` e `ContactState` (Task 9), componentes ui (Task 11).
- Produces: `NAV_LINKS: { href: string; label: string }[]` em `src/content/site.ts`; `Metadata` por página.

- [ ] **Step 1: Playwright config e teste de fumaça falhando**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run dev", url: "http://localhost:3000/api/health", reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
```

```ts
// tests/e2e/site.spec.ts
import { test, expect } from "@playwright/test";
for (const path of ["/", "/servicos", "/produtos", "/sobre", "/contato", "/cases"]) {
  test(`página ${path} responde e tem h1`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  });
}
test("formulário de contato valida e envia", async ({ page }) => {
  await page.goto("/contato");
  await page.getByRole("button", { name: /enviar/i }).click();
  await expect(page.getByText(/informe seu nome/i)).toBeVisible();
  await page.getByLabel(/nome/i).fill("Ana Teste");
  await page.getByLabel(/e-mail/i).fill("ana@test.local");
  await page.getByLabel(/mensagem/i).fill("Quero conversar sobre automação de relatórios.");
  await page.getByRole("button", { name: /enviar/i }).click();
  await expect(page.getByText(/recebemos sua mensagem/i)).toBeVisible();
});
```

Script: `"test:e2e": "playwright test"`. Run: `npx playwright install chromium && npm run test:e2e` → FAIL (páginas 404).

- [ ] **Step 2: Conteúdo em TypeScript**

Transcrever de `docs/specs/copy-site.md` (já revisado pelo stop-slop) para `src/content/*.ts` como objetos tipados, por exemplo:

```ts
// src/content/servicos.ts
export type Servico = { slug: string; titulo: string; resumo: string; entregas: string[] };
export const servicos: Servico[] = [ /* ... conteúdo aprovado ... */ ];
```

`src/content/site.ts`: `NAV_LINKS`, dados de contato, rodapé, metadados padrão (`title` template `%s · EGD`, description).

- [ ] **Step 3: Layout e chrome do site**

`src/app/(site)/layout.tsx`: aplica classes das fontes e `theme-site` no wrapper, renderiza `<Navbar />`, `{children}`, `<Footer />`. Navbar com links de `NAV_LINKS`, botão "Fale conosco" e link discreto "Entrar" para `/entrar`; menu mobile com `Sheet`. Footer com contato, links e CNPJ se houver.

- [ ] **Step 4: Páginas**

Implementar cada página seguindo o mockup aprovado correspondente, com `export const metadata`. `/cases` mostra a lista estática vinda de `src/content/cases.ts` (migrada de `legacy/assets/cases.jsx`) e um aviso de que novos cases serão publicados em breve. Todas são estáticas por padrão.

- [ ] **Step 5: Formulário de contato**

```tsx
// src/components/site/contact-form.tsx
"use client";
import { useActionState } from "react";
import { submitContact, type ContactState } from "@/modules/leads/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive" role="alert">{errors[0]}</p> : null;
}

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, null);
  if (state?.ok) return <div role="status" className="rounded-md border p-6"><p className="font-medium">Recebemos sua mensagem.</p><p>Respondemos em até um dia útil.</p></div>;
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div><Label htmlFor="name">Nome</Label><Input id="name" name="name" autoComplete="name" /><FieldError errors={fe?.name} /></div>
      <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" autoComplete="email" /><FieldError errors={fe?.email} /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><Label htmlFor="company">Empresa</Label><Input id="company" name="company" autoComplete="organization" /></div>
        <div><Label htmlFor="phone">Telefone</Label><Input id="phone" name="phone" type="tel" autoComplete="tel" /></div>
      </div>
      <div><Label htmlFor="message">Mensagem</Label><Textarea id="message" name="message" rows={6} /><FieldError errors={fe?.message} /></div>
      {state && !state.ok && !fe && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar mensagem"}</Button>
    </form>
  );
}
```

- [ ] **Step 6: sitemap, robots, erro e 404**

`src/app/sitemap.ts` lista as seis rotas públicas com `https://egdsystem.com.br`. `src/app/robots.ts`: allow `/`, disallow `/admin`, `/portal`, `/api`. `not-found.tsx` e `error.tsx` no grupo `(site)` com o chrome do site. `error.tsx` exibe `error.digest` como "código de referência" para o usuário informar no contato; o mesmo padrão vale para `(admin)` e `(portal)`.

- [ ] **Step 7: Validar visualmente e rodar e2e**

Com `npm run dev`, usar o MCP `playwright` para screenshot de cada página (1440 e 390) e comparar lado a lado com `docs/mockups/site-*.html`. Corrigir divergências de espaçamento, cor e tipografia até coincidir. Run: `npm run test:e2e -- site` → PASS. Verificar no Mailpit que o envio do teste gerou e-mail.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Implementa site público no Next.js com formulário gravando leads

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Páginas de autenticação

**Files:**
- Create: `src/app/(auth)/layout.tsx`, `src/app/(auth)/entrar/page.tsx`, `src/app/(auth)/convite/[token]/page.tsx`, `src/app/(auth)/recuperar-senha/page.tsx`, `src/app/(auth)/redefinir-senha/page.tsx`, `src/modules/auth/components/login-form.tsx`, `src/modules/auth/components/accept-invite-form.tsx`, `src/modules/auth/components/forgot-form.tsx`, `src/modules/auth/components/reset-form.tsx`, `src/modules/auth/actions.ts`, `tests/e2e/auth.spec.ts`, `tests/e2e/helpers.ts`

**Interfaces:**
- Consumes: `authClient`, `getInvitationByToken`, `acceptInvitation`.
- Produces: actions `acceptInviteAction(prev, formData)` e `signOutAction()`; helpers e2e `loginAs(page, email, password)`, `latestMailpitLink(pattern: RegExp): Promise<string>` (busca em `http://localhost:8025/api/v1/messages`), `seedOrgAndInvite()` (chama actions via `tsx` script ou endpoint de teste só em `NODE_ENV=test`).

- [ ] **Step 1: Teste e2e falhando**

```ts
// tests/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";
import { loginAs, latestMailpitLink, ADMIN } from "./helpers";

test("login inválido mostra erro e não redireciona", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel(/e-mail/i).fill(ADMIN.email);
  await page.getByLabel(/senha/i).fill("senha-errada-123");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page.getByRole("alert")).toContainText(/e-mail ou senha/i);
  expect(page.url()).toContain("/entrar");
});
test("admin entra e cai no /admin", async ({ page }) => {
  await loginAs(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/admin/);
});
test("recuperação de senha envia e-mail e redefine", async ({ page }) => {
  await page.goto("/recuperar-senha");
  await page.getByLabel(/e-mail/i).fill(ADMIN.email);
  await page.getByRole("button", { name: /enviar/i }).click();
  await expect(page.getByText(/se o e-mail existir/i)).toBeVisible();
  const link = await latestMailpitLink(/redefinir-senha\?token=/);
  await page.goto(link);
  await page.getByLabel(/nova senha/i).fill(ADMIN.password); // mantém a mesma para não quebrar outros testes
  await page.getByRole("button", { name: /salvar/i }).click();
  await expect(page).toHaveURL(/\/entrar/);
});
```

`tests/e2e/helpers.ts`:

```ts
import type { Page } from "@playwright/test";
export const ADMIN = { email: process.env.SEED_ADMIN_EMAIL ?? "admin@egdsystem.com.br", password: process.env.SEED_ADMIN_PASSWORD ?? "troque-esta-senha-local" };
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}
export async function latestMailpitLink(pattern: RegExp): Promise<string> {
  const base = process.env.MAILPIT_URL ?? "http://localhost:8025";
  for (let i = 0; i < 20; i++) {
    const list = await (await fetch(`${base}/api/v1/messages?limit=5`)).json();
    for (const m of list.messages ?? []) {
      const full = await (await fetch(`${base}/api/v1/message/${m.ID}`)).json();
      const match = String(full.Text).match(new RegExp(`https?://\\S*${pattern.source}\\S*`));
      if (match) return match[0];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("e-mail não chegou no Mailpit");
}
```

Run: `npm run test:e2e -- auth` → FAIL.

- [ ] **Step 2: Layout e formulário de login**

`(auth)/layout.tsx`: `theme-app`, card centralizado, logo, link para o site. `login-form.tsx` (client):

```tsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
// ... imports ui
export function LoginForm() {
  const router = useRouter(); const next = useSearchParams().get("next");
  const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setPending(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const { data, error } = await authClient.signIn.email({ email: String(fd.get("email")).trim().toLowerCase(), password: String(fd.get("password")) });
    setPending(false);
    if (error) { setError(error.status === 429 ? error.message ?? "Muitas tentativas." : "E-mail ou senha incorretos."); return; }
    const role = (data?.user as { role?: string })?.role;
    router.push(next && next.startsWith("/") ? next : role === "admin" ? "/admin" : "/portal");
  }
  return (<form onSubmit={onSubmit} className="grid gap-4">
    {/* Label+Input e-mail (id="email"), Label+Input senha (id="password" type="password") */}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {/* Button "Entrar" disabled={pending}; link "Esqueci minha senha" → /recuperar-senha */}
  </form>);
}
```

`/entrar/page.tsx` renderiza `<LoginForm />` dentro de `<Suspense>` (por causa de `useSearchParams`).

- [ ] **Step 3: Convite**

`convite/[token]/page.tsx` (server): `const { token } = await params; const inv = await getInvitationByToken(token);` Se nulo: mensagem "Convite inválido ou expirado" com link para contato. Se existe usuário com esse e-mail (`db.query.users.findFirst`): mostra "Você já tem conta" e botão que chama `acceptInviteAction` só com o token (sem senha) e redireciona para `/entrar`. Caso contrário renderiza `<AcceptInviteForm token email organizationName />`.

```ts
// src/modules/auth/actions.ts
"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { acceptInvitation } from "@/modules/tenancy/actions";
import type { ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";
export type AcceptState = ActionResult<null> | null;
export async function acceptInviteAction(_prev: AcceptState, fd: FormData): Promise<AcceptState> {
  const r = await acceptInvitation({ token: String(fd.get("token")), name: String(fd.get("name") ?? ""), password: String(fd.get("password") ?? "") }, await headers());
  if (!r.ok) return r;
  redirect(fd.get("existing") === "1" ? "/entrar?convite=aceito" : "/portal");
}
export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/entrar");
}
```

Para usuário existente, o form envia `existing=1`, `name="existente"` e `password` com 10 caracteres fixos (`"nao-usado-1"`) apenas para passar o schema; `acceptInvitation` ignora ambos quando o usuário já existe. Registrar isso em comentário no código.

`accept-invite-form.tsx`: `useActionState(acceptInviteAction, null)`, campos nome, senha (com dica "mínimo 10 caracteres, evite senhas comuns"), token oculto, erros por campo, botão "Criar minha conta".

- [ ] **Step 4: Recuperar e redefinir senha**

`forgot-form.tsx`: `authClient.requestPasswordReset({ email, redirectTo: "/redefinir-senha" })`; sempre mostra "Se o e-mail existir, enviamos um link válido por 1 hora.". `redefinir-senha/page.tsx` lê `?token=` (searchParams é Promise) e renderiza `reset-form.tsx` que chama `authClient.resetPassword({ newPassword, token })` e redireciona para `/entrar?senha=redefinida`. Se `?error=INVALID_TOKEN`, mostra "Link inválido ou expirado".

- [ ] **Step 5: Validar visual e e2e**

Screenshots comparados a `docs/mockups/auth-entrar.html` e `auth-convite.html`. Run: `npm run test:e2e -- auth` → PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Adiciona páginas de login, convite e recuperação de senha

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Portal administrativo

**Files:**
- Create: `src/components/shell/app-shell.tsx`, `src/components/shell/sidebar.tsx`, `src/components/shell/topbar.tsx`, `src/components/shell/user-menu.tsx`, `src/components/shell/empty-state.tsx`, `src/components/shell/page-header.tsx`, `src/app/(admin)/layout.tsx`, `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/organizacoes/page.tsx`, `src/app/(admin)/admin/organizacoes/nova/page.tsx`, `src/app/(admin)/admin/organizacoes/[id]/page.tsx`, `src/app/(admin)/admin/leads/page.tsx`, `src/app/(admin)/admin/arquivos/page.tsx`, `src/app/(admin)/admin/auditoria/page.tsx`, `src/app/(admin)/not-found.tsx`, `src/app/(admin)/error.tsx`, `src/modules/tenancy/components/organization-form.tsx`, `src/modules/tenancy/components/invite-form.tsx`, `src/modules/tenancy/components/members-table.tsx`, `src/modules/leads/components/leads-table.tsx`, `src/modules/files/components/upload-form.tsx`, `src/modules/files/components/files-table.tsx`, `src/modules/audit/components/audit-table.tsx`, `src/modules/tenancy/form-actions.ts`, `src/modules/leads/form-actions.ts`, `src/modules/files/form-actions.ts`, `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `requireAdmin`, queries e actions das Tasks 6 a 9.
- Produces: `AppShell({ nav, user, orgSwitcher?, children })`; `form-actions.ts` por módulo: wrappers `"use server"` com assinatura `(prev, formData)` que chamam `requireAdmin()` e a action de domínio, para uso com `useActionState`. Ex.: `createOrganizationForm`, `updateOrganizationForm`, `toggleOrganizationStatusForm`, `inviteUserForm`, `resendInvitationForm`, `setUserActiveForm`, `markLeadSeenForm`, `uploadFileForm`, `downloadFileForm`.

- [ ] **Step 1: Teste e2e falhando**

```ts
// tests/e2e/admin.spec.ts
import { test, expect } from "@playwright/test";
import { loginAs, latestMailpitLink, ADMIN } from "./helpers";

test.describe.serial("admin", () => {
  const orgName = `Org E2E ${Date.now()}`;
  const clientEmail = `cliente${Date.now()}@test.local`;

  test("cria organização e convida usuário", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/organizacoes/nova");
    await page.getByLabel(/nome/i).fill(orgName);
    await page.getByRole("button", { name: /salvar/i }).click();
    await expect(page.getByRole("heading", { name: orgName })).toBeVisible();
    await page.getByLabel(/e-mail/i).fill(clientEmail);
    await page.getByRole("button", { name: /convidar/i }).click();
    await expect(page.getByText(clientEmail)).toBeVisible();
  });

  test("convidado aceita e vê só a própria organização; /admin dá 404", async ({ page }) => {
    const link = await latestMailpitLink(/convite\//);
    await page.goto(link);
    await page.getByLabel(/nome/i).fill("Cliente E2E");
    await page.getByLabel(/senha/i).fill("senha-cliente-forte-1");
    await page.getByRole("button", { name: /criar minha conta/i }).click();
    await expect(page).toHaveURL(/\/portal/);
    await expect(page.getByText(orgName)).toBeVisible();
    const res = await page.goto("/admin");
    expect(res?.status()).toBe(404);
  });

  test("lead do site aparece e pode ser marcado como visto", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/leads");
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("upload de arquivo interno gera link de download", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/arquivos");
    await page.setInputFiles('input[type="file"]', { name: "teste.txt", mimeType: "text/plain", buffer: Buffer.from("ok") });
    await page.getByRole("button", { name: /enviar/i }).click();
    await expect(page.getByText("teste.txt")).toBeVisible();
    const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("link", { name: /baixar/i }).first().click()]);
    expect(popup.url()).toContain("X-Amz-Signature");
  });
});
```

Run: `npm run test:e2e -- admin` → FAIL.

- [ ] **Step 2: Shell**

`app-shell.tsx`: grid com sidebar fixa (desktop) / `Sheet` (mobile), topbar com título, `orgSwitcher` opcional e `UserMenu` (nome, e-mail, "Minha conta", "Sair" → `signOutAction`). `sidebar.tsx` recebe `nav: { href, label, icon }[]` e marca ativo com `usePathname`. `empty-state.tsx` e `page-header.tsx` conforme mockup `admin-shell.html`.

`(admin)/layout.tsx`:

```tsx
import { requireAdmin } from "@/modules/auth/context";
import { AppShell } from "@/components/shell/app-shell";
const NAV = [
  { href: "/admin", label: "Painel" }, { href: "/admin/organizacoes", label: "Organizações" },
  { href: "/admin/leads", label: "Leads" }, { href: "/admin/arquivos", label: "Arquivos" }, { href: "/admin/auditoria", label: "Auditoria" },
];
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  return <div className="theme-app"><AppShell nav={NAV} user={ctx.user}>{children}</AppShell></div>;
}
```

`(admin)/not-found.tsx` renderiza 404 simples sem o shell (é o que o `client` vê).

- [ ] **Step 3: Form actions (wrappers)**

```ts
// src/modules/tenancy/form-actions.ts
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/context";
import type { ActionResult } from "@/lib/action-result";
import { createOrganization, updateOrganization, setOrganizationStatus, inviteUser, resendInvitation, setUserActive } from "./actions";
type S<T = null> = ActionResult<T> | null;

export async function createOrganizationForm(_p: S<{ id: string }>, fd: FormData): Promise<S<{ id: string }>> {
  const ctx = await requireAdmin();
  const r = await createOrganization(ctx, { name: String(fd.get("name") ?? ""), cnpj: String(fd.get("cnpj") ?? ""), slug: fd.get("slug") ? String(fd.get("slug")) : undefined });
  if (r.ok) redirect(`/admin/organizacoes/${r.data.id}`);
  return r;
}
export async function updateOrganizationForm(_p: S, fd: FormData): Promise<S> {
  const ctx = await requireAdmin(); const id = String(fd.get("id"));
  const r = await updateOrganization(ctx, id, { name: String(fd.get("name") ?? ""), cnpj: String(fd.get("cnpj") ?? ""), slug: fd.get("slug") ? String(fd.get("slug")) : undefined });
  revalidatePath(`/admin/organizacoes/${id}`); return r;
}
export async function toggleOrganizationStatusForm(fd: FormData) {
  const ctx = await requireAdmin(); const id = String(fd.get("id"));
  await setOrganizationStatus(ctx, id, fd.get("status") === "active" ? "active" : "inactive");
  revalidatePath(`/admin/organizacoes/${id}`);
}
export async function inviteUserForm(_p: S<{ invitationId: string }>, fd: FormData): Promise<S<{ invitationId: string }>> {
  const ctx = await requireAdmin(); const organizationId = String(fd.get("organizationId"));
  const r = await inviteUser(ctx, { email: String(fd.get("email") ?? ""), organizationId });
  revalidatePath(`/admin/organizacoes/${organizationId}`); return r;
}
export async function resendInvitationForm(fd: FormData) {
  const ctx = await requireAdmin(); await resendInvitation(ctx, String(fd.get("invitationId"))); revalidatePath(`/admin/organizacoes/${String(fd.get("organizationId"))}`);
}
export async function setUserActiveForm(fd: FormData) {
  const ctx = await requireAdmin(); await setUserActive(ctx, String(fd.get("userId")), fd.get("active") === "1"); revalidatePath(`/admin/organizacoes/${String(fd.get("organizationId"))}`);
}
```

Mesmo padrão em `leads/form-actions.ts` (`markLeadSeenForm(fd)` + `revalidatePath("/admin/leads")`) e `files/form-actions.ts` (`uploadFileForm(prev, fd)` chamando `uploadFile(await requireAdmin(), fd)` + revalidate; `downloadFileForm(fd)` chamando `getDownloadUrl` e `redirect(url)`).

- [ ] **Step 4: Páginas**

- `/admin` (painel): dois números grandes (`countNewLeads()`, `countOrganizations()`) e lista dos 5 últimos leads. Sem gráficos na Fase 1.
- `/admin/organizacoes`: tabela (nome, slug, status badge, criada em) com link para detalhe; botão "Nova organização"; `EmptyState` quando vazio.
- `/admin/organizacoes/nova`: `<OrganizationForm action={createOrganizationForm} />`.
- `/admin/organizacoes/[id]`: `PageHeader` com nome e badge; `OrganizationForm` em modo edição; botão ativar/inativar (form com `toggleOrganizationStatusForm` e confirmação via `Dialog`); seção "Usuários" com `MembersTable` (nome, e-mail, ativo, botão ativar/desativar) e "Convites pendentes" (e-mail, expira em, botão reenviar); `InviteForm` (e-mail + botão "Convidar"). Se `getOrganization` retorna nulo → `notFound()`.
- `/admin/leads`: `LeadsTable` com filtro `?status=new|seen`, colunas nome, e-mail, empresa, mensagem truncada (expande em `Dialog`), recebido em, botão "Marcar como visto".
- `/admin/arquivos`: `UploadForm` (input file, select de organização opcional, botão "Enviar") + `FilesTable` (nome, tamanho formatado, organização ou "Interno", enviado em, link "Baixar" que faz `POST` para `downloadFileForm` com `formTarget="_blank"`).
- `/admin/auditoria`: `AuditTable` (quando, ação, entidade, ator, organização, metadata em `<code>` truncado).

Componentes de formulário usam `useActionState` e o mesmo `FieldError` da Task 12 (mover para `src/components/shell/field-error.tsx` e reutilizar no site).

- [ ] **Step 5: Validar visual e e2e**

Screenshots de `/admin`, `/admin/organizacoes/[id]`, `/admin/leads` comparados a `docs/mockups/admin-shell.html`. Run: `npm run test:e2e -- admin` → PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Implementa portal administrativo: organizações, convites, leads, arquivos, auditoria

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: Portal do cliente

**Files:**
- Create: `src/app/(portal)/layout.tsx`, `src/app/(portal)/portal/page.tsx`, `src/app/(portal)/portal/conta/page.tsx`, `src/app/(auth)/portal/sem-acesso/page.tsx`, `src/app/(portal)/not-found.tsx`, `src/app/(portal)/error.tsx`, `src/components/shell/org-switcher.tsx`, `src/modules/auth/components/account-form.tsx`, `src/modules/tenancy/org-cookie-action.ts`, `tests/e2e/portal.spec.ts`

**Interfaces:**
- Consumes: `requirePortal`, `ORG_COOKIE`, `authClient.changePassword`, `authClient.updateUser`.
- Produces: `setActiveOrganization(organizationId: string)` (server action: valida membership e grava cookie `egd_org`, httpOnly, 1 ano).

- [ ] **Step 1: Teste e2e falhando (isolamento entre organizações)**

```ts
// tests/e2e/portal.spec.ts
import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";
import { createTwoOrgsWithClientsAndFiles } from "./fixtures";

test("cliente A não baixa arquivo da organização B", async ({ page, request }) => {
  const fx = await createTwoOrgsWithClientsAndFiles();
  await loginAs(page, fx.clientA.email, fx.clientA.password);
  await page.goto("/portal");
  await expect(page.getByText(fx.orgA.name)).toBeVisible();
  const res = await page.request.post("/portal/arquivos/baixar", { form: { fileId: fx.fileB.id } });
  expect([403, 404]).toContain(res.status());
});
test("cliente com duas organizações troca a ativa", async ({ page }) => {
  const fx = await createTwoOrgsWithClientsAndFiles({ sharedClient: true });
  await loginAs(page, fx.clientA.email, fx.clientA.password);
  await page.goto("/portal");
  await page.getByRole("combobox", { name: /organização/i }).click();
  await page.getByRole("option", { name: fx.orgB.name }).click();
  await expect(page.getByRole("heading", { name: new RegExp(fx.orgB.name) })).toBeVisible();
});
```

`tests/e2e/fixtures.ts` cria os dados chamando um script `tsx tests/e2e/seed-fixtures.ts` (via `child_process.execSync`) que usa as actions de domínio com um `AdminContext` do admin de teste, cria usuários via `auth.$context.internalAdapter` (como o seed) e imprime JSON com ids, e-mails e senhas. Rota `/portal/arquivos/baixar` é a route handler abaixo.

Run: `npm run test:e2e -- portal` → FAIL.

- [ ] **Step 2: Layout e troca de organização**

```tsx
// src/app/(portal)/layout.tsx
import { requirePortal } from "@/modules/auth/context";
import { AppShell } from "@/components/shell/app-shell";
import { OrgSwitcher } from "@/components/shell/org-switcher";
const NAV = [{ href: "/portal", label: "Início" }, { href: "/portal/conta", label: "Minha conta" }];
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal();
  return <div className="theme-app"><AppShell nav={NAV} user={ctx.user} orgSwitcher={ctx.organizations.length > 1 ? <OrgSwitcher current={ctx.organization} options={ctx.organizations} /> : <span className="font-medium">{ctx.organization.name}</span>}>{children}</AppShell></div>;
}
```

```ts
// src/modules/tenancy/org-cookie-action.ts
"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, listUserOrganizations, ORG_COOKIE } from "@/modules/auth/context";
export async function setActiveOrganization(organizationId: string) {
  const user = await getSessionUser(); if (!user) redirect("/entrar");
  const orgs = await listUserOrganizations(user.id);
  if (!orgs.some((o) => o.id === organizationId && o.status === "active")) return;
  (await cookies()).set(ORG_COOKIE, organizationId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/portal");
}
```

`org-switcher.tsx` (client): `Select` do shadcn com `aria-label="Organização"`; `onValueChange` chama `setActiveOrganization`.

- [ ] **Step 3: Páginas**

- `/portal`: `PageHeader` com "Olá, {nome}" e nome da organização; card "Em breve: acompanhamento de projetos, solicitações e documentos" com o texto aprovado no copy; card de contato da EGD.
- `/portal/conta`: `AccountForm` (client) com dois blocos: nome (`authClient.updateUser({ name })`) e senha (`authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`), mensagens de sucesso/erro com `role="status"`/`role="alert"`.
- `/portal/sem-acesso`: fora do layout protegido (colocar em `src/app/(auth)/portal/sem-acesso/page.tsx` para não cair no `requirePortal`); texto "Sua conta não está vinculada a nenhuma organização ativa. Fale com a EGD." e botão sair.
- Route handler `src/app/(portal)/portal/arquivos/baixar/route.ts`: `POST` com `fileId` no form; `const ctx = await requirePortal(); const r = await getDownloadUrl(ctx, fileId); return r.ok ? NextResponse.redirect(r.data.url, 303) : new NextResponse("Não encontrado", { status: 404 })`. Ainda não há listagem de arquivos no portal (Fase 4), mas o endpoint fica pronto e testado para o isolamento.

- [ ] **Step 4: Validar visual e e2e**

Screenshot de `/portal` comparado a `docs/mockups/portal-shell.html`. Run: `npm run test:e2e` → todos PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Implementa esqueleto do portal do cliente com troca de organização

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 16: Dockerfile, entrypoint e CI

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`, `.github/workflows/ci.yml`
- Modify: `package.json` (script `start`), `next.config.ts` (já tem `standalone`)

**Interfaces:**
- Produces: imagem que roda `node scripts/migrate.mjs && node server.js` na porta 3000; healthcheck `/api/health`.

- [ ] **Step 1: Dockerfile multi-stage**

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV SKIP_ENV_VALIDATION=1 NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/scripts ./scripts
COPY --from=builder --chown=app:app /app/src/db/migrations ./src/db/migrations
COPY --chown=app:app docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
```

```sh
#!/bin/sh
set -e
echo "aplicando migrations..."
node scripts/migrate.mjs
echo "iniciando servidor"
exec node server.js
```

`.dockerignore`: `node_modules`, `.next`, `.git`, `legacy`, `docs`, `tests`, `.env*`, `test-results`, `playwright-report`.

Se `drizzle-orm` ou `postgres` não estiverem em `.next/standalone/node_modules` (o tracing só inclui o que o app importa; ambos são importados por `src/lib/db.ts`, então devem estar), acrescentar em `next.config.ts`: `outputFileTracingIncludes: { "/api/health": ["./node_modules/drizzle-orm/**", "./node_modules/postgres/**"] }`.

- [ ] **Step 2: Build e execução local da imagem**

```bash
docker build -t egd-app .
docker run --rm -p 3001:3000 --env-file .env -e DATABASE_URL=postgres://egd:egd@host.docker.internal:5432/egd -e S3_ENDPOINT=http://host.docker.internal:9000 -e SMTP_HOST=host.docker.internal -e BETTER_AUTH_URL=http://localhost:3001 egd-app
```

Esperado: log "migrations aplicadas", "iniciando servidor", `curl localhost:3001/api/health` → `{"ok":true}`, `curl -I localhost:3001/` → 200 com `Content-Security-Policy`.

- [ ] **Step 3: CI**

```yaml
# .github/workflows/ci.yml
name: CI
on: { push: { branches: [main] }, pull_request: {} }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run lint && npm run typecheck && npm test
      - run: docker compose -f docker-compose.dev.yml up -d --wait
      - run: cp .env.example .env
      - run: npm run db:migrate && npm run db:seed
      - run: npm run test:integration
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run start & npx wait-on http://localhost:3000/api/health
      - run: npm run test:e2e
        env: { E2E_BASE_URL: "http://localhost:3000" }
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report }
  image:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t egd-app:ci .
```

Adicionar `wait-on` em devDependencies. `npm run start` deve ser `next start` (o padrão). O `.env.example` precisa ter valores que funcionem com o compose (é o que a Task 1 definiu).

- [ ] **Step 4: Commit e verificar CI verde**

```bash
git add -A && git commit -m "Adiciona Dockerfile com migrations no boot e workflow de CI

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

Acompanhar `gh run watch` até verde. Corrigir antes de seguir.

---

### Task 17: Runbook do Coolify e primeiro deploy

**Files:**
- Create: `docs/runbooks/coolify.md`

Esta task é executada em conjunto com o usuário: os passos no painel do Coolify e no DNS são dele. O runbook precisa ser suficiente para ele executar sem consultar o chat.

- [ ] **Step 1: Escrever `docs/runbooks/coolify.md`** com as seções abaixo, cada uma com comandos ou cliques exatos:

1. **VPS**: Ubuntu 24.04 na Hostinger, mínimo 2 vCPU / 4 GB. Acesso SSH por chave. `apt update && apt upgrade -y`. Firewall `ufw allow 22,80,443/tcp && ufw enable`.
2. **Instalar Coolify**: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`. Acessar `http://IP:8000`, criar conta admin, configurar domínio do painel (`coolify.egdsystem.com.br`) e ativar 2FA.
3. **DNS** (painel do domínio): registros A para `egdsystem.com.br`, `www`, `minio`, `coolify` apontando para o IP do VPS. TTL 300 durante a migração.
4. **Projeto e recursos**: criar projeto "EGD". Adicionar:
   - PostgreSQL 16 (nome `egd-db`, banco `egd`). Copiar a URL interna.
   - MinIO (template do Coolify). Definir usuário/senha fortes. Domínio do console `minio.egdsystem.com.br`. Após subir, criar bucket `egd` pelo console.
   - Application a partir do GitHub (instalar o GitHub App do Coolify no repositório), branch `main`, build pack **Dockerfile**, porta 3000, domínio `https://egdsystem.com.br`, redirect `www` → apex. Healthcheck path `/api/health`.
5. **Variáveis de ambiente** da aplicação: lista completa de `.env.example` com orientação por chave. `BETTER_AUTH_SECRET`: `openssl rand -base64 48`. `DATABASE_URL`: URL interna do Postgres. `S3_ENDPOINT`: URL interna do MinIO (`http://<nome-do-serviço>:9000`). `SMTP_*`: dados do e-mail da Hostinger (host `smtp.hostinger.com`, porta 465, usuário e senha da caixa `no-reply@egdsystem.com.br`, criar a caixa antes). `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`: definidos para o primeiro deploy e removidos depois.
6. **Primeiro deploy**: clicar Deploy; acompanhar logs até "iniciando servidor". Abrir `https://egdsystem.com.br/api/health`.
7. **Seed do admin**: no terminal do container (Coolify → Application → Terminal): `node -e "..."` não serve porque o seed é TS; alternativa: rodar `npm run db:seed` **localmente** apontando `DATABASE_URL` para o Postgres de produção via túnel SSH (`ssh -L 5433:<ip-interno-db>:5432 root@VPS`). Documentar os dois comandos. Depois remover `SEED_ADMIN_*` das variáveis e redeployar.
8. **Backup**: Coolify → Postgres → Backups → diário 03:00, retenção 14 dias; destino S3: configurar com o próprio MinIO (bucket `backups`) ou storage externo escolhido pelo usuário. Testar "Backup now" e conferir que o arquivo aparece.
9. **Verificação de pronto** (critérios da spec): login em `/admin`, criar organização, convidar e-mail real, aceitar, entrar no portal, formulário de contato em produção gera lead e e-mail, upload/download no admin.
10. **Desligar GitHub Pages**: Settings → Pages → Source: None. Remover `.github/workflows/pages.yml` e a pasta `legacy/` (Task 18).
11. **Rollback**: Coolify → Deployments → escolher deploy anterior → Redeploy.

- [ ] **Step 2: Executar com o usuário**

Acompanhar cada seção. Registrar no runbook qualquer desvio encontrado (nomes internos de serviço, portas). Não avançar para a Task 18 até a seção 9 estar 100% verificada em produção.

- [ ] **Step 3: Commit**

```bash
git add docs/runbooks && git commit -m "Adiciona runbook de provisionamento e deploy no Coolify

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 18: Limpeza final

**Files:**
- Delete: `legacy/`, `.github/workflows/pages.yml`
- Modify: `README.md`, `docs/superpowers/specs/2026-09-27-fase-1-fundacao-design.md` (status → "implementado em <data>")

- [ ] **Step 1: Confirmar pré-condições**

Site novo respondendo em `https://egdsystem.com.br` há pelo menos 24 h sem erro no log do Coolify; GitHub Pages desligado no repositório.

- [ ] **Step 2: Remover o site antigo**

```bash
git rm -r legacy .github/workflows/pages.yml
```

Atualizar `README.md` (remover menções ao Pages; descrever arquitetura em 5 linhas e apontar para spec, plano e runbook). Atualizar status da spec.

- [ ] **Step 3: Verificação completa e commit**

Run: `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run test:e2e` → tudo PASS.

```bash
git add -A && git commit -m "Remove site estático antigo e conclui Fase 1

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

Confirmar CI verde e deploy automático concluído no Coolify.

---

## Ordem e dependências

```
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 (GATE) → 11 → 12 → 13 → 14 → 15 → 16 → 17 (com usuário) → 18
```

Tasks 5, 6 e 7 podem ser feitas em qualquer ordem entre si após a 4 (usar stubs temporários de `audit` e `send` quando necessário, substituídos na task correspondente). A Task 10 pode começar em paralelo a partir da Task 3, já que não depende de código.

## Fora do escopo deste plano (fases seguintes)

CRM, projetos, conteúdo do portal do cliente, cases editáveis, APIs e webhooks, MFA, edição de conteúdo do site pelo admin, múltiplos admins.
