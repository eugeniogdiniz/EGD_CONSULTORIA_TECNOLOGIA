# EGD Consultoria & Tecnologia

Site público e sistema (portal do cliente e portal administrativo) da EGD, em Next.js 16 com Postgres. Domínio: egdsystem.com.br.

## Arquitetura em cinco linhas

- Um único app Next.js (App Router) com quatro grupos de rotas: site público, autenticação, portal do cliente e admin.
- Módulos por domínio em `src/modules/*` (auth, tenancy, leads, files, audit, mail), cada um com `schema.ts` (Drizzle), `queries.ts` e `actions.ts`. Páginas nunca acessam o banco direto.
- Better Auth para login por e-mail e senha; cadastro só por convite; três papéis (`admin` dono, `collaborator` equipe, `client` portal) e autorização por `requireAdmin()` (equipe), `requireOwner()` (dono) e `requirePortal()`; 2FA opcional ou obrigatório por papel em Configurações (ver `docs/runbooks/coolify.md` §19).
- Postgres 16 (Drizzle ORM), armazenamento S3-compatível (RustFS), SMTP para e-mail transacional.
- Aceites no portal: propostas visíveis ao cliente com aceite ou recusa registrados como evidência, e aprovação ou pedido de ajustes em entregas concluídas (ver `docs/runbooks/coolify.md` §24).
- Funil puxado pela proposta: enviar a proposta leva a oportunidade para "Proposta", aceite (admin ou portal) para "Ganho" e recusa para "Perdido" (`src/modules/crm/stage-rules.ts`); o card do funil mostra a proposta mais recente.
- Financeiro consolidado: contas a receber (parcelas de todos os projetos) e contas a pagar (despesas de projeto e custos gerais da EGD, com fornecedor, vencimento e situação) em `/admin/financeiro`; o menu lateral é organizado por área (Comercial, Operação, Financeiro, Clientes, Relatórios, Site, Sistema).
- Contratos e termo de aceite: contrato de prestação de serviços gerado da proposta aceita (numerado, versionado, emitido para o cliente baixar no portal, assinatura registrada) e termo de aceite em PDF da entrega aprovada, com os dados jurídicos da EGD em Configurações e os do cliente na empresa (ver `docs/runbooks/coolify.md` §25).
- Automações com horário ajustável e retentativa com espera, webhooks de saída assinados, chaves de API com validade e rotação, e comparação entre períodos nos relatórios (ver `docs/runbooks/coolify.md` §23).
- Operação: erros de servidor agrupados em `/admin/erros`, backup lógico diário no storage com script de restauração, limite de taxa no banco e busca global (ver `docs/runbooks/coolify.md` §22).
- CRM com catálogo de serviços ligado ao investimento da proposta e tela de previsão de receita e conversão (ver `docs/runbooks/coolify.md` §21).
- Financeiro do projeto com parcelas (a receber, vencidas, pagas), rate por projeto congelado em cada entrada de tempo, relatório de horas por pessoa com CSV, estimativas e burndown (ver `docs/runbooks/coolify.md` §20).
- Documento da proposta comercial escrito no CRM, PDF gerado no servidor (`pdfkit`, sem navegador) e envio por e-mail ao contato com interação registrada (`src/modules/crm/document.ts`, `proposal-pdf.ts`; ver `docs/runbooks/coolify.md` §18).
- Solicitações do portal com anexos, notas internas da equipe, SLA de primeira resposta em horas úteis, responsável e lembrete automático ao cliente (`src/modules/requests`; ver `docs/runbooks/coolify.md` §17).
- Notificações no sistema (sino e página) para admin e cliente, com e-mail por pessoa conforme a preferência em Minha conta (`src/modules/notifications`; ver `docs/runbooks/coolify.md` §16).
- Um container Docker que aplica migrations e sobe o servidor; deploy pelo Coolify a cada push na `main`. O agendador das automações (resumos por e-mail, propostas vencidas) roda dentro desse mesmo processo (`JOBS_ENABLED`; ver `docs/runbooks/coolify.md` §15).

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
npm run test:integration # contra o banco separado <nome>_test (criado e migrado sozinho; nunca toca o de dev)
npm run test:e2e         # Playwright: sobe o PRÓPRIO servidor (porta 3100) com o banco <nome>_test; o de dev não é tocado
                         # (com E2E_BASE_URL usa o servidor já em pé, como no CI)
