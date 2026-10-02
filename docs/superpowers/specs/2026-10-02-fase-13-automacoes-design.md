# EGD — Fase 13: automações (agendador e e-mails automáticos)

**Data:** 2026-10-02
**Status:** aprovado (spec e mockup em 2026-10-02)
**Base:** backlog das Fases 2, 4 e 10–12 (aviso de proposta expirada, relatório semanal por e-mail, "automações por e-mail agendado").
**Mockup:** `docs/mockups/admin-automacoes.html` (tela de automações do admin). Os e-mails estão descritos em texto nesta spec; o template HTML reusa o `layout()` de `src/modules/mail/templates.ts`.

## Objetivo

Hoje o sistema só manda e-mail em reação a uma ação de alguém (convite, lead, comentário, solicitação). Nada acontece sozinho: uma proposta vence e continua "Enviada"; uma entrega atrasa e ninguém é avisado; o relatório semanal existe, mas alguém precisa lembrar de abrir. Esta fase cria o **agendador** que faltava e, sobre ele, quatro automações.

**Sucesso:** sem ninguém abrir o sistema, a equipe recebe o resumo diário útil e o semanal na segunda; propostas vencidas mudam de estado sozinhas; os clientes que optaram recebem o andamento semanal dos seus projetos. Tudo visível e controlável numa tela do admin, com prévia antes de enviar e histórico de cada execução. Reinício ou deploy do container nunca duplica um envio nem deixa de executar o do dia.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Onde o agendador roda | Dentro do próprio processo do Next, iniciado por `instrumentation.ts` (só no runtime Node). Um `setInterval` de 60 s ("tique") verifica o que está devido. Sem container, worker ou fila novos. | Cron do Coolify chamando uma rota (acopla a um recurso fora do repositório; silencioso se não configurado); worker separado (segundo container num VPS de 1 vCPU); BullMQ/Redis (dependência de infra). |
| Garantia de execução única | Livro-razão no banco: `job_run` com índice único `(job, period_key, attempt)`. Quem consegue inserir a linha executa; quem perde a corrida pula. Vale entre reinícios e entre dois containers vivos durante o deploy. | Lock em memória (perde no reinício, não vale entre containers); `pg_advisory_lock` (resolve a corrida, mas não o "já rodou hoje?"). |
| Período e atraso | Cada automação tem uma **chave de período** (`2026-10-02` para diária, `2026-S40` para semanal). Só o período corrente é considerado: se o servidor ficou fora às 08:00 e voltou às 10:00, roda às 10:00; se ficou fora três dias, roda só o de hoje, nunca os atrasados. | Fila de períodos perdidos (três resumos atrasados de uma vez não têm valor e confundem). |
| Falha e nova tentativa | Execução com erro registra `status = error` e o tique seguinte tenta de novo, até **3 tentativas** por período (`attempt` 1..3). Execução presa em `running` há mais de 15 min conta como erro (processo morreu). | Retentativa infinita (erro de SMTP persistente viraria 1 tentativa/min); desistir na primeira (SMTP instável deixaria o dia sem resumo). |
| Liga/desliga | `JOBS_ENABLED` no ambiente: padrão **ligado em produção**, desligado nos demais (`dev`, CI, E2E). Cada automação tem ainda um interruptor próprio na tela (`job_setting.enabled`), para o dono pausar uma sem mexer no servidor. | Padrão desligado em produção (silêncio por esquecimento de variável). |
| Fuso e horários | Agenda em `America/Sao_Paulo`, reusando `reports/dates.ts`. Horários fixos por automação (abaixo); não configuráveis nesta fase. | Horário editável por automação (UI a mais para um dono só). |
| Destinatário da equipe | `ADMIN_NOTIFY_EMAIL`, como os avisos existentes. | Um e-mail por usuário admin com preferência própria (a equipe é uma pessoa; fica para quando crescer). |
| Destinatários do cliente | Membros ativos da organização, um e-mail por pessoa, só se a organização tiver `weekly_digest = true`. Padrão **desligado**: o cliente só recebe se o dono ligar na organização ou ele mesmo ligar em "Minha conta" no portal. | Ligado por padrão (e-mail não pedido para cliente é risco de imagem). |
| Silêncio quando não há nada | Resumo diário e semanal do cliente **não são enviados** quando todas as seções estão vazias; a execução fica registrada como `ok` com `summary.sent = 0`. O semanal da equipe sempre vai (o "nada aconteceu" é informação). | Mandar e-mail vazio (treina a pessoa a ignorar). |
| Prévia e envio manual | Cada automação tem **Prévia** (renderiza o e-mail com os dados de agora, no navegador, sem enviar) e **Enviar agora** (executa de verdade, `trigger = manual`, não consome o período agendado). A de expirar propostas tem "Executar agora" e a prévia lista o que seria expirado. | Só "executar" sem prévia (impossível conferir texto e dados sem mandar e-mail a cliente). |
| Entrega de e-mail | `deliver()` passa a devolver `boolean` (enviado ou não) sem lançar; o resumo da execução conta enviados e falhas. | Lançar em falha (quebraria os fluxos atuais que dependem de "nunca lança"). |
| Auditoria | `proposal.expired` (ator `null`, sistema) por proposta; `job.triggered` (ator admin) em envio manual; `job.setting.updated` ao ligar/desligar; `organization.updated` com `weeklyDigest` no diff. Execuções agendadas não poluem a auditoria: ficam em `job_run`. | Auditar cada tique (ruído). |

