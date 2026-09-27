# EGD Consultoria & Tecnologia

Sistema full-stack (portal cliente + portal admin) construído em Next.js. O site
institucional antigo (estático) foi preservado em `legacy/` e continua publicado
no GitHub Pages até o novo site entrar no ar.

## Requisitos

- Node 24
- Docker (para Postgres, MinIO e MailHog locais)

## Rodar local

```bash
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

A aplicação sobe em `http://localhost:3000`. A rota `GET /api/health` retorna
`{ "ok": true, "ts": "..." }` para checagens de disponibilidade.

## Testes

```bash
npm test          # testes unitários (Vitest)
npm run test:watch
npm run typecheck
npm run lint
```

## Deploy

Ver `docs/runbooks/coolify.md`.
