# Fase 13 — Automações: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agendador dentro do processo do Next, com livro-razão no banco, e quatro automações (expirar propostas, resumo diário da equipe, semanal da equipe, andamento semanal para clientes), controladas e pré-visualizadas em `/admin/automacoes`.

**Architecture:** Módulo `src/modules/jobs/` com regras puras (agenda, chave de período, decisão de tentativa, builders dos resumos) testadas em unidade; um `runner` que reclama a execução inserindo em `job_run` (índice único) e grava o resultado; um `scheduler` com `setInterval` iniciado por `instrumentation-node.ts`; templates de e-mail em `mail/digests.ts` reusando o `layout()` existente; páginas do admin renderizadas no servidor.

**Tech Stack:** Next.js 16 (App Router, instrumentation, server actions), Drizzle ORM + Postgres, nodemailer (transporter existente), Vitest, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-02-fase-13-automacoes-design.md` (mockup `docs/mockups/admin-automacoes.html`).

## Global Constraints

- Sem dependências novas.
- Agenda e "hoje" em `America/Sao_Paulo` (`reports/dates.ts`). `now` injetado em toda função de agenda e builder.
- Só o período corrente é elegível; nunca executar períodos passados.
- Até 3 tentativas por período; `running` há mais de 15 min conta como erro.
- O agendador nunca derruba o processo: toda exceção vira `error` na linha de `job_run` e `logger.error("job.failed")`.
- `JOBS_ENABLED` opcional; padrão ligado só em produção. CI passa `JOBS_ENABLED=0` ao servidor dos E2E.
- Resumo diário e semanal do cliente não enviam quando vazios (`summary.sent = 0`); semanal da equipe sempre envia.
- Cliente nunca recebe valores, prioridade, responsável por entrega, entregas com `visibleToClient = false`. O tipo de entrada do builder do cliente não tem esses campos.
- Todo valor dinâmico no HTML passa por `esc`. Links usam `env.BETTER_AUTH_URL` como base.
- Copy em português, no tom do mockup.

## Review Focus

- Dois processos reclamando o mesmo período → exatamente uma execução (teste de integração, Task 5).
- Servidor reiniciado às 10:00 sem ter rodado o das 08:00 → roda uma vez; reiniciado três dias depois → só o período de hoje (`isDue` + `periodKey`, Task 1).
- `running` abandonado não trava o período para sempre e erro persistente não vira retentativa infinita (`decideClaim`, Task 1).
- Proposta que vence hoje **não** expira hoje; expira amanhã (`proposalsToExpire`, Task 2).
- Resumo vazio não manda e-mail; semanal da equipe manda mesmo vazio (Tasks 3 e 4).
- Organização sem `weekly_digest` nunca recebe; membro desativado nunca recebe (Task 6).
- "Enviar agora" não bloqueia nem substitui a execução agendada do dia (Task 5).

## File Structure

```
src/modules/jobs/
  schema.ts            job_run, job_setting
  schedule.ts          puras: periodKey, isDue, nextRunAt, describeSchedule
  claim.ts             puras: decideClaim
  registry.ts          JOB_KEYS, JOBS (metadados + run/preview por automação)
  runner.ts            claimAndRun, runManually
  scheduler.ts         startScheduler, getSchedulerState
  queries.ts           listJobsWithLastRun, listRuns, listEnabledJobs, listDigestOrganizations
  actions.ts           setJobEnabled, triggerJob, setOrganizationWeeklyDigest
  form-actions.ts      setJobEnabledForm, triggerJobForm, setWeeklyDigestPortalForm
  digests/
    proposals.ts       proposalsToExpire (puro), loadExpirableProposals, expireProposals
    daily.ts           DailyDigestInput, buildDailyDigest (puro), loadDailyDigestInput
    weekly-team.ts     loadWeeklyTeamInput (reusa reports)
    weekly-client.ts   ClientDigestInput, buildClientDigest (puro), loadClientDigestInput
