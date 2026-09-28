# Fase 4 — Portal do cliente vê projetos: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development ou superpowers:executing-plans. Passos usam `- [ ]` pra rastreio.

**Goal:** Cliente logado no portal enxerga os projetos da própria organização (visão geral, Gantt, calendário, entregas visíveis), baixa arquivos e comenta.

**Architecture:** Nova coluna `crm_company.organization_id`. Novo módulo `src/modules/portal-projects/` (queries + actions + form-actions) que recebe `PortalContext`. Rotas em `src/app/(portal)/portal/projetos/*`. Reusa funções puras `buildGanttGeometry` e `buildMonthGrid` e o `CommentThread` da 3.5. Sem nova dependência.

**Spec:** `docs/superpowers/specs/2026-09-28-fase-4-portal-projetos-design.md`.

## Global Constraints

- Toda página do portal chama `await requirePortal()`. Nenhuma chama `requireAdmin()`.
- Toda query do portal filtra por `organizationId = ctx.organization.id` (via company). Sem exceção.
- `visibleToClient = false` nunca sai do servidor pro portal.
- Cliente nunca recebe `blockReason`, custos, horas, dependências ou propostas.
- Módulo não importa `@/lib/db` fora de `queries.ts`/`actions.ts`.
- Actions retornam `ActionResult<T>`. Auditoria `portal.<entidade>.<verbo>` com `organizationId` no metadata.
- Mockups são gate humano antes de código de UI (lista, visão geral, detalhe da entrega).
- Uma branch: `fase-4-portal-projetos`. Commits pequenos, terminados com o `Co-Authored-By` vigente.

## Review Focus (espelha spec §9)

1. Nenhuma query do portal sem `organizationId` no where.
2. `visibleToClient = false` ausente em Gantt, calendário e detalhe.
3. Download valida cadeia file → entrega visível → projeto → company → organização.
4. Comentário do cliente respeita 2 níveis; edita/apaga só o próprio.
5. Nenhum dado financeiro/interno vaza.

---

## Mapa de arquivos

| Caminho | Responsabilidade |
|---------|------------------|
| `src/modules/crm/schema.ts` | +`organizationId` em `crm_company`. |
| `src/db/migrations/0004_*.sql` | coluna + índice. |
| `src/modules/crm/actions.ts` / `form-actions.ts` | `linkCompanyToOrganization`, `unlinkCompany`. |
| `src/modules/portal-projects/scope.ts` | puro: `isDeliverableVisible`, `portalStatusLabel`, `summarizeProject`. |
| `src/modules/portal-projects/queries.ts` | queries escopadas por org. |
| `src/modules/portal-projects/actions.ts` | comentários do cliente. |
| `src/modules/portal-projects/form-actions.ts` | wrappers. |
| `src/app/(portal)/portal/projetos/**` | lista, visão geral, gantt, calendário, entrega, download. |
| `src/app/(portal)/layout.tsx` | item "Projetos" na nav. |
| `tests/{unit,integration,e2e}` | cobertura. |

---

### Task 1: Mockups (lista, visão geral, detalhe da entrega no portal)

**Files:** `docs/mockups/portal-projetos-lista.html`, `portal-projeto-detalhe.html`, `portal-projeto-entrega.html`. Screenshots.

- [ ] Um HTML por tela, usando `tokens.css`/`mockup.css` e o shell do portal.
- [ ] Screenshots.
- [ ] Aprovação humana.

### Task 2: Migration + vínculo company↔org

**Files:** `src/modules/crm/schema.ts`, `src/db/migrations/0004_*.sql`.

- [ ] Adicionar `organizationId` (nullable, `on delete set null`) e índice.
- [ ] `db:generate`, `db:migrate`, conferir coluna e índice.

### Task 3: Actions e UI admin de vínculo

`linkCompanyToOrganization` / `unlinkCompany` (audit `crm.company.linked_to_org`). Dialog em `/admin/crm/empresas/[id]`; bloco "Empresas vinculadas" em `/admin/organizacoes/[id]`.

### Task 4: Puros do escopo do portal (TDD)

`scope.ts`: `isDeliverableVisible`, `portalStatusLabel` (blocked → "Em espera"), `summarizeProject`. Testes unit.

### Task 5: Queries do portal

`listPortalProjects`, `getPortalProject`, `listPortalPhases`, `listPortalMilestones`, `listPortalDeliverables` (só visíveis), `getPortalDeliverable`, `listPortalComments`. Todas recebem `PortalContext`.

### Task 6: Actions de comentário do cliente

`createClientComment`, `updateClientComment`, `deleteClientComment`. Valida cadeia de visibilidade antes de gravar. Audit `portal.comment.*`.

### Task 7: Nav + lista `/portal/projetos`

Item na nav do portal; página de lista com empty state.

### Task 8: Visão geral `/portal/projetos/[id]` + tabs

Fases com progresso, marcos, próximas entregas visíveis. `notFound()` fora do escopo. Audit `portal.project.viewed`.

### Task 9: Gantt e calendário do portal

Reusam geometria/grid puros; só entregas visíveis; sem dependências; escala week|month.

### Task 10: Detalhe da entrega + download + comentários

Página com `CommentThread` adaptado; rota `POST .../baixar` validando a cadeia inteira. Audit `portal.file.downloaded`.

### Task 11: Testes de isolamento

Integration: 2 orgs, 2 projetos; cliente A não vê B (lista, detalhe, download, comentário). Unit dos puros.

### Task 12: E2E + PR

Fluxo cliente: vê projeto, baixa arquivo, comenta; admin vê o comentário. Suite verde. PR único.

---

## Ordem de execução

1. Task 1 (mockups) — gate humano.
2. Tasks 2 → 3 (schema e vínculo).
3. Task 4 → 5 → 6 (puros, queries, actions).
4. Tasks 7-10 (páginas).
5. Task 11 (isolamento) → Task 12 (E2E + PR).
