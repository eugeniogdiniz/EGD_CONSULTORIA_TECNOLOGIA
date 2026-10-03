# Fase 14 — Notificações: plano de implementação

**Goal:** Central de notificações para admin e cliente (sino, página, abrir-e-marcar-lida) e preferências por pessoa do que também chega por e-mail, substituindo os e-mails soltos de hoje por um disparo único.

**Architecture:** Módulo `src/modules/notifications/` com tabela por destinatário, lista fechada de tipos, `notify()` chamado pelas actions, queries por usuário e componentes do shell. Templates novos em `mail/templates.ts`. Automação de limpeza no registry da Fase 13.

**Spec:** `docs/superpowers/specs/2026-10-03-fase-14-notificacoes-design.md`.

## Global Constraints

- Sem dependências novas.
- `notify()` nunca lança; falha de e-mail não quebra a action.
- Sem linha de preferência = e-mail ligado. Tipo não e-mailável nunca manda e-mail.
- Cliente só é notificado de item visível/compartilhado da própria organização; inativos nunca.
- Quem causou o evento não recebe a própria notificação.
- Rotas novas entram em `acessibilidade.spec.ts` e `console-limpo.spec.ts`.

## Tasks

### Task 1: Schema, tipos e migration
- [ ] `schema.ts`, `kinds.ts`, `src/db/schema.ts`, migration `0012_notifications.sql` (`npm run db:generate` + revisar).
- [ ] `tests/unit/notifications/kinds.test.ts`.

### Task 2: Destinatários, notify e queries
- [ ] `recipients.ts`, `notify.ts` (com `pickEmailRecipients` puro), `queries.ts`, `actions.ts`, `form-actions.ts`.
- [ ] Testes unitários do puro; integração `tests/integration/notifications/notify.test.ts`.

### Task 3: Ganchos nas actions
- [ ] Solicitações (criar, resposta do cliente, resposta da equipe, conversão), comentário do cliente, lead (site e API), comentário da equipe, entrega concluída, ata compartilhada, proposta expirada.
- [ ] Templates novos; `send.ts` exporta `sendMail(to, content)` genérico para o `notify`.
- [ ] Integração: escopo do comentário da equipe e da entrega concluída.

### Task 4: Shell e páginas
- [ ] `AppShell` slot `bell`; `NotificationBell`; layouts admin e portal carregam contagem e recentes.
- [ ] `/admin/notificacoes`, `/portal/notificacoes` e rotas `[id]/abrir`.
- [ ] Preferências em `/admin/conta` e `/portal/conta`.

### Task 5: Limpeza e automação
- [ ] `cleanup.ts` + job `notificacoes-limpar` no registry (daily 03:00) com `preview` em tabela.

### Task 6: E2E, docs, PR
- [ ] `tests/e2e/notificacoes.spec.ts`; rotas em acessibilidade e console-limpo.
- [ ] Runbook seção 16; README (linha na arquitetura).
- [ ] `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run test:e2e`; PR `fase-14-notificacoes` → `main`.