src/modules/mail/digests.ts   renderDailyDigest, renderWeeklyTeam, renderWeeklyClient
src/modules/mail/send.ts      deliver devolve boolean; sendDigest(to, content)
src/lib/env.ts                JOBS_ENABLED
src/instrumentation-node.ts   startScheduler quando habilitado
src/app/(admin)/admin/automacoes/page.tsx
src/app/(admin)/admin/automacoes/[job]/previa/page.tsx
src/app/(admin)/layout.tsx    item "Automações"
src/modules/tenancy/{schema,validation,actions,form-actions}.ts + components/organization-form.tsx  weekly_digest
src/app/(portal)/portal/conta/page.tsx + src/modules/jobs/components/weekly-digest-form.tsx
src/db/migrations/0011_jobs.sql
tests/unit/jobs/{schedule,claim,proposals,daily,weekly-client,digest-templates}.test.ts
tests/integration/jobs/jobs.test.ts
tests/e2e/automacoes.spec.ts (+ rotas em acessibilidade e console-limpo)
docs/runbooks/coolify.md      seção 15
.github/workflows/ci.yml      JOBS_ENABLED=0 no servidor dos E2E
```

---

### Task 1: Agenda e decisão de tentativa (puros)
- [ ] `schedule.ts`: tipos `Schedule = { kind: "daily" | "weekdays" | "weekly"; hour; minute; weekday? }`; `periodKey(schedule, now)` (`YYYY-MM-DD` ou `YYYY-Www` da segunda); `isDue(schedule, now)` (dia elegível e hora SP ≥ horário); `nextRunAt(schedule, now)` para a faixa da tela; `describeSchedule`.
- [ ] `claim.ts`: `decideClaim(runs: {status, attempt, startedAt}[], now, { maxAttempts = 3, staleMinutes = 15 })` → `{ attempt } | null`.
- [ ] Testes `tests/unit/jobs/schedule.test.ts` e `claim.test.ts`.

### Task 2: Expirar propostas (puro + ação)
- [ ] `digests/proposals.ts`: `proposalsToExpire(rows, today)`; `loadExpirableProposals()`; `expireProposals(today)` grava status/decidedAt/decisionNotes e audita `crm.proposal.expired` com `actorId: null`, `metadata.automatic = true`.
- [ ] Teste unitário.

### Task 3: Resumo diário (puro + carregador + template)
- [ ] `digests/daily.ts`: `DailyDigestInput` (entregas abertas com projeto/prioridade/responsável, marcos pendentes, solicitações com último autor, propostas `sent`/`expired`, contagem de urgentes); `buildDailyDigest(input, today)` → seções, `isEmpty`, assunto; `loadDailyDigestInput(today)`.
- [ ] `mail/digests.ts`: `renderDailyDigest(digest, baseUrl)`.
- [ ] Testes unitários (seções vazias, limite 15, ordenação, dias úteis, escape).

### Task 4: Semanal da equipe e do cliente
- [ ] `digests/weekly-team.ts`: `loadWeeklyTeamInput(today)` → `buildWeekly(projects, mondayOf(addDays(today,-7)), today)`; `renderWeeklyTeam(report, baseUrl)`.
- [ ] `digests/weekly-client.ts`: `ClientDigestInput`, `buildClientDigest(input, today)`, `loadClientDigestInput(orgId, today)` com o mesmo escopo do portal; `renderWeeklyClient(digest, baseUrl)`.
- [ ] Testes unitários (tipo sem custo; só visíveis; vazio não envia).

### Task 5: Schema, runner, scheduler, registry
- [ ] `schema.ts` + migration `0011_jobs.sql` (+ `organizations.weekly_digest`).
- [ ] `registry.ts`: as quatro automações com `run(ctx: { now, today })` devolvendo `summary`.
- [ ] `runner.ts`: `claimAndRun(job, now)` (agendada) e `runManually(job, actorId, now)`; `send.ts` com `deliver` → boolean.
- [ ] `scheduler.ts`: tique de 60 s, `unref`, guarda em `globalThis`, `getSchedulerState()`.
- [ ] `env.ts` `JOBS_ENABLED`; `instrumentation-node.ts`.
- [ ] Integração `tests/integration/jobs/jobs.test.ts`: corrida de dois `claimAndRun`; `expireProposals`; manual não bloqueia agendada; carregadores de escopo.

### Task 6: Preferência do cliente (`weekly_digest`)
- [ ] Tenancy: coluna no schema, `organizationSchema.weeklyDigest`, `updateOrganization` grava, checkbox no `OrganizationForm`, `setOrganizationWeeklyDigest` (admin e portal) com audit.
- [ ] Portal `/portal/conta`: `WeeklyDigestForm` (interruptor por organização ativa).

### Task 7: Páginas do admin
- [ ] `/admin/automacoes`: faixa do agendador, tabela, histórico, formulários de liga/desliga e Enviar agora (`ConfirmAction`).
- [ ] `/admin/automacoes/[job]/previa`: assunto, destinatários, "enviaria?", `iframe sandbox srcdoc`; seletor de organização no semanal de cliente; tabela no expirar propostas.
- [ ] Sidebar.

### Task 8: E2E, acessibilidade, console, CI e runbook
- [ ] `tests/e2e/automacoes.spec.ts`; rotas novas em `acessibilidade.spec.ts` e `console-limpo.spec.ts`.
- [ ] `ci.yml` com `JOBS_ENABLED=0`; `.env.example`; runbook seção 15; README (linha de deploy).

### Task 9: Verificação completa, PR e deploy
- [ ] `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run test:e2e`.
- [ ] PR `fase-13-automacoes` → `main`; CI verde; merge; conferir deploy e `JOBS_ENABLED` no Coolify.
