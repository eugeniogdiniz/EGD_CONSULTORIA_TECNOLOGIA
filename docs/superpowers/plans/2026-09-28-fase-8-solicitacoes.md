# Fase 8 — Solicitações do cliente: Plano de Implementação

**Spec:** `docs/superpowers/specs/2026-09-28-fase-8-solicitacoes-design.md`.

- [x] Schema `portal_request` + `portal_request_message`, migration `0006`.
- [x] Puro `status.ts` (rótulos e transição por resposta) com testes.
- [x] Validação, queries (portal escopado por organização e admin), actions e form-actions.
- [x] E-mails: solicitação nova, resposta do cliente (equipe) e resposta da equipe (autor).
- [x] Portal: `/portal/solicitacoes` (lista), `/nova`, `/[id]` (conversa, resolver/reabrir); item na nav.
- [x] Admin: `/admin/solicitacoes` (lista com filtros), `/[id]` (conversa, responder, status); sidebar com contador; KPI no painel.
- [x] Integração (isolamento entre organizações, transições) e E2E (fluxo completo cliente ↔ equipe).
