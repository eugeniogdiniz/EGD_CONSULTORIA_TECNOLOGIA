# Fase 3.5 — Projetos (extras): Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Passos usam `- [ ]` pra rastreio.

**Goal:** Entregar as 8 extensões do módulo Projects em um PR único: dependências, comentários, drag-drop kanban, Gantt, calendário mensal, horas, financeiro, templates.

**Architecture:** Estende `src/modules/projects/`. Novo pacote `@dnd-kit/core` + `@dnd-kit/sortable` (kanban). Sem outras deps externas — Gantt em SVG puro, calendário em HTML puro, timer server-tracked.

**Tech Stack:** Herdado + `@dnd-kit/core@^6`, `@dnd-kit/sortable@^8`.

**Spec:** `docs/superpowers/specs/2026-09-28-fase-3-5-projetos-extras-design.md`.

## Global Constraints

- Toda rota `/admin/projetos/*` chama `await requireAdmin()`. Mesmo pra novas rotas.
- Módulo não importa `@/lib/db` fora de `queries.ts`/`actions.ts`.
- Actions retornam `ActionResult<T>`. Auditoria segue `project.<entidade>.<verbo>`.
- Timer é server-tracked; nenhum estado importante mora no cliente.
- Mockups são gate humano só pra Gantt, calendário e detalhe da entrega — os outros são incrementos do que já existe (kanban ganha drag).
- Uma branch: `fase-3-5-projetos` (baseada em `fase-3-projetos`, rebasear em `main` após PR #4 mergear).

## Review Focus (espelha spec §13)

1. Ciclo de dependência bloqueado por `detectDependencyCycle` + fail claro.
2. Um timer aberto por usuário — unique parcial + start fecha aberto antes de abrir novo.
3. Comentário-neto bloqueado por trigger + action intercepta.
4. Financeiro: números conferem com soma direta de time_entries + expenses vs. dashboard.
5. Drag-drop preserva `position` (two-pass) e não duplica.

---

## Mapa de arquivos (novos)

| Caminho | Responsabilidade |
|---------|------------------|
| `src/modules/projects/schema-extras.ts` | 6 tabelas + 2 enums novos. |
| `src/modules/projects/dependency.ts` | `detectDependencyCycle` puro. |
| `src/modules/projects/time-math.ts` | `computeMinutes`, `computeFinancials` puros. |
| `src/modules/projects/gantt-geometry.ts` | `buildGanttGeometry` puro. |
| `src/modules/projects/month-grid.ts` | `buildMonthGrid` puro. |
| `src/modules/projects/validation.ts` | +schemas dos 8 domínios. |
| `src/modules/projects/queries.ts` | +queries dos 8 domínios. |
| `src/modules/projects/actions.ts` | +actions dos 8 domínios. |
| `src/modules/projects/form-actions.ts` | +wrappers. |
| `src/modules/projects/components/kanban-board.tsx` | client, @dnd-kit. |
| `src/modules/projects/components/timer-panel.tsx` | client, start/stop. |
| `src/modules/projects/components/time-entry-form.tsx` | dialog manual. |
| `src/modules/projects/components/expense-form.tsx` | dialog. |
| `src/modules/projects/components/comment-thread.tsx` | client thread. |
| `src/modules/projects/components/dependency-picker.tsx` | seletor no DeliverableFormDialog. |
| `src/modules/projects/components/template-form.tsx` | dialog salvar-como-template. |
| `src/modules/projects/components/template-picker.tsx` | dropdown no CreateProjectDialog. |
| `src/app/(admin)/admin/projetos/[id]/gantt/page.tsx` | Gantt SVG. |
| `src/app/(admin)/admin/projetos/[id]/calendario/page.tsx` | calendário. |
| `src/app/(admin)/admin/projetos/[id]/financeiro/page.tsx` | financeiro. |
| `src/app/(admin)/admin/projetos/[id]/entregas/[deliverableId]/page.tsx` | detalhe da entrega. |
| `src/app/(admin)/admin/projetos/templates/page.tsx` | lista templates. |
| `src/app/(admin)/admin/projetos/templates/[id]/page.tsx` | detalhe read-only. |
| `src/db/migrations/0003_*.sql` | migration. |
| `tests/{unit,integration,e2e}/projects/*-extras.test.ts` | cobertura. |

---

### Task 1: Mockups (Gantt, calendário, detalhe entrega, financeiro, templates)

**Files:** `docs/mockups/admin-projeto-gantt.html`, `admin-projeto-calendario.html`, `admin-projeto-entrega.html`, `admin-projeto-financeiro.html`, `admin-projetos-templates.html`. Screenshots.

- [ ] **Step 1-5**: um HTML por tela.
- [ ] **Step 6**: screenshots.
- [ ] **Step 7**: aprovação humana.

---

### Task 2: Migration + schema-extras

**Files:** `src/modules/projects/schema-extras.ts`, `src/db/schema.ts` (re-export), alteração em `src/modules/auth/schema.ts` (coluna hourly_rate_cents), `src/db/migrations/0003_*.sql` (com trigger de comment-neto).

- [ ] **Step 1**: Escrever schema-extras.
- [ ] **Step 2**: Adicionar `hourlyRateCents` a `users`.
- [ ] **Step 3**: `db:generate` + editar migration pra adicionar trigger SQL puro.
- [ ] **Step 4**: `db:migrate`; verificar tables, unique parcial, trigger.

---

### Task 3: Utilitários puros (TDD)

**Files:** `dependency.ts`, `time-math.ts`, `gantt-geometry.ts`, `month-grid.ts`, testes unit.

- [ ] `detectDependencyCycle(edges, from, to): boolean`.
- [ ] `computeMinutes(start, end): number` (ceil).
- [ ] `computeFinancials(input)` puro.
- [ ] `buildGanttGeometry({ items, from, to, scale })`.
- [ ] `buildMonthGrid(ym): { weeks[][], month, year }`.
- Testes cobrem: ciclo simples/complexo, minutos ceil, financeiro com/sem rate, geometry alinhamento, grid overflow.

---

### Task 4: Validação Zod dos 8 domínios

Todos os schemas em `validation.ts`.

---

### Task 5: Queries dos 8 domínios

`listDependencies`, `listPredecessors`, `listComments`, `listTimeEntries`, `getOpenTimer`, `getProjectFinancials`, `listExpenses`, `listTemplates`, `getTemplate`, `listTemplatePhases`, `listTemplateDeliverables`.

---

### Task 6: Actions de dependência e comentário

`createDependency` (com detectCycle), `deleteDependency`; `createComment`, `updateComment`, `deleteComment` (soft).

---

### Task 7: Actions de timer + entrada manual

`startTimer` (fecha aberto anterior), `stopTimer`, `logManualTime`, `deleteTimeEntry`.

---

### Task 8: Actions de despesa

`createExpense`, `updateExpense`, `deleteExpense`.

---

### Task 9: Actions de template + criação de projeto por template

`createTemplateFromProject` (snapshota), `updateTemplate` (nome/descrição), `deleteTemplate`, ampliação de `createProjectFromOpportunity` pra aceitar `templateId`.

---

### Task 10: Actions de reorder de entrega (kanban drag)

`reorderDeliverable` (two-pass position, respeita colun    a de status).

---

### Task 11: KanbanBoard client component com @dnd-kit

Instalar `@dnd-kit/core` e `@dnd-kit/sortable`. Reescrever a página `/admin/projetos/[id]/kanban` pra usar KanbanBoard com fallback do diálogo. Drop em blocked pede motivo antes de commitar.

---

### Task 12: Página do Gantt

`/admin/projetos/[id]/gantt` + `gantt-geometry.ts`. SVG puro com barras de fase e entrega + linhas de dependência.

---

### Task 13: Página do calendário

`/admin/projetos/[id]/calendario` + `month-grid.ts`. Grid HTML 7x6 com marcos e entregas por dia. Navegação por mês.

---

### Task 14: Detalhe da entrega + TimerPanel + CommentThread + DependencyPicker

Nova página `/admin/projetos/[id]/entregas/[deliverableId]` com bloco de dependências, bloco de horas (Timer + entradas + form manual) e thread de comentários.

---

### Task 15: Página do financeiro

`/admin/projetos/[id]/financeiro`. 4 cotas + tabelas de horas por entrega, despesas, propostas.

---

### Task 16: Página de templates + integração no CreateProjectDialog

`/admin/projetos/templates` lista, `/[id]` detalhe. Dropdown no CreateProjectDialog. Botão "Salvar como template" no detalhe do projeto.

---

### Task 17: Ampliar ProjectTabs

Novas abas Gantt · Calendário · Financeiro; adicionar item flat "Templates" na sidebar admin (sub-item do grupo CRM? não — item próprio abaixo de Projetos).

---

### Task 18: Coluna `hourly_rate_cents` em `/admin/conta`

Adicionar campo Rate por hora (cents BRL) na página de conta. Action `updateAccountRate`.

---

### Task 19: E2E happy paths + PR final

Timer flow, drag-drop, template flow. Suite completa verde. PR único.

---

## Ordem de execução

1. Tasks 1 (mockups) — gate humano.
2. Task 2 (migration) — bloqueia backend.
3. Task 3 (utilitários puros) — bloqueia queries/actions.
4. Task 4 (validação) → Task 5 (queries) → Tasks 6-10 (actions em paralelo por domínio).
5. Task 11 (KanbanBoard) e Task 17 (tabs) podem ir em paralelo com 12-16.
6. Tasks 12-16 (páginas).
7. Task 18 (rate em conta).
8. Task 19 (e2e + PR).
