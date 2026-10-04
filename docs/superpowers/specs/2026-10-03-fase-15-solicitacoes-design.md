# EGD — Fase 15: solicitações completas (anexos, SLA, notas internas, responsável e lembrete)

**Data:** 2026-10-03
**Status:** aprovado (o dono pediu para seguir com o backlog priorizado em 2026-10-03)
**Base:** "Fora do escopo" da Fase 8 (anexos, SLA, atribuição a responsável, mensagens internas) e da Fase 13 (lembretes ao cliente de solicitações paradas).
**Depende de:** Fase 14 (as notificações novas usam `notify()`).

## Objetivo

A solicitação do portal é hoje um texto com conversa. Falta o que um atendimento precisa: o cliente não anexa o print ou a planilha, a equipe não tem onde combinar entre si sem o cliente ver, ninguém sabe se a resposta está atrasada, não há responsável e uma solicitação que o cliente abandona fica "em andamento" para sempre. Esta fase fecha essas lacunas sem criar outro sistema de chamados: mesma tela, mesma conversa.

**Sucesso:** o cliente anexa arquivos ao abrir e ao responder; a equipe anexa ao responder; a equipe escreve notas que o cliente nunca vê; cada solicitação mostra o prazo de primeira resposta e se estourou; a lista do admin tem "Minhas" e "SLA estourado"; o cliente que não responde recebe um lembrete educado em 5 dias úteis, outro em 10, e depois silêncio.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Anexos | Tabela `portal_request_attachment (request_id, message_id null, file_id)`. Anexo do texto inicial tem `message_id` nulo. Reusa `files` e o storage da Fase 1; `files.organization_id` = organização da solicitação, então o download do portal reusa `POST /portal/arquivos/baixar` e o do admin, `/admin/arquivos/[id]/baixar`. | Coluna `file_ids[]` (sem FK); bucket separado. |
| Quem sobe | Cliente (criar e responder) e equipe (responder, inclusive nota interna). `uploadFile` passa a aceitar `PortalContext`: a organização é forçada para a do contexto. | Rota de upload própria (duplicaria validação). |
| Limites | Até **5 arquivos por mensagem**, **50 MB no total** (o corpo da server action é limitado a 52 MB). Extensões permitidas: pdf, doc, docx, xls, xlsx, ppt, pptx, csv, txt, png, jpg, jpeg, gif, webp, zip. Regra pura `validateAttachments(files)`. | Qualquer tipo (executáveis em storage compartilhado); limite por arquivo (não protege o corpo da requisição). |
| Nota interna | `portal_request_message.internal boolean`. Só a equipe cria e vê. Não muda status, não conta como resposta, não notifica o cliente, não entra na contagem de mensagens do portal nem no "última mensagem" do resumo diário. | Tabela separada (duplicaria a conversa); comentário em outra entidade. |
| SLA | **Primeira resposta** em horas úteis (seg–sex, 09:00–18:00 em Brasília) por prioridade: urgente 2 h, alta 4 h, média 8 h (um dia útil, como o portal já promete), baixa 16 h. `first_response_due_at` calculado ao criar; recalculado quando a prioridade muda **antes** da primeira resposta. `first_response_at` gravado na primeira mensagem não interna da equipe. Regras puras em `sla.ts`. | SLA de cada resposta (ruído: a conversa tem idas e vindas); SLA configurável (um dono só); horário corrido (estouraria no fim de semana). |
| Estados do SLA | `pending` (resta X), `breached` (estourado há X), `met` (respondida em X), `closed` (resolvida sem resposta da equipe, ex.: o cliente resolveu). Selo na lista e no detalhe; filtro "SLA estourado" na lista do admin; KPI no painel ("Solicitações abertas · N com SLA estourado"); marca "⚠ SLA" na seção de solicitações do resumo diário. | — |
| Responsável | `assignee_id` em `portal_request` (admin). Seletor no bloco Triagem; filtro "Minhas" na lista. Quem é atribuído por outra pessoa recebe a notificação `request.assigned` (tipo novo, admin, e-mail ligado por padrão). | Atribuição automática (não há regra que valha para um dono só). |
| Lembrete ao cliente | Automação `solicitacoes-lembrete` (seg–sex 09:30): solicitação `open`/`in_progress` cuja última mensagem **não interna** é da equipe há **5 dias úteis** ou mais, com `reminder_count < 2` e sem lembrete nos últimos 5 dias úteis → e-mail e notificação `request.reminder` (cliente) aos membros da organização; `reminder_count++`, `last_reminder_at`. Depois do segundo, nada mais acontece (o resumo diário já lista para a equipe). Regra pura `requestsToRemind(rows, now)`. | Resolver automaticamente (decisão de negócio do dono, não do sistema); lembrete único. |
| Auditoria | `portal.request.attached` / `request.attached` (metadata: `fileIds`, `count`); `request.note.created`; `request.assigned` (metadata `from`, `to`); `request.reminded` (ator nulo). | — |

## Telas

