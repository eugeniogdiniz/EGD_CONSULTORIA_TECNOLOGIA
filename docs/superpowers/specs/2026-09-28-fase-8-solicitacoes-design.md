# EGD Consultoria & Tecnologia — Fase 8: Solicitações do cliente

**Data:** 2026-09-28
**Status:** implementada (branch `fase-8-solicitacoes`, baseada em `e2e-banco-isolado`)
**Depende de:** Fase 1 (tenancy), Fase 4 (portal e projetos).

## 1. Objetivo
O cliente abre uma solicitação pelo portal (dúvida, pedido de mudança, problema), acompanha o histórico e conversa com a equipe; a equipe responde e muda o status no admin. Ambos são avisados por e-mail.

## 2. Decisões

| Decisão | Escolha | Descartado |
|---------|---------|------------|
| Modelo | `portal_request` (organização, projeto opcional, autor, título, texto, status) + `portal_request_message` (respostas). O texto inicial fica na própria solicitação. | Reaproveitar comentários de entrega (são por entrega e 2 níveis; aqui é uma conversa linear). |
| Escopo | Por **organização**: qualquer membro vê e responde às solicitações da organização ativa. | Só o autor (perde o histórico quando quem abriu sai). |
| Projeto | Opcional; se informado, precisa ser projeto visível à organização (mesma cadeia da Fase 4). Se o projeto for excluído, a solicitação permanece (`on delete set null`). | Obrigatório. |
| Status | `open` → `in_progress` → `resolved`. Resposta da equipe em `open` vira `in_progress`; resposta do cliente em `resolved` reabre (`open`); o cliente pode marcar como resolvida; a equipe muda para qualquer status. Regra em função pura. | Fluxo com prioridades, SLA e responsável (fica para depois). |
| Avisos | E-mail à equipe (`ADMIN_NOTIFY_EMAIL`) em solicitação nova e em resposta do cliente; e-mail ao autor quando a equipe responde. `deliver` nunca lança. | Central de notificações in-app. |
| Painel | KPI "Solicitações abertas" e item na sidebar do admin com contador. | — |
| Auditoria | `portal.request.created/replied/resolved`, `request.replied`, `request.status_changed`, com `organizationId`. | — |

## 3. Fora do escopo
Anexos, prioridade, SLA, atribuição a responsável, mensagens internas (visíveis só à equipe), tempo real.
