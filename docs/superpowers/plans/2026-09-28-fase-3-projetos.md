# Fase 3 — Projetos (fundação): Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development ou superpowers:executing-plans. Passos usam `- [ ]` pra rastreio.

**Goal:** Entregar a fundação de gestão de projetos dentro do admin — projeto criado a partir de oportunidade ganha, com fases, marcos, entregas e kanban.

**Architecture:** Novo módulo `src/modules/projects/` com o padrão já estabelecido (schema/validation/queries/actions/form-actions/components). Rotas em `src/app/(admin)/admin/projetos/*`. Sem novo pacote externo (não usa @dnd-kit — kanban via diálogo). Single-tenant admin (herda a exceção da Fase 2).

**Tech Stack:** Herdado. Nenhuma nova dependência.

**Spec:** `docs/superpowers/specs/2026-09-28-fase-3-projetos-design.md`.

## Global Constraints

- Toda rota `/admin/projetos/*` chama `await requireAdmin()`. Nenhuma chama `requirePortal()`.
- Módulo não importa `@/lib/db` fora de `queries.ts`/`actions.ts`. Páginas consomem só as duas camadas + `form-actions.ts`.
- Actions retornam `ActionResult<T>`. Auditoria segue `project.<entidade>.<verbo>` sem PII.
- Mockups são gate humano antes de código de UI.
- Uma branch: `fase-3-projetos`. Commits pequenos; mensagens terminam com `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.

## Review Focus (espelha spec §13)

1. 1:1 oportunidade↔projeto: unique constraint + interceptação `23505`; UI vira "Ver projeto" quando já existe.
2. `requireAdmin()` em toda rota; nenhuma tabela tem `organization_id`.
3. Deletar fase com entregas bloqueado; UI oferece mover antes.
4. Status `blocked` sem motivo bloqueado por Zod refine.
5. Kanban não importa `@/lib/db` direto.

---

## Mapa de arquivos

| Caminho | Responsabilidade |
|---------|------------------|
| `src/modules/projects/schema.ts` | 4 tabelas + 2 enums (spec §4). |
| `src/modules/projects/validation.ts` | Zod. |
| `src/modules/projects/reorder.ts` | `reorderPositions` puro. |
| `src/modules/projects/queries.ts` | Reads. |
| `src/modules/projects/actions.ts` | Server actions. |
| `src/modules/projects/form-actions.ts` | Wrappers useActionState. |
| `src/modules/projects/components/*` | project-form, phase-form, milestone-form, deliverable-form, kanban-column, status-picker. |
| `src/db/migrations/0002_projects.sql` | Enums, tabelas, índices. |
| `src/db/schema.ts` | Re-export do módulo projects. |
| `src/app/(admin)/admin/projetos/` | Rotas. |
| `src/app/(admin)/admin/crm/oportunidades/[id]/page.tsx` | Ganha bloco "Projeto" (botão criar / link). |
| `src/app/(admin)/layout.tsx` | Item "Projetos" na sidebar. |
| `docs/mockups/admin-projetos-*.html` | 4 mockups (gate humano). |
| `tests/{unit,integration,e2e}/projects/*` | Cobertura. |

---

### Task 1: Mockups + aprovação

**Files:**
- Create: `docs/mockups/admin-projetos-lista.html`, `admin-projeto-detalhe.html`, `admin-projeto-kanban.html`, `admin-projeto-criar.html`
- Create: screenshots correspondentes em `docs/mockups/screenshots/`

- [ ] **Step 1: `admin-projetos-lista.html`** — tabela de projetos (Título, Empresa, Status, Fases, Entregas abertas, Atualizado); tabs por status; busca; toggle "Mostrar arquivados"; EmptyState explicando que criação é a partir de oportunidade.
- [ ] **Step 2: `admin-projeto-detalhe.html`** — cabeçalho com status/dropdown/arquivar; sub-nav Visão geral · Kanban; duas colunas (2/3 fases + marcos + próximas entregas; 1/3 dados + notas).
- [ ] **Step 3: `admin-projeto-kanban.html`** — 5 colunas (A fazer, Em progresso, Revisão, Feita, Bloqueada colapsada); card com título, fase chip, assignee iniciais, due date destaque, marca de anexo. Sem drag.
- [ ] **Step 4: `admin-projeto-criar.html`** — modal disparado no detalhe da oportunidade Ganha. Título pré-preenchido, owner, checkbox "copiar valor da oportunidade".
- [ ] **Step 5: Screenshots via `google-chrome --headless=new --screenshot`** (mesma técnica das Fases 1 e 2) para todos os quatro.
- [ ] **Step 6: Aprovação humana.** Nada de código de UI antes do OK.

Commit único ao fim.

---

### Task 2: Migration + schema Drizzle

**Files:**
- Create: `src/modules/projects/schema.ts`
- Modify: `src/db/schema.ts` (re-export)
- Create: `src/db/migrations/0002_*.sql` (gerado + editado)

**Interfaces:** tabelas `project`, `projectPhase`, `projectMilestone`, `projectDeliverable`. Enums `projectStatus`, `projectDeliverableStatus`.

- [ ] **Step 1: Schema Drizzle** — implementa as 4 tabelas conforme spec §4.2. Uniqueness em `project.opportunityId`; `on delete restrict` no FK pra `crm_opportunity` e `crm_company`; `on delete cascade` do project pra phase/milestone/deliverable; `on delete set null` de phase pra deliverable/milestone e de file pra deliverable.
- [ ] **Step 2: Re-export** em `src/db/schema.ts`.
- [ ] **Step 3: `npm run db:generate`** e editar migration se preciso (nenhuma extensão nova; nenhuma função stored). Verificar ordem das foreign keys.
- [ ] **Step 4: `npm run db:migrate`** contra o compose. Confirmar `\dt project*` e `\d+ project`; verificar unique em `opportunity_id`.
- [ ] **Step 5: Typecheck + testes existentes verdes.**
- [ ] **Step 6: Commit.**

---

### Task 3: Validação e reordenação (TDD)

**Files:**
- Create: `src/modules/projects/validation.ts`, `src/modules/projects/reorder.ts`
- Create: `tests/unit/projects/validation.test.ts`, `tests/unit/projects/reorder.test.ts`

**Interfaces:**
- `projectSchema`, `phaseSchema`, `milestoneSchema`, `deliverableSchema`, `changeProjectStatusSchema`, `changeDeliverableStatusSchema` (com refine que exige `blockReason` quando `to === "blocked"`).
- `reorderPositions<T extends { id: string; position: number }>(items: T[], movedId: string, direction: "up" | "down"): T[]` — puro; devolve nova lista com posições 0..n-1 renumeradas.

- [ ] **Step 1: Testes falhando** — CNPJ n/a aqui; foco em: título curto rejeitado, `dueAt` obrigatória em marco, `blocked` sem motivo rejeitado, `position` negativa rejeitada. `reorderPositions` cobre: mover primeiro pra cima é no-op; mover último pra baixo é no-op; posições ficam 0..n-1; ids únicos preservados.
- [ ] **Step 2: Implementar.**
- [ ] **Step 3: Commit.**

---

### Task 4: Queries do módulo Projects

**Files:**
- Create: `src/modules/projects/queries.ts`
- Create: `tests/integration/projects/queries.test.ts`

**Interfaces:**
- `listProjects(ctx, { status?, search?, includeArchived? })`.
- `getProject(ctx, id)` (com joins em company e opportunity).
- `listPhases(ctx, projectId)` (ordenadas por position).
- `listMilestones(ctx, projectId, { onlyPending? })`.
- `listDeliverables(ctx, projectId, { phaseId?, assigneeId?, status? })`.
- `listDeliverablesGroupedByStatus(ctx, projectId, filters)` — colunas do kanban.
- `upcomingDeliverables(ctx, projectId, limit)` — 5 próximas por `dueAt`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Testes de integração** com fixtures (1 projeto + 3 fases + 4 marcos + 6 entregas em status variados).
- [ ] **Step 3: Commit.**

---

### Task 5: Actions de projeto

**Files:**
- Create: `src/modules/projects/actions.ts` (parcial)
- Create: `src/modules/projects/form-actions.ts` (parcial)
- Create: `tests/integration/projects/project.test.ts`

**Interfaces:**
- `createProjectFromOpportunity(ctx, opportunityId, input): Promise<ActionResult<{ id: string }>>` — verifica `stage=won`, cria em transação, intercepta `23505` no unique de `opportunity_id`.
- `updateProject(ctx, id, input)`.
- `changeProjectStatus(ctx, id, { to })` — `delivered`/`cancelled` grava `endedAt`; reabrir zera.
- `archiveProject`, `unarchiveProject`.

- [ ] **Step 1: Actions.**
- [ ] **Step 2: `form-actions.ts`** wrappers para as três acima.
- [ ] **Step 3: Testes de integração** cobrem: criação a partir de won (ok); a partir de qualified (fail); segunda criação (fail citando o existente); status delivered grava `endedAt`, reabrir zera.
- [ ] **Step 4: Commit.**

---

### Task 6: Actions de fase

**Files:**
- Modify: `src/modules/projects/actions.ts`, `form-actions.ts`
- Create: `tests/integration/projects/phase.test.ts`

**Interfaces:**
- `createPhase(ctx, input)` — próxima `position` = `count(*) where projectId = X`.
- `updatePhase(ctx, id, input)`.
- `movePhase(ctx, id, direction: "up" | "down")` — usa `reorderPositions`; renumera em transação.
- `deletePhase(ctx, id)` — falha se houver entregas apontando; UI oferece mover antes.

- [ ] **Step 1: Actions.**
- [ ] **Step 2: Testes de integração** — reorder mantém `position` estável e única; delete com entrega bloqueia; delete sem entrega passa.
- [ ] **Step 3: Commit.**

---

### Task 7: Actions de marco

**Files:**
- Modify: `src/modules/projects/actions.ts`, `form-actions.ts`
- Create: `tests/integration/projects/milestone.test.ts`

**Interfaces:**
- `createMilestone(ctx, input)`, `updateMilestone(ctx, id, input)`, `deleteMilestone(ctx, id)`.
- `completeMilestone(ctx, id)` — grava `completedAt = now()`.
- `uncompleteMilestone(ctx, id)` — zera.

- [ ] **Step 1: Actions + testes** cobrem completar, descompletar, marco sem `dueAt` recusa.
- [ ] **Step 2: Commit.**

---

### Task 8: Actions de entrega

**Files:**
- Modify: `src/modules/projects/actions.ts`, `form-actions.ts`
- Create: `tests/integration/projects/deliverable.test.ts`

**Interfaces:**
- `createDeliverable(ctx, input)` — próxima `position` na coluna `todo`.
- `updateDeliverable(ctx, id, input)`.
- `changeDeliverableStatus(ctx, id, { to, blockReason? })` — Zod refine exige `blockReason` em `blocked`; grava/zera `completedAt` em `done`.
- `assignDeliverable(ctx, id, userId)` — pode ser null.
- `attachDeliverableFile(ctx, id, formData)` — delega ao `files.uploadFile`.
- `deleteDeliverable(ctx, id)`.

- [ ] **Step 1: Actions.**
- [ ] **Step 2: Testes** cobrem: criar fica na coluna `todo`; `todo → done` grava completedAt; `→ blocked` sem reason falha; `blocked → doing` limpa; anexar arquivo grava fileId; deletar arquivo faz set null.
- [ ] **Step 3: Commit.**

---

### Task 9: Sidebar + layout + lista de projetos

**Files:**
- Modify: `src/app/(admin)/layout.tsx` (item "Projetos" no nav)
- Create: `src/app/(admin)/admin/projetos/page.tsx`
- Create: `src/app/(admin)/admin/projetos/layout.tsx` (só `requireAdmin()` mais o children)

- [ ] **Step 1: Item na sidebar** — na posição spec §6.5 (entre Organizações e Leads).
- [ ] **Step 2: Lista** com tabs por status, busca, toggle arquivados, EmptyState explicando que criação é a partir de oportunidade.
- [ ] **Step 3: Commit.**

---

### Task 10: Detalhe do projeto (Visão geral)

**Files:**
- Create: `src/app/(admin)/admin/projetos/[id]/layout.tsx` (abas)
- Create: `src/app/(admin)/admin/projetos/[id]/page.tsx` (visão geral)
- Create: `src/app/(admin)/admin/projetos/[id]/editar/page.tsx`
- Create: `src/modules/projects/components/project-form.tsx`, `phase-form.tsx`, `milestone-form.tsx`
- Create: `src/app/(admin)/admin/projetos/[id]/_components/tabs.tsx`

- [ ] **Step 1: Tabs** Visão geral · Kanban.
- [ ] **Step 2: Visão geral** — duas colunas conforme spec §6.2. Fases com botões reordenar (up/down). Marcos com checkbox concluir/descompletar (via form submit). Próximas entregas com link pro kanban.
- [ ] **Step 3: Editar** reusa `ProjectForm`.
- [ ] **Step 4: Diálogos** de fase e marco (padrão dos diálogos do CRM).
- [ ] **Step 5: Commit.**

---

### Task 11: Kanban + diálogo de entrega

**Files:**
- Create: `src/app/(admin)/admin/projetos/[id]/kanban/page.tsx`
- Create: `src/modules/projects/components/kanban-column.tsx`, `deliverable-form.tsx`, `status-picker.tsx`

- [ ] **Step 1: Kanban** — cinco colunas; coluna `blocked` colapsada por default; filtros de fase e assignee no topo; ícone de anexo se `fileId` presente.
- [ ] **Step 2: DeliverableFormDialog** — modal criar/editar com status picker embutido; se `to = blocked`, mostra campo obrigatório `blockReason` (join no `description` no submit).
- [ ] **Step 3: Clique em card abre o diálogo** — sem drag.
- [ ] **Step 4: Commit.**

---

### Task 12: Botão "Criar projeto" no detalhe da oportunidade

**Files:**
- Modify: `src/app/(admin)/admin/crm/oportunidades/[id]/page.tsx`
- Create: `src/modules/projects/components/create-project-dialog.tsx`

- [ ] **Step 1: Detectar** existência de projeto (nova query `getProjectByOpportunity`) no server component.
- [ ] **Step 2: Bloco "Projeto"** no detalhe — se não existe e stage=won, botão "Criar projeto" abre diálogo; se existe, link "Ver projeto" com título e status.
- [ ] **Step 3: Diálogo simples** — título, owner, checkbox "copiar valor". Submit chama `createProjectFromOpportunityForm` e redireciona pro detalhe do projeto.
- [ ] **Step 4: Commit.**

---

### Task 13: E2E + fechamento

**Files:**
- Create: `tests/e2e/projects.spec.ts`

- [ ] **Step 1: Happy path e2e** — admin cria oportunidade → move para won → clica "Criar projeto" → adiciona fase, marco e entrega → abre kanban → muda status via diálogo → marca feita.
- [ ] **Step 2: Autorização** — `/admin/projetos` sem sessão redireciona.
- [ ] **Step 3: Suite completa** `lint && typecheck && test && test:integration && test:e2e`.
- [ ] **Step 4: Abrir PR** único `fase-3-projetos → main` com checklist de Review Focus. Descrição termina com:

  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  ```

---

## Ordem de execução

1. Task 1 (mockups) — gate humano.
2. Task 2 (migration) — bloqueia tudo.
3. Task 3 (validation + reorder) — bloqueia queries e actions.
4. Task 4 (queries) → Tasks 5–8 (actions em sequência: projeto, fase, marco, entrega).
5. Task 9 (sidebar + lista) pode ir em paralelo com 5–8.
6. Task 10 (detalhe) → Task 11 (kanban) → Task 12 (botão na oportunidade).
7. Task 13 (e2e + PR) fecha.