- **Portal, nova solicitação e resposta:** campo "Anexos (opcional)" com `multiple`; a lista de arquivos escolhidos aparece antes de enviar; erro por campo se passar do limite ou tipo. Cada mensagem da conversa lista seus anexos (nome, tamanho) com botão Baixar (formulário `POST /portal/arquivos/baixar`).
- **Admin, detalhe:** a resposta ganha anexos e a caixa "Nota interna (o cliente não vê)". Nota interna aparece na conversa com fundo de atenção e o selo "Nota interna". Cabeçalho mostra o selo do SLA ("SLA: resta 3 h", "SLA estourado há 2 h", "Respondida em 45 min"). Bloco Triagem ganha "Responsável" (lista de admins ativos).
- **Admin, lista:** abas Todas / Abertas / Em andamento / Resolvidas + **Minhas** e **SLA estourado**; coluna com o selo do SLA; ordem: estouradas primeiro, depois por prazo do SLA, depois atualização.
- **Painel:** KPI "Solicitações abertas" ganha a dica "N com SLA estourado" (vermelho quando N > 0).
- **Automações:** linha "Lembrar clientes de solicitações paradas" com prévia em tabela (solicitação, organização, dias parada, lembrete nº).

## Arquitetura

```
src/modules/requests/
  schema.ts         + assignee_id, first_response_due_at, first_response_at, reminder_count, last_reminder_at; message.internal; portal_request_attachment
  sla.ts            puras: BUSINESS_HOURS, SLA_HOURS, addBusinessHours, firstResponseDueAt, slaState, formatSla, businessDaysBetween
  attachments.ts    puras: ALLOWED_EXTENSIONS, MAX_FILES, MAX_TOTAL_BYTES, validateAttachments(files)
  reminders.ts      requestsToRemind (puro), loadReminderCandidates, sendReminders
  actions.ts        createRequest/reply* com anexos; replyAsTeam com internal; assignRequest; setRequestPriority recalcula SLA
  queries.ts        anexos por mensagem; listAllRequests com filtros assignee/sla e campos do SLA; countBreachedSla
  components/       request-form (anexos), reply-form (anexos + nota interna), request-thread (anexos, nota interna), sla-badge
src/modules/files/actions.ts   uploadFile(ctx: AdminContext | PortalContext, fd); uploadFiles(ctx, files, organizationId)
src/modules/notifications/kinds.ts   + request.assigned (admin), request.reminder (client)
src/modules/notifications/events.ts  + notifyRequestAssigned, notifyRequestReminder
src/modules/mail/templates.ts        + renderRequestReminder, renderRequestAssigned
src/modules/jobs/registry.ts         + solicitacoes-lembrete
src/modules/jobs/digests/daily.ts    ignora notas internas; marca SLA estourado
src/modules/dashboard/queries.ts     breached_sla
src/db/migrations/0013_requests_extras.sql
```

Migration: `alter table portal_request add column assignee_id uuid references users(id) on delete set null, add column first_response_due_at timestamptz, add column first_response_at timestamptz, add column reminder_count int not null default 0, add column last_reminder_at timestamptz; alter table portal_request_message add column internal boolean not null default false; create table portal_request_attachment (id uuid pk, request_id uuid not null references portal_request on delete cascade, message_id uuid references portal_request_message on delete cascade, file_id uuid not null references files on delete cascade, created_at timestamptz not null default now()); index (request_id)`. Solicitações existentes ficam com `first_response_due_at` nulo: o selo mostra "—" e elas não entram em "SLA estourado" (backfill não é confiável sem o histórico de prioridade).

## Testes

- **Unitários** (`tests/unit/requests/`): `addBusinessHours` (dentro do dia, vira o dia, pula fim de semana, criada fora do horário começa a contar na abertura seguinte); `slaState` nos quatro estados; `validateAttachments` (6 arquivos, 51 MB, `.exe`, nome com caminho); `requestsToRemind` (5 dias úteis, menos de 5 não, `reminder_count = 2` não, lembrete recente não, última mensagem do cliente não, nota interna da equipe não conta como última).
- **Integração** (`tests/integration/requests/extras.test.ts`): criar com dois anexos grava `files` na organização certa e o portal lista; cliente de outra organização não baixa (`getDownloadUrl` falha); nota interna não aparece ao portal, não muda status, não grava `first_response_at`; resposta normal grava `first_response_at`; `setRequestPriority` recalcula `first_response_due_at` só antes da primeira resposta; `assignRequest` audita e notifica o atribuído (não quem se atribui); `sendReminders` envia uma vez, incrementa, e não repete no dia seguinte; `loadDailyDigestInput` ignora nota interna.
- **E2E** (`tests/e2e/solicitacoes-extras.spec.ts`): cliente abre com anexo `.txt` → admin vê o anexo e baixa (status 200 no redirect) → admin escreve nota interna → cliente não vê → admin responde com anexo → cliente vê e baixa → selo "Respondida em" aparece → admin atribui a si e a aba "Minhas" lista. Rotas novas nas verificações de acessibilidade e console.

## Fora do escopo

SLA de resolução, SLA configurável por organização, horário de atendimento configurável, feriados, anexos em comentários de entrega, antivírus, visualização inline de imagens/PDF, resolução automática por abandono, fila/round-robin de responsáveis.
