# EGD Consultoria & Tecnologia — Fase 1: Fundação

**Data:** 2026-09-27
**Status:** aprovado em conversa, aguardando revisão do documento
**Escopo:** primeira de seis fases do sistema EGD (site + portal do cliente + portal administrativo)

---

## 1. Contexto e objetivo

O repositório hoje é um site institucional estático (HTML + React via CDN e Babel no navegador), publicado no GitHub Pages, sem backend nem banco de dados.

O produto passa a ser um **sistema**: o site público continua como porta de entrada, e junto dele nascem um portal do cliente e um portal administrativo com CRM, controle de projetos, cases e APIs.

A Fase 1 entrega a **fundação** sobre a qual todas as outras fases são construídas:

- projeto Next.js full-stack em container único;
- design system novo, compartilhado por site, portal e admin;
- site público migrado com o redesign visual;
- Postgres, autenticação por e-mail e senha, modelo de organização/usuário/papel;
- esqueleto dos dois portais (vazios, mas protegidos e funcionais);
- formulário de contato gravando lead;
- e-mail transacional, upload de arquivos, auditoria;
- deploy automático no Coolify (VPS Hostinger).

### 1.1 O que a Fase 1 NÃO inclui

CRM (Fase 2), projetos (Fase 3), portal do cliente com conteúdo (Fase 4), cases e conteúdo editável (Fase 5), APIs públicas e webhooks (Fase 6), MFA, cadastro aberto de usuários, edição de conteúdo do site pelo admin.

### 1.2 Roadmap completo (para referência)

| Fase | Entrega | Depende de |
|------|---------|------------|
| 1 | Fundação (este documento) | — |
| 2 | CRM: empresas, contatos, interações, funil, propostas | 1 |
| 3 | Projetos no admin: fases, marcos, entregas, kanban, calendário por cliente, Gantt, horas, financeiro | 2 |
| 4 | Portal do cliente: projetos, marcos, solicitações, kanban de atendimento, documentos | 3 |
| 5 | Cases e conteúdo do site editáveis no admin | 1 |
| 6 | APIs: chaves de API, webhooks de entrada, API pública de conteúdo | 2, 5 |

Cada fase terá spec e plano próprios.

---

## 2. Decisões de arquitetura

| Decisão | Escolha | Alternativas descartadas |
|---------|---------|--------------------------|
| Forma do app | Monolito Next.js modular, um container | Payload CMS como espinha dorsal (admin genérico não serve às telas centrais); monorepo com apps separados (peso morto para dev solo) |
| Hospedagem | VPS Hostinger com Coolify | Vercel + Postgres gerenciado; Azure |
| Banco | PostgreSQL 16 | — |
| ORM | Drizzle ORM + postgres.js | Prisma |
| Autenticação | Better Auth, e-mail + senha, autogerido | Link mágico; OAuth Google/Microsoft; Clerk/Auth0 |
| UI | Tailwind 4 + shadcn/ui com tema próprio | — |
| Arquivos | Armazenamento S3-compatível no Coolify (RustFS; ver emenda abaixo), acesso só por URL assinada | Disco local do container; MinIO (imagens saíram dos registros públicos em 2026-09) |
| E-mail | SMTP da Hostinger, abstraído em módulo `mail` | Resend (fallback se entregabilidade decepcionar) |
| Testes | Vitest (unidade) + Playwright (ponta a ponta e visual) | — |

Versões exatas de bibliotecas serão confirmadas via context7 na escrita do plano de implementação.

