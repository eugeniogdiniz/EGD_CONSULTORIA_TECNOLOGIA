# EGD Consultoria & Tecnologia

Site público e sistema (portal do cliente e portal administrativo) da EGD, em Next.js 16 com Postgres. Domínio: egdsystem.com.br.

## Arquitetura em cinco linhas

- Um único app Next.js (App Router) com quatro grupos de rotas: site público, autenticação, portal do cliente e admin.
- Módulos por domínio em `src/modules/*` (auth, tenancy, leads, files, audit, mail), cada um com `schema.ts` (Drizzle), `queries.ts` e `actions.ts`. Páginas nunca acessam o banco direto.
- Better Auth para login por e-mail e senha; cadastro só por convite; autorização por `requireAdmin()` / `requirePortal()`.
- Postgres 16 (Drizzle ORM), armazenamento S3-compatível (RustFS), SMTP para e-mail transacional.
- Um container Docker que aplica migrations e sobe o servidor; deploy pelo Coolify a cada push na `main`.

Documentos: spec em `docs/superpowers/specs/2026-09-27-fase-1-fundacao-design.md`, plano em `docs/superpowers/plans/2026-09-27-fase-1-fundacao.md`, design system em `docs/specs/design-system.md`, deploy em `docs/runbooks/coolify.md`.

## Requisitos

- Node 24 e npm 11
- Docker (Postgres, RustFS e Mailpit locais)

## Rodar local

```bash
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed        # cria o admin de SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD do .env
npm run dev
```

- App: http://localhost:3000 (admin em `/admin`, portal em `/portal`)
- E-mails capturados: http://localhost:8025 (Mailpit)
- Console do storage: http://localhost:9001

## Testes

```bash
npm run lint && npm run typecheck
npm test                 # unitários (Vitest)
npm run test:integration # contra o Postgres do compose
npm run test:e2e         # Playwright (sobe o dev server se preciso)
```

## Deploy

Ver `docs/runbooks/coolify.md`. A imagem é construída pelo `Dockerfile`; o `docker-entrypoint.sh` aplica as migrations antes de iniciar o servidor.

## Site antigo

A pasta `legacy/` guarda o site estático anterior, ainda publicado pelo GitHub Pages até o novo responder no domínio. Será removida na Task 18 do plano.
