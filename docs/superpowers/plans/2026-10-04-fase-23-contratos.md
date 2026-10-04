# Fase 23 — Contratos e termo de aceite: plano de implementação

**Spec:** `docs/superpowers/specs/2026-10-04-fase-23-contratos-design.md`.

## Tasks
- [ ] T1 Dados legais: chaves `legal.*` em settings + bloco em Configurações; campos legais em `crm_company` + formulário da empresa; migration.
- [ ] T2 Renderizador de blocos (`doc-pdf.ts`) + template do contrato (`template.ts`) + `contractFromProposal` (puro) + testes.
- [ ] T3 Contratos: schema, numeração, actions (criar, editar, gerar PDF, emitir, assinar), páginas admin, bloco na proposta, portal (baixar emitido).
- [ ] T4 Termo de aceite da entrega aprovada (`acceptance-pdf.ts`, ação, botão, arquivo na entrega).
- [ ] T5 Integração, E2E, rotas, runbook §25, README; PR `fase-23-contratos` (base `main`, depois do merge da 22).