## Automações

| Chave | Nome na tela | Quando (São Paulo) | Para quem |
|---|---|---|---|
| `propostas-expirar` | Expirar propostas vencidas | todo dia, 07:30 | ninguém (muda estado; entra no resumo diário) |
| `resumo-diario` | Resumo diário da equipe | seg–sex, 08:00 | `ADMIN_NOTIFY_EMAIL` |
| `semanal-equipe` | Relatório semanal da equipe | segunda, 08:15 | `ADMIN_NOTIFY_EMAIL` |
| `semanal-cliente` | Andamento semanal para clientes | segunda, 09:00 | membros ativos das organizações com `weekly_digest` |

### 1. Expirar propostas vencidas
Propostas com `status = 'sent'` e `valid_until < hoje` passam a `expired`, `decided_at = now()`, `decision_notes = 'Expirada automaticamente em DD/MM/AAAA.'` (só se vazio). Uma linha de auditoria por proposta. Resumo da execução: `{ expired: n, ids }`. Regra pura `proposalsToExpire(rows, today)`.

Sem e-mail próprio: o resumo diário mostra "Propostas expiradas nos últimos 7 dias".

### 2. Resumo diário da equipe
Assunto: `Resumo de DD/MM: N atrasadas, N vencem hoje, N solicitações aguardando`. Seções, cada uma omitida quando vazia:

1. **Atrasadas** — entregas abertas com `due_at < hoje` em projetos `planning`/`active` não arquivados: projeto, entrega, prioridade, dias de atraso, responsável. Ordem: prioridade, atraso (desc). Até 15 linhas, depois "e mais N".
2. **Vencem hoje** — mesma fonte, `due_at = hoje`.
3. **Próximos 7 dias** — entregas (`hoje < due_at ≤ hoje+7`) e marcos pendentes no mesmo intervalo (marcos com ◆).
4. **Solicitações aguardando a equipe** — `portal_request` não resolvida cuja última mensagem é do cliente (ou sem mensagem), com idade em dias úteis. Ordem: mais antiga primeiro.
5. **Propostas** — vencem nos próximos 7 dias (`sent`, `hoje ≤ valid_until ≤ hoje+7`) e expiradas nos últimos 7 dias (`expired`, `decided_at ≥ hoje−7`).
6. **Demandas urgentes** — contagem de entregas abertas com prioridade `urgent` (link para `/admin/demandas`).

Rodapé: links para `/admin/demandas`, `/admin/solicitacoes`, `/admin/crm/propostas`. Se todas as seções estão vazias, não envia. Fonte: funções puras `buildDailyDigest(input, today)` sobre um carregador `loadDailyDigestInput()` que reusa as regras de `dashboard/queries` e `projects/queries.listBacklog`.