**Emenda (2026-09-27, durante a implementação):** as imagens `minio/minio` e `minio/mc` deixaram de estar disponíveis no Docker Hub e no quay.io. O armazenamento passa a ser **RustFS** (`rustfs/rustfs`), que expõe a mesma API S3 nas mesmas portas (9000 API, 9001 console). O código usa só o AWS SDK, então nada muda na aplicação; o bucket é criado pelo próprio app na primeira gravação. Onde este documento diz MinIO, leia RustFS. **Emenda 2 (revisão final):** a API S3 precisa ser alcançável pelo navegador, porque os downloads são URLs assinadas abertas direto no storage; ela fica em `https://storage.egdsystem.com.br` (variável `S3_PUBLIC_ENDPOINT`), e os uploads continuam pela rede interna (`S3_ENDPOINT`). O §7.1 "acesso só pela rede interna" vale para o console e para os uploads, não para a API de download.

---

## 3. Estrutura do projeto

O repositório atual vira o app Next.js. Os arquivos HTML/JSX atuais permanecem como referência de conteúdo durante a migração e são removidos ao final da Fase 1. As pastas `export/` e `uploads/` são removidas do repositório (`uploads/Planilha de Capex.xlsx` não pertence ao código; deve ser movido para fora antes).

```
src/
  app/
    (site)/          # público: /, /servicos, /produtos, /sobre, /contato, /cases
    (portal)/        # cliente: /portal/...
    (admin)/         # admin: /admin/...
    (auth)/          # /entrar, /convite/[token], /recuperar-senha, /redefinir-senha/[token]
    api/             # rotas HTTP: /api/auth/* (Better Auth), /api/health; demais em fases futuras
  modules/           # um diretório por domínio
    auth/
    tenancy/         # organizations, memberships, invitations
    leads/
    files/
    audit/
    mail/
    <modulo>/
      schema.ts      # tabelas Drizzle
      queries.ts     # leitura, recebe contexto de autorização
      actions.ts     # server actions com validação Zod
      components/    # UI específica do módulo
  components/ui/     # shadcn/ui com tema próprio
  components/site/   # componentes do site público
  components/shell/  # chrome dos portais (sidebar, topbar, seletor de organização)
  content/           # textos do site público em TypeScript (serviços, produtos, sobre)
  lib/               # db.ts, auth.ts, storage.ts, mail.ts, env.ts
  db/
    migrations/      # geradas pelo Drizzle Kit
    seed.ts          # cria o admin inicial
docs/
  mockups/           # HTML de mockups para aprovação
  specs/             # specs de UI/design system
  superpowers/specs/ # specs de arquitetura (este arquivo)
  superpowers/plans/ # planos de implementação
tests/
  e2e/               # Playwright
  visual/            # screenshots de referência
Dockerfile
docker-compose.dev.yml   # Postgres + MinIO + Mailpit para desenvolvimento local
.env.example
```

**Regra de camadas:** páginas e componentes nunca acessam o banco diretamente. Toda leitura passa por `queries.ts` e toda escrita por `actions.ts` do módulo. A autorização vive nessas duas camadas.

---

## 4. Modelo de dados

Só o que a Fase 1 precisa. Tabelas de sessão, conta e verificação são geradas pelo Better Auth e não são listadas aqui.

### organizations
O cliente como empresa.

| coluna | tipo | notas |
|--------|------|-------|
| id | uuid pk | |
| name | text | obrigatório |
| slug | text unique | gerado do nome, editável |
| cnpj | text null | sem validação de dígito na Fase 1, só formato |
| status | enum `active` / `inactive` | inativa bloqueia acesso dos membros ao portal |
| created_at, updated_at | timestamptz | |

### users
Pessoas que fazem login. Estende a tabela `user` do Better Auth com campos adicionais.

| coluna | tipo | notas |
|--------|------|-------|
| id | uuid pk | |
| name, email | text | email unique, case-insensitive |
| role | enum `admin` / `client` | global |
| active | boolean | inativo não faz login |
| created_at, updated_at | timestamptz | |

### memberships
Liga usuário cliente a organização. Admin não tem membership; vê tudo.

| coluna | tipo | notas |
|--------|------|-------|
| user_id | fk users | |
| organization_id | fk organizations | |
| created_at | timestamptz | |
| pk (user_id, organization_id) | | |

