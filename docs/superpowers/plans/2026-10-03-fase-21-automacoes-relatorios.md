# Fase 21 — Automações e relatórios: plano de implementação

**Spec:** `docs/superpowers/specs/2026-10-03-fase-21-automacoes-relatorios-design.md`.

## Tasks
- [ ] T1 Horário por automação (schema, `isDue`/`nextRunAt` com sobrescrita, tela) e backoff no `decideClaim`; testes.
- [ ] T2 Webhooks de saída: schema, assinatura, fila, entrega no tique, actions, tela (aba em /admin/api), notificação de desativação; testes com servidor local.
- [ ] T3 Chaves de API: `expires_at`, rotação, aviso de expiração; testes.
- [ ] T4 Comparação entre períodos: snapshot diário, Δ no semanal e no portfólio; testes.
- [ ] T5 E2E, rotas, runbook §23, README; PR `fase-21-automacoes-relatorios` (base `fase-20-operacao`).