### 3. Relatório semanal da equipe
Na segunda, o `buildWeekly` da Fase 12 para a **semana anterior** (segunda a domingo que acabou de fechar), em e-mail: por projeto, concluído / vence / atrasado, com ◆ nos marcos. Assunto: `Semana 2026-S40: N concluídos, N vencem, N atrasados`. Link "Abrir no sistema" para `/admin/relatorios/semanal?semana=AAAA-MM-DD`. Sempre envia (mesmo sem itens: "Nenhuma entrega ou marco concluído na semana").

### 4. Andamento semanal para clientes
Para cada organização ativa com `weekly_digest = true`, um e-mail por membro ativo. Escopo e visibilidade idênticos ao portal (`portal-projects/queries` e `reports/portal-queries`): só projetos das empresas vinculadas, só entregas `visible_to_client`, nunca valores, prioridade, responsável por entrega nem atas não compartilhadas.

Por projeto: progresso (% de entregas visíveis concluídas), **concluído na semana passada** (entregas visíveis e marcos), **previsto para esta semana** (entregas visíveis e marcos com prazo até domingo), **solicitações aguardando você** (status `in_progress` cuja última mensagem é da equipe). Assunto: `Andamento dos seus projetos · semana de DD/MM`. Link para `/portal/projetos/[id]/relatorio`. Rodapé: "Você recebe este resumo porque ele está ligado em Minha conta no portal." Não envia se nenhum projeto tiver item em nenhuma seção.

Onde se liga: campo "Resumo semanal por e-mail" no formulário da organização (admin) e um interruptor em `/portal/conta` (qualquer membro liga ou desliga para a organização ativa; auditado como `organization.updated`).

## Tela do admin: `/admin/automacoes`
Item "Automações" na sidebar, entre "API" e "Auditoria". Página com:

- **Faixa de estado do agendador**: "Agendador ligado neste servidor · último tique há 40 s" ou "Agendador desligado (`JOBS_ENABLED`): as automações só rodam por Enviar agora". O último tique é lido de um registro em memória do processo (`getSchedulerState()`), não do banco.
- **Tabela de automações**: nome, quando, destinatário, interruptor (formulário `POST` com `enabled`), última execução (quando, status `ok`/`error`/`running`, resumo curto: "3 e-mails enviados", "2 propostas expiradas", "nada a enviar"), ações **Prévia** e **Enviar agora** (confirmação pelo `ConfirmAction` existente; desabilitado enquanto houver execução `running` da mesma automação).
- **Histórico**: últimas 30 execuções de todas as automações: quando, automação, gatilho (agendada/manual + quem), status, duração, resumo, erro (truncado).
- **Prévia** em `/admin/automacoes/[job]/previa`: cabeçalho com assunto e destinatário(s) e o HTML do e-mail dentro de um `iframe` com `srcdoc` e `sandbox` (o HTML do e-mail não executa script nem herda o CSS do admin). Para `semanal-cliente`, um seletor de organização (entre as que têm o resumo ligado; se nenhuma, aviso). Para `propostas-expirar`, tabela do que seria expirado.

## Arquitetura

```
src/modules/jobs/
  registry.ts     lista das automações: key, nome, descrição, schedule (puro), run(ctx), preview(ctx)
  schedule.ts     puras: periodKey(job, now), isDue(job, now), nextRunAt(job, now)  (São Paulo)
  claim.ts        puras: decideClaim(runs, now) → { attempt } | null  (regras de 3 tentativas e running preso)
  runner.ts       claimAndRun(job, trigger, actorId?): insere job_run, executa, grava summary/erro
  scheduler.ts    startScheduler(): setInterval 60 s com unref(); guarda em globalThis (dev/HMR); getSchedulerState()
  schema.ts       job_run, job_setting
  queries.ts      listJobsWithLastRun, listRuns, isJobEnabled
  actions.ts      setJobEnabled, triggerJob (requireAdmin + audit)
  form-actions.ts
  digests/
    daily.ts      loadDailyDigestInput + buildDailyDigest (puro)
    weekly-team.ts  carrega semana anterior via reports/queries + buildWeekly
    weekly-client.ts  loadClientDigestInput(orgId) + buildClientDigest (puro)
    proposals.ts  proposalsToExpire (puro) + expireProposals
src/modules/mail/digests.ts   renderDailyDigest, renderWeeklyTeam, renderWeeklyClient (puros, mesmo layout)
src/instrumentation-node.ts   além de validar env: if (JOBS_ENABLED) startScheduler()
src/app/(admin)/admin/automacoes/page.tsx
src/app/(admin)/admin/automacoes/[job]/previa/page.tsx
src/app/(portal)/portal/conta/page.tsx  (+ interruptor do resumo semanal)
src/db/migrations/0011_jobs.sql
```