### invitations

| coluna | tipo | notas |
|--------|------|-------|
| id | uuid pk | |
| email | text | |
| organization_id | fk organizations | |
| token_hash | text unique | token bruto só vai no e-mail; banco guarda hash SHA-256 |
| expires_at | timestamptz | 7 dias após criação |
| accepted_at | timestamptz null | uso único |
| invited_by | fk users | |
| created_at | timestamptz | |

### leads
Gravado pelo formulário de contato. Na Fase 2 o CRM converte lead em empresa/contato/oportunidade.

| coluna | tipo | notas |
|--------|------|-------|
| id | uuid pk | |
| name, email | text | obrigatórios |
| company, phone | text null | |
| message | text | obrigatório, máx. 4000 caracteres |
| source | text | `site_contact` na Fase 1; outras origens nas fases seguintes |
| status | enum `new` / `seen` | |
| ip_hash | text | hash do IP para rate limit e auditoria, não o IP bruto |
| created_at | timestamptz | |

### files
Metadados de arquivos no MinIO.

| coluna | tipo | notas |
|--------|------|-------|
| id | uuid pk | |
| bucket_key | text unique | `org/<organization_id>/<uuid>-<nome-sanitizado>` ou `internal/<uuid>-<nome>` |
| original_name, mime_type | text | |
| size_bytes | bigint | limite 50 MB por arquivo na Fase 1 |
| organization_id | fk organizations null | null = arquivo interno do admin |
| uploaded_by | fk users | |
| created_at | timestamptz | |

Nenhum arquivo é servido direto do bucket. Download sempre via action que checa permissão e devolve URL assinada com validade de 5 minutos.

### audit_log

| coluna | tipo | notas |
|--------|------|-------|
| id | bigserial pk | |
| actor_id | fk users null | null = sistema |
| action | text | ex.: `auth.login`, `invitation.sent`, `file.uploaded`, `organization.updated` |
| entity_type, entity_id | text | |
| organization_id | fk null | |
| metadata | jsonb | diff ou dados relevantes, sem segredos |
| created_at | timestamptz | |

**Invariante de multi-tenancy:** toda tabela de dado de cliente carrega `organization_id`. Toda query do portal filtra por essa coluna a partir da sessão, nunca por parâmetro de URL ou formulário.

---

## 5. Autenticação e autorização

### 5.1 Fluxos

- **Admin inicial:** criado por `db/seed.ts` na primeira instalação, com e-mail e senha vindos de variáveis de ambiente. Não existe cadastro aberto de admin.
- **Convite de cliente:** no admin, cria-se a organização, informa-se o e-mail da pessoa; o sistema gera token, grava o hash, envia e-mail com link `/convite/<token>`. A página valida token (existe, não expirou, não aceito), pede nome e senha, cria o usuário com role `client`, cria a membership, marca `accepted_at`, faz login e redireciona para `/portal`.
- **Convite para usuário já existente:** se o e-mail já tem conta, o aceite só cria a membership adicional (sem nova senha).
- **Recuperação de senha:** link por e-mail, expira em 1 hora, uso único. Resposta da tela é idêntica exista ou não o e-mail.
- **Sessão:** cookie httpOnly, Secure, SameSite=Lax, 30 dias com renovação em uso. Logout invalida a sessão no banco.

### 5.2 Autorização em três camadas

1. **Middleware:** `/admin/*` exige sessão com role `admin`; `/portal/*` exige sessão de usuário ativo. Sem sessão, redireciona para `/entrar?next=<destino>`. Usuário `client` em `/admin` recebe 404, não 403 (não revela a existência da área).
2. **Layout do grupo de rotas:** relê a sessão no servidor e monta o contexto `{ user, role, organization? }`. No portal, se o usuário tem mais de uma membership, um seletor no topo troca a organização ativa (guardada em cookie, validada contra as memberships a cada requisição). Organização inativa bloqueia acesso ao portal com mensagem clara.
3. **Queries e actions:** toda função recebe o contexto e aplica filtro por `organization_id` ou exige role `admin`. Nenhuma função confia em id vindo de formulário para decidir escopo.

