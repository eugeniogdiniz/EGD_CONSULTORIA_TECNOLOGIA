# Fase 20 — Operação e robustez: plano de implementação

**Spec:** `docs/superpowers/specs/2026-10-03-fase-20-operacao-design.md`.

## Tasks
- [ ] T1 Erros: schema, `captureError` (fingerprint), `onRequestError`, página, resolver, notificação; migration.
- [ ] T2 Limite de taxa no banco: tabela, `createPgRateLimiter`, uso em contato/API/login.
- [ ] T3 Backup lógico: storage (list/delete/gzip), `runBackup`, retenção, job, notificação de falha, `scripts/restore-backup.mjs`.
- [ ] T4 Busca global: `searchAll`, página, caixa no topo.
- [ ] T5 Testes, rotas, runbook §22, README; PR `fase-20-operacao` (base `fase-19-crm-comercial`).
