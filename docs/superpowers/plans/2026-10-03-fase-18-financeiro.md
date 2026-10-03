# Fase 18 — Financeiro: plano de implementação

**Spec:** `docs/superpowers/specs/2026-10-03-fase-18-financeiro-design.md`.

## Tasks
- [ ] T1 Puros: `invoices.ts`, `burndown.ts`, `reports/hours.ts` + testes.
- [ ] T2 Schema e migration `0016_finance.sql` (invoice, rate, rate_cents, estimate_minutes).
- [ ] T3 Actions e queries: parcelas, rate do projeto, snapshot nas entradas, custos com coalesce, horas por pessoa, receivables.
- [ ] T4 Telas: financeiro (faturamento, rates, estimado × apontado), burndown, relatório de horas + CSV, estimativa no diálogo da entrega, KPI do painel.
- [ ] T5 Automação `parcelas-vencidas`, notificação `invoice.overdue`, seção Financeiro do resumo diário.
- [ ] T6 Integração, E2E, rotas, runbook §20, README; PR `fase-18-financeiro` (base `fase-17-equipe`).