Tabelas:

```sql
job_setting (job text primary key, enabled boolean not null default true,
             updated_at timestamptz not null default now(), updated_by uuid null)
job_run (id uuid pk, job text not null, period_key text null, attempt int not null default 1,
         trigger text not null check (trigger in ('schedule','manual')), actor_id uuid null,
         status text not null check (status in ('running','ok','error')),
         started_at timestamptz not null default now(), finished_at timestamptz null,
         summary jsonb not null default '{}', error text null)
unique index job_run_period_uniq on job_run (job, period_key, attempt) where period_key is not null
index job_run_job_started_idx on job_run (job, started_at desc)
alter table organizations add column weekly_digest boolean not null default false
```

Regras do tique (`scheduler.ts` → `runner.ts`): para cada automação habilitada com `isDue(job, now)`: carregar as execuções do período; `decideClaim` devolve o `attempt` a inserir ou `null`; inserir `job_run (status running)`; conflito de índice único = outro processo pegou, seguir; executar `run()` com `today`/`now` injetados; gravar `ok` + `summary` ou `error` + mensagem. Automações rodam em sequência dentro do tique; um tique não começa enquanto o anterior não terminou (flag em memória). O agendador nunca derruba o processo: toda exceção vira `error` na linha e `logger.error("job.failed")`.

`JOBS_ENABLED` entra no `env.ts` como opcional (`"1"`/`"0"`); default `NODE_ENV === "production"`. O CI passa `JOBS_ENABLED=0` ao servidor dos E2E. Runbook ganha a seção "15. Automações".

## Testes

- **Unitários** (`tests/unit/jobs/`): `periodKey`/`isDue` nas viradas de dia, fim de semana e fuso (23:30 UTC de domingo ainda é domingo em SP); `decideClaim` (sem execução → 1; `ok` → null; `error` → 2; terceiro erro → null; `running` recente → null; `running` há 20 min → próxima tentativa); `proposalsToExpire` (vence hoje não expira, venceu ontem expira, `draft` nunca); `buildDailyDigest` (seções vazias omitidas, limite de 15 + "e mais N", ordenação, "não envia" quando tudo vazio, dias úteis das solicitações); `buildClientDigest` (sem campos de custo no tipo; só visíveis; "não envia" vazio); templates (assuntos, `esc` de títulos com `<`).
- **Integração** (`tests/integration/jobs/`): duas chamadas concorrentes de `claimAndRun` para o mesmo período executam uma vez; `expireProposals` muda só as `sent` vencidas e audita; `loadDailyDigestInput` ignora projetos arquivados/encerrados; `loadClientDigestInput` de outra organização não vê o projeto, não vê entrega interna; envio manual não bloqueia o agendado do mesmo dia.
- **E2E** (`tests/e2e/automacoes.spec.ts`): admin abre Automações, vê as quatro, desliga e religa uma (histórico/auditoria), abre a prévia do resumo diário (iframe com o assunto), clica Enviar agora e o e-mail chega no Mailpit (`waitForMailWithSubject`); cliente liga o resumo semanal em Minha conta e o admin vê a organização na prévia do semanal de cliente. Rotas novas nas verificações de acessibilidade e console limpo.

## Fora do escopo

Horários configuráveis, preferências por usuário admin, notificação em tempo real (in-app), fila genérica de jobs, retentativa com backoff, lembretes ao cliente de solicitações paradas por mais de N dias, envio do relatório de status em PDF, SMS/WhatsApp.