### 5.3 Proteções

- Rate limit no login: 5 tentativas por e-mail e 20 por IP a cada 15 minutos, em memória do processo (um container só na Fase 1). Interface preparada para trocar por Redis se houver mais de uma réplica.
- Senha: mínimo 10 caracteres; verificação contra senhas vazadas via API Have I Been Pwned (k-anonimato, só os 5 primeiros caracteres do hash SHA-1 saem do servidor). Se a API falhar, aceita a senha e registra aviso.
- Hash de senha: o padrão do Better Auth (scrypt).
- Sem MFA na Fase 1; plugin do Better Auth disponível para fase futura.
- Cabeçalhos de segurança (CSP, HSTS, X-Frame-Options, Referrer-Policy) configurados no Next.js.

---

## 6. Site público e design system

### 6.1 Processo (conforme CLAUDE.md global)

1. Definir design system com as skills `frontend-design` e `ui-ux-pro-max`: paleta, tipografia, espaçamento, componentes. Registrar em `docs/specs/design-system.md`.
2. Gerar mockup HTML de cada página em `docs/mockups/` e obter aprovação antes de escrever código do app.
3. Textos passam pela skill `stop-slop` antes de entrar no código.
4. Após implementar, validar com Playwright: screenshot de cada página comparada ao mockup aprovado; corrigir divergências antes de declarar concluído.

### 6.2 Restrições visuais já definidas

Sem Inter, Roboto, Arial, Helvetica ou system-ui como fonte principal. Sem gradiente roxo. Sem grid de três cards com ícone genérico. Sem emoji em títulos. Sem textos vagos.

### 6.3 Páginas

| Rota | Conteúdo na Fase 1 |
|------|--------------------|
| `/` | início, redesenhado |
| `/servicos` | migrado do atual com redesign |
| `/produtos` | migrado do atual com redesign |
| `/sobre` | migrado do atual com redesign |
| `/contato` | formulário gravando lead |
| `/cases` | rota criada, conteúdo estático em código até a Fase 5 |

Conteúdo em arquivos TypeScript em `src/content/`. Páginas renderizadas estaticamente (SSG), exceto a action do formulário.

### 6.4 Formulário de contato

- Campos: nome, e-mail, empresa (opcional), telefone (opcional), mensagem.
- Validação Zod no servidor; erros exibidos por campo.
- Anti-spam: campo oculto (honeypot) e limite de 3 envios por IP a cada hora. Sem captcha visível.
- Ao gravar: insere em `leads`, envia e-mail de aviso para o admin, registra em `audit_log`, mostra confirmação na tela.
- Falha no envio de e-mail não impede a gravação do lead; fica registrada no log.

### 6.5 Design system

Uma base única com dois temas: **público** (mais expressivo) e **portais** (mais denso e sóbrio). Compartilham tipografia, escala de cores e componentes shadcn/ui. Implementado como variáveis CSS trocadas no layout de cada grupo de rotas.

### 6.6 Esqueleto dos portais

- **Admin (`/admin`):** shell com sidebar e topbar; páginas: painel (contadores de leads novos e organizações), organizações (listar, criar, editar, inativar), usuários de uma organização (listar, convidar, reenviar convite, inativar), leads (listar, marcar como visto), arquivos internos (upload, listar, baixar), auditoria (listar).
- **Portal (`/portal`):** shell com topbar e seletor de organização; páginas: início (boas-vindas com nome da organização e aviso de que projetos e documentos chegam em breve), minha conta (nome, senha).

---

## 7. Infra, deploy e serviços

### 7.1 Coolify

O Coolify ainda não está instalado no VPS; o plano de implementação inclui a instalação e a criação do projeto. Três recursos no mesmo projeto Coolify:

