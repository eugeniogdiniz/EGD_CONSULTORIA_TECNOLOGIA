# Fase 15 — Solicitações completas: plano de implementação

**Goal:** Anexos (cliente e equipe), notas internas, SLA de primeira resposta em horas úteis, responsável e lembrete automático ao cliente, tudo dentro da tela de solicitação que já existe.

**Spec:** `docs/superpowers/specs/2026-10-03-fase-15-solicitacoes-design.md`.

## Global Constraints

- Sem dependências novas.
- Nota interna: nunca sai para o portal (queries, contagens, resumo diário, notificações).
- Anexo de cliente sempre nasce com `files.organization_id` da organização dele; o download do portal passa pela checagem da Fase 1.
- Horas úteis em `America/Sao_Paulo`; `now` injetado em toda função pura.
- Lembrete: no máximo 2 por solicitação; só com última mensagem não interna da equipe há ≥ 5 dias úteis.
- Rotas novas em `acessibilidade.spec.ts` e `console-limpo.spec.ts`.

## Tasks

### Task 1: Puros — SLA, anexos, lembrete
- [ ] `sla.ts`, `attachments.ts`, `reminders.ts` (parte pura) + testes unitários.

### Task 2: Schema e migration
- [ ] Colunas e tabela novas; `0013_requests_extras.sql`.

### Task 3: Upload pelo portal e anexos nas actions
- [ ] `uploadFile` aceita `PortalContext`; `uploadFiles`.
- [ ] `createRequest`, `replyAsClient`, `replyAsTeam` recebem `File[]`; gravam `portal_request_attachment`; auditam.
- [ ] Queries de anexos por mensagem (admin e portal).

### Task 4: Nota interna, SLA, responsável
- [ ] `replyAsTeam({ internal })`; `first_response_at`; `setRequestPriority` recalcula SLA; `assignRequest` + notificação `request.assigned`.
- [ ] `listAllRequests` com filtros e ordem do SLA; `countBreachedSla`; painel.
- [ ] Integração.

### Task 5: Lembrete
- [ ] `loadReminderCandidates`, `sendReminders`, notificação `request.reminder`, template; job `solicitacoes-lembrete` com prévia.
- [ ] Resumo diário ignora notas internas e marca SLA estourado.

### Task 6: Telas
- [ ] Formulários com anexos e nota interna; thread com anexos e nota; selo do SLA; triagem com responsável; lista com abas e selo; painel.

### Task 7: E2E, docs, PR
- [ ] `tests/e2e/solicitacoes-extras.spec.ts`; rotas; runbook §17; README.
- [ ] Verificação completa; PR `fase-15-solicitacoes` (base `fase-14-notificacoes` até o merge, depois `main`).
