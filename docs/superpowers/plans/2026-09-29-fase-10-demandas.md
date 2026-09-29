# Fase 10 — Demandas e priorização: plano

**Spec:** `docs/superpowers/specs/2026-09-29-fases-10-12-gestao-design.md`.

- [x] Schema: `work_priority`, `project_deliverable.priority`, `portal_request.priority`, `portal_request.deliverable_id`; migration `0008`.
- [x] Puro `priority.ts` (rótulos, rank, ordenação do backlog) + testes.
- [x] Validação e ações: prioridade na entrega (criar/editar/mudar) e na solicitação; `convertRequestToDeliverable`.
- [x] Query `listBacklog` (entre projetos, com filtros).
- [x] UI: selo e seletor de prioridade (kanban, diálogo, detalhe); `/admin/demandas` (lista e quadro); triagem e conversão em `/admin/solicitacoes/[id]`; vínculo visível no portal; sidebar e KPI.
- [x] Integração e E2E.