1. **App Next.js:** build via `Dockerfile` multi-stage do repositório (output `standalone`), deploy automático a cada push na `main`. Healthcheck em `/api/health`.
2. **PostgreSQL 16:** backup diário pelo Coolify para destino escolhido pelo usuário (S3-compatível ou local; definido na configuração).
3. **MinIO:** um bucket `egd`, acesso só pela rede interna do Coolify mais um subdomínio para o console administrativo, protegido por senha.

### 7.2 Domínios e TLS

Domínio: **egdsystem.com.br** (com redirecionamento de `www` para o apex). Site e portais no mesmo domínio, separados por caminho: `/`, `/portal`, `/admin`. Console do MinIO em `minio.egdsystem.com.br`, restrito por senha. Certificados Let's Encrypt automáticos do Coolify. O DNS do domínio deve apontar para o IP do VPS antes do primeiro deploy.

### 7.3 Migrations

Rodam na inicialização do container (`drizzle-kit migrate` antes de `node server.js`). Falha de migration impede o container de subir e o Coolify mantém a versão anterior.

### 7.4 Segredos

Somente em variáveis de ambiente do Coolify. `.env.example` documenta as chaves: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (`https://egdsystem.com.br` em produção), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`. Validadas na inicialização por `lib/env.ts` com Zod; chave ausente derruba o processo com mensagem clara.

### 7.5 Desenvolvimento local

`docker-compose.dev.yml` sobe Postgres, MinIO e Mailpit (captura e-mails). O app roda com `npm run dev` fora do Docker.

### 7.6 GitHub Pages

O workflow `pages.yml` é removido e o GitHub Pages desligado quando o novo site responder no domínio via Coolify. Até então, o site antigo continua publicado. Um workflow novo de CI (lint, typecheck, testes) substitui o antigo.

---

## 8. Tratamento de erros

- Actions retornam `{ ok: true, data } | { ok: false, error, fieldErrors? }`; nunca lançam para o cliente.
- Erros inesperados são registrados no log do servidor com id de correlação; a tela mostra mensagem genérica com esse id.
- `error.tsx` e `not-found.tsx` por grupo de rotas, no mesmo design system.
- Falhas de e-mail e de HIBP não bloqueiam o fluxo principal; ficam no log.

---

## 9. Testes

### Unidade (Vitest)
- Schemas Zod de lead, convite, organização, senha.
- Regras de autorização: queries do portal filtram por organização; actions de admin rejeitam role `client`.
- Geração, hash e expiração de token de convite e recuperação.
- Rate limiter.

### Ponta a ponta (Playwright, contra Postgres, MinIO e Mailpit do compose)
- Cliente autenticado recebe 404 em `/admin`.
- Cliente da organização A não baixa arquivo da organização B (URL assinada não é gerada).
- Fluxo completo de convite: admin convida, e-mail capturado no Mailpit, aceite, primeiro login, portal mostra a organização certa.
- Formulário de contato gera lead visível no admin e e-mail no Mailpit; honeypot preenchido não gera lead.
- Recuperação de senha completa.

### Visual
- Screenshots das páginas públicas em desktop e mobile comparadas ao mockup aprovado.

---

## 10. Critérios de pronto da Fase 1

1. O site novo responde no domínio via Coolify, com TLS.
2. As cinco páginas públicas correspondem aos mockups aprovados.
3. O admin faz login em `/admin`, cria uma organização e convida um usuário de teste.
4. O usuário de teste aceita o convite, entra em `/portal` e vê apenas a organização dele.
5. Um envio do formulário de contato aparece como lead no admin e gera e-mail.
6. Upload e download de arquivo funcionam no admin com URL assinada.
7. Todos os testes de unidade e ponta a ponta passam no CI (GitHub Actions).
8. Backup diário do Postgres configurado no Coolify.
9. GitHub Pages desligado e workflow antigo removido.