```

## Deploy

Ver `docs/runbooks/coolify.md`. A imagem é construída pelo `Dockerfile`; o `docker-entrypoint.sh` aplica as migrations antes de iniciar o servidor.

## Site antigo

O site estático anterior (HTML + React via CDN, publicado no GitHub Pages) foi removido do repositório ao fim da Fase 1; ele continua no histórico do git até o commit `90cfda2`. Desative o GitHub Pages em Settings → Pages quando o domínio apontar para o VPS.

## Buscadores e assistentes de IA (SEO, GEO, AEO)

Tudo nasce do mesmo conteúdo das páginas, então não desatualiza sozinho:

- `src/content/seo.ts`: metadados por página e dados estruturados schema.org (Organization com fundador e catálogo, WebSite, WebPage, BreadcrumbList, Service, SoftwareApplication, FAQPage). Injetados pelas páginas com `<JsonLd>`.
- `src/content/faq.ts`: perguntas frequentes de cada página, visíveis na tela (`<Faq>`) e no JSON-LD com o mesmo texto. Resposta primeiro, uma ou duas frases: é o trecho que o Google e as IAs citam.
- `/llms.txt` e `/llms-full.txt` (`src/content/llms.ts`): resumo em Markdown para assistentes de IA, no formato llmstxt.org.
- `src/app/robots.ts`: robôs de IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended etc.) liberados de forma explícita; áreas privadas fechadas para todos.
- Testes: `tests/unit/seo.test.ts` e `tests/e2e/seo.spec.ts`.

Fora do código, quem administra o domínio precisa cadastrar o site no Google Search Console e no Bing Webmaster Tools (enviando o sitemap) e criar o Perfil da Empresa no Google (Google Business Profile) com o mesmo nome, e-mail e cidade do site.

## Identidade visual e materiais da marca

Rebranding: [manual da marca](docs/brand/manual-da-marca.md), [análise e entrega](docs/brand/analise-e-entrega.md) e [prompts das imagens](docs/brand/prompts-imagens.md). Kit em `public/brand/`; manual visual disponível em `/brand/manual-da-marca.html` e `/brand/manual-da-marca.pdf`.

- Gerar formatos web e filmes: `node scripts/build-brand-media.mjs`.
- Validar layout, navegação, movimento, vídeo e exportar PDF: `node scripts/check-brand.mjs` (servidor local ativo).
- Exportar somente o manual e a prancha, sem servidor: `node scripts/check-brand.mjs --manual-only`.
- Os scripts de mídia e validação usam Chrome local; configure `CHROME_PATH` se necessário.
- Animação interativa na página inicial; filme de apresentação de 15 s na página inicial e assinatura de 8 s na página Sobre. Ambos com controles, legendas, poster e transcrição.

## Documentos comerciais e papelaria

Kit local em [docs/brand/kit-comercial/index.html](docs/brand/kit-comercial/index.html), com [pacote ZIP](docs/brand/kit-comercial-egd.zip) e [instruções de uso](docs/brand/kit-comercial/LEIA-ME.md). Inclui contrato, proposta, acordo de confidencialidade, aditivo, aceite e papel timbrado em Word/PDF; logos; cartão frente/verso com sangria; assinatura de e-mail e vCard.

Dados em `docs/brand/templates/dados-comerciais.json`; textos em `docs/brand/templates/documentos.py`. Regenerar com `node scripts/build-brand-kit.mjs` (Python 3 com `qrcode`, Playwright e Chrome local). Os campos legais/comerciais ainda não informados permanecem identificados nos modelos. Minutas sujeitas a preenchimento e revisão jurídica.

## Recuperação de acesso (2FA)

Se alguém perder o aparelho e os códigos de recuperação, quem administra o servidor remove o 2FA da conta
(exige acesso ao banco; encerra as sessões e registra na auditoria):

```bash
npm run auth:reset-2fa -- pessoa@empresa.com
```

Em produção, dentro do container do app (a imagem inclui `scripts/` e o `postgres`):

```bash
node scripts/reset-2fa.mjs pessoa@empresa.com
```

A pessoa entra só com a senha e reativa em **Minha conta**.
