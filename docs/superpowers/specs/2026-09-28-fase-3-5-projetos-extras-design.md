# EGD Consultoria & Tecnologia — Fase 3.5: Projetos (extras)

**Data:** 2026-09-28
**Status:** rascunho para aprovação (branch de trabalho: `fase-3-5-projetos`, baseada em `fase-3-projetos` até PR #4 mergear)
**Escopo:** oito extensões que a Fase 3 deferiu — em um PR só, por pedido.
**Depende de:** Fase 3 (spec `docs/superpowers/specs/2026-09-28-fase-3-projetos-design.md`).

---

## 1. Contexto e objetivo

A Fase 3 entregou a fundação: projetos 1:1 com oportunidades ganhas, fases livres, marcos, entregas em kanban de 5 colunas, tudo admin-only. **A Fase 3.5 acopla oito extensões** que fecham o ciclo operacional (o dono consegue planejar visualmente, medir tempo, saber margem, replicar projetos) sem mudar as regras da Fase 3:

1. **Dependências entre entregas** — grafo direto de precedência (entrega X depende de Y).
2. **Comentários por entrega** — thread simples de 2 níveis por deliverable.
3. **Drag-and-drop no kanban** — mudar status/ordem pela grade, complementando o diálogo.
4. **Gráfico de Gantt** — timeline visual das fases e entregas, com linhas de dependência.
5. **Calendário mensal por projeto** — grid mensal com marcos e entregas por dia.
6. **Registro de horas** — timer server-tracked por entrega + entradas manuais + hourlyRate por usuário.
7. **Financeiro do projeto** — orçamento vs. custo real (horas × rate + despesas) + receita (propostas aceitas).
8. **Templates de projeto** — snapshot de fases + entregas; criar projeto a partir de template.

Continua tudo admin-only. Nenhuma coluna nova é exposta ao portal do cliente na Fase 3.5 (Fase 4 fica dona disso).

### 1.1 O que a Fase 3.5 NÃO inclui (ficou nomeado no diálogo com o dono)

- **Notificações** (portal ou e-mail) — corte explícito da lista original.
- **Gantt com edição direta** — timeline é read-only na 3.5; edição pelo diálogo da entrega.
- **Timer com relógio contínuo no navegador** — server-tracked. UI mostra "iniciado há X" e recalcula no reload.
- **Múltiplos rates por usuário** (rate por projeto ou por período). Um rate por usuário, aplicado em novas entradas.
- **Faturamento real** (nota fiscal, integração contábil). Receita = soma de propostas aceitas; não emite documento.
- **Templates aninhados** ou herança. Um projeto vira um template raso; templates não referenciam outros templates.
- **Dependências polimórficas** (entrega → marco, fase → fase). Só entrega → entrega.
- **Comentários com markdown / anexos por comentário** — texto puro com quebra de linha; anexo continua na entrega.
- **Reordenação de colunas do kanban** ou colunas customizáveis. Segue as 5 fixas.

### 1.2 Roadmap atualizado

| Fase | Entrega | Depende |
|------|---------|---------|
| 1 | Fundação | — |
| 2 | CRM | 1 |
| 3 | Projetos (fundação) | 2 |
| **3.5** | **Projetos (extras): deps, comments, drag, Gantt, calendário, horas, financeiro, templates** | **3** |
| 4 | Portal do cliente vê projetos | 3 (usa `visible_to_client`) |
| 5 | Cases e conteúdo do site | 1 |
| 6 | APIs e webhooks | 2, 5 |

---

## 2. Decisões de arquitetura

| Decisão | Escolha | Alternativas descartadas |
|---------|---------|--------------------------|
| Dependências | Tabela `project_deliverable_dependency (predecessor_id, successor_id)` PK composta; ambos FK cascade. | Coluna array em deliverable (não indexável bem); grafo genérico entidade↔entidade (over-engineering). |
| Detecção de ciclo | Aplicação: `createDependency` faz BFS no grafo antes de inserir; se ciclo, `fail("Dependência criaria ciclo.")`. | Nenhuma checagem (permite ciclos → Gantt entra em loop); trigger Postgres (portabilidade). |
| Comentários | `project_deliverable_comment (id, deliverableId, authorId, parentId, body, createdAt, updatedAt, deletedAt)`. Threading 2 níveis (raiz + resposta; `parentId.parentId` bloqueada por check). | Threading N-níveis (UI de replies fica confusa; adia). Mesma tabela `crm_interaction` (mistura CRM com projeto). |
| Drag & drop kanban | Introduz `@dnd-kit/core` + `@dnd-kit/sortable`. Dropar em coluna X chama `changeDeliverableStatusForm`. Reordenar dentro da coluna chama `reorderDeliverableForm` novo. Fallback via diálogo continua. | HTML5 drag nativo (UX ruim em mobile); react-beautiful-dnd (deprecado). |
| Gantt | Server component gera dados; UI SVG puro, sem lib externa. Zoom por parâmetro `?scale=day\|week\|month` (default week). Barra por fase (larga) e por entrega (fina); linha conectando `predecessor.end → successor.start`. | Frappe-Gantt / react-gantt-task (deps pesadas, JS-only, sem SSR). Canvas (pior acessibilidade). |
| Calendário | Server component; grid mensal 7 colunas HTML puro. Mês navegável via `?ym=2026-10`. Cada dia lista marcos e entregas com `dueAt = day`. | Lib calendar (peso desproporcional). |
| Horas | `project_time_entry (id, deliverableId, userId, startedAt, endedAt, minutes computed, notes)`. Timer: start = insert com `endedAt=null`; stop = update. Entrada manual: insert com ambos. `users.hourlyRateCents` adicionada. | Timer client-side com localStorage (perde estado; contornar sync é complexidade extra). Rate por projeto (Fase futura se pedir). |
| Consulta "há uma entrada aberta?" | `unique` parcial `on user_id where ended_at is null` — impede começar dois timers ao mesmo tempo. | Aplicação-only (raça permite dois abertos). |
| Financeiro | `project_expense (id, projectId, description, amountCents, dateAt, notes)`. Página `financeiro` agrega: orçamento, custo (horas × rate + expenses), receita (propostas aceitas via oportunidade), margem. | Tabela dedicada de billing/invoicing (adia). |
| Templates | `project_template (id, name, description, ownerId, createdAt)`, `project_template_phase (templateId, name, position, notes)`, `project_template_deliverable (templateId, phaseId nullable, title, description, position)`. Snapshot no momento — desconecta do projeto de origem. | Referência viva (mudança no projeto original propaga; complica). |
| Criação por template | `createProjectFromOpportunity` ganha parâmetro opcional `templateId`. Se presente, materializa fases e entregas em transação. | Fluxo separado — duplicaria o mecanismo de link com oportunidade. |
| Hourly rate | Coluna `hourly_rate_cents bigint` em `users`, nullable. Rate ausente → custo = 0 pra aquela entrada. Warning na UI do financeiro. | Tabela histórica de rate (adia; um único rate atual é suficiente pro solo dev). |

### 2.1 Convenções herdadas mantidas

- Módulo continua em `src/modules/projects/*`. As adições de schema vão para arquivos novos (`schema-extras.ts` importa e re-exporta pra não inflar o principal — decisão do arquivo é implementação).
- Toda action recebe `ctx: AdminContext` e é chamada só depois de `await requireAdmin()`.
- `ActionResult<T>` em tudo.
- Auditoria: novos verbos `project.dependency.*`, `project.comment.*`, `project.time.*`, `project.expense.*`, `project.template.*`.

---

## 3. Estrutura do projeto

```
src/
  modules/projects/
    schema.ts                     # (Fase 3) adiciona só a coluna users.hourlyRateCents
    schema-extras.ts              # NEW: dependency, comment, time_entry, expense, template*
    dependency.ts                 # NEW: detectDependencyCycle puro (BFS)
    validation.ts                 # NEW: schemas dos 8 domínios extras
    queries.ts                    # ampliada: listDependencies, listComments,
                                  #  listTimeEntries, getFinancials, listTemplates, etc.
    actions.ts                    # ampliada com actions dos 8 domínios
    form-actions.ts               # wrappers
    components/
      kanban-board.tsx            # NEW: client, @dnd-kit
      gantt.tsx                   # NEW: server + SVG
      calendar-month.tsx          # NEW: server + grid HTML
      timer-panel.tsx             # NEW: client, start/stop
      time-entry-form.tsx         # NEW: manual entry dialog
      expense-form.tsx            # NEW: dialog
      dependency-picker.tsx       # NEW: seletor múltiplo dentro do DeliverableFormDialog
      comment-thread.tsx          # NEW: client, thread + form
      template-form.tsx           # NEW: salvar-como-template
      template-picker.tsx         # NEW: usado no CreateProjectDialog
  app/(admin)/admin/projetos/[id]/
    kanban/page.tsx               # ganha drag-drop via KanbanBoard
    gantt/page.tsx                # NEW
    calendario/page.tsx           # NEW
    financeiro/page.tsx           # NEW
    (o layout adiciona novas abas ao ProjectTabs)
  app/(admin)/admin/projetos/templates/
    page.tsx                      # NEW: lista + salvar-como-template
    [id]/page.tsx                 # NEW: detalhe read-only
  app/(admin)/admin/projetos/[id]/entregas/[deliverableId]/
    page.tsx                      # NEW: detalhe (comentários, horas, dependências) —
                                  #  o diálogo continua pra editar rápido; a página é o histórico
```

---

## 4. Modelo de dados

### 4.1 Novas colunas em tabelas existentes

- `users.hourly_rate_cents bigint` (nullable, cents BRL/h).
- `project_deliverable` não muda estrutura; `position` já existe e serve pra ordenação dentro da coluna do kanban (mecanismo já implementado).

### 4.2 Enums novos

- `project_expense_kind`: `travel`, `service`, `equipment`, `other` (opcional; classificação leve).
- `project_time_source`: `timer`, `manual` (rastreio de como a entrada foi criada).

### 4.3 Tabelas novas

**`project_deliverable_dependency`** — arestas do DAG.
- `predecessor_id uuid not null references project_deliverable(id) on delete cascade`,
- `successor_id uuid not null references project_deliverable(id) on delete cascade`,
- `created_at timestamptz default now() not null`.
- PK composta `(predecessor_id, successor_id)`.
- Check `predecessor_id <> successor_id`.
- Índice `dep_successor_idx (successor_id)` pra buscar predecessores rápido.

**`project_deliverable_comment`** — thread por deliverable.
- `id uuid pk`, `deliverable_id uuid not null references project_deliverable(id) on delete cascade`,
- `parent_id uuid references project_deliverable_comment(id) on delete cascade` (nullable = raiz),
- `author_id uuid not null references users(id)`,
- `body text not null` (max 4000),
- `deleted_at timestamptz` (soft delete pra preservar thread),
- `created_at`, `updated_at`.
- Índice `comment_deliverable_created_idx (deliverable_id, created_at)`.
- Check: 2 níveis apenas — `parent_id is null OR (select parent_id from project_deliverable_comment p where p.id = project_deliverable_comment.parent_id) is null`. Implementado como trigger simples ou validado em application (spec §8 item 5).

**`project_time_entry`** — apontamento por entrega.
- `id uuid pk`,
- `deliverable_id uuid not null references project_deliverable(id) on delete cascade`,
- `user_id uuid not null references users(id) on delete restrict`,
- `started_at timestamptz not null`,
- `ended_at timestamptz`,
- `minutes integer` (calculado no `stop`; null enquanto aberto),
- `source project_time_source not null`,
- `notes text`,
- `created_at`, `updated_at`.
- Índices: `time_deliverable_idx (deliverable_id, started_at desc)`,
- `time_user_open_uniq` unique parcial em `(user_id) where ended_at is null` — só uma entrada aberta por usuário.
- Check: `ended_at is null or ended_at > started_at`.

**`project_expense`** — despesas fora de horas.
- `id uuid pk`, `project_id uuid not null references project(id) on delete cascade`,
- `description text not null` (max 200),
- `amount_cents bigint not null` (>= 0),
- `kind project_expense_kind not null default 'other'`,
- `date_at date not null`,
- `notes text`,
- `created_by uuid not null references users(id)`,
- `created_at`, `updated_at`.
- Índice `expense_project_date_idx (project_id, date_at desc)`.

**`project_template`** — cabeçalho do template.
- `id uuid pk`, `name text not null unique`, `description text`,
- `owner_id uuid not null references users(id)`, `created_at`, `updated_at`.
- Unique de nome facilita busca; edição de nome revalida.

**`project_template_phase`** — fase de template.
- `id uuid pk`, `template_id uuid not null references project_template(id) on delete cascade`,
- `name text not null`, `position int not null`, `notes text`.
- Unique parcial `unique (template_id, position)` — mesmo padrão da fase real.

**`project_template_deliverable`** — entrega de template.
- `id uuid pk`, `template_id uuid not null references project_template(id) on delete cascade`,
- `phase_id uuid references project_template_phase(id) on delete set null` (mantém entrega "sem fase" se a fase for removida),
- `title text not null`, `description text`, `position int not null default 0`,
- (sem status: templates só descrevem estrutura).

### 4.4 Regras de integridade

- **Ciclo de dependência bloqueado em `createDependency`** — BFS aplicação (§5.1).
- **Comentário-neto bloqueado** — trigger ou check aplicação. Optamos por trigger simples (spec §4.5), evita bug se alguém contornar o Zod.
- **Um timer aberto por usuário** — unique parcial no banco.
- **Deletar deliverable** cascateia dependency (ambas direções), comments, time_entries. Mantém regra do módulo.

### 4.5 Trigger de comentário-neto

```sql
create or replace function project_comment_no_grandchild() returns trigger as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from project_deliverable_comment p where p.id = new.parent_id and p.parent_id is not null) then
      raise exception 'comment threading limited to two levels';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger project_comment_no_grandchild_trg
before insert or update on project_deliverable_comment
for each row execute procedure project_comment_no_grandchild();
```

---

## 5. Regras de negócio críticas

### 5.1 Detecção de ciclo (dependências)

`detectDependencyCycle(edges, predecessorId, successorId): boolean` — puro, testável. Recebe lista de arestas atual + a nova. BFS partindo de `successorId` seguindo arestas `predecessor→successor`; se alcança `predecessorId`, ciclo.

### 5.2 Timer: start / stop

- `startTimer(ctx, deliverableId, { notes })` — se já existe entrada aberta pra `ctx.user.id`, primeiro `stopTimer` na existente (com `endedAt = now()`) numa transação, depois insere a nova. Documentado como comportamento.
- `stopTimer(ctx, entryId)` — grava `endedAt = now()` e `minutes = ceil((endedAt - startedAt)/60000)`. Recusa se `entryId` não pertence ao usuário ou já parado.
- `logManualTime(ctx, { deliverableId, startedAt, endedAt, notes })` — Zod exige `endedAt > startedAt` e ambos passados; grava `minutes` já calculado.
- `deleteTimeEntry(ctx, id)` — só o dono da entrada apaga.

### 5.3 Financeiro

Números vivem em cents (bigint) até chegar na UI. `getProjectFinancials(ctx, projectId)` devolve:

- `budgetCents` (snapshot do projeto).
- `laborCents` = `sum(minutes * user.hourlyRateCents / 60)` por entrada com `endedAt not null`. Entradas sem rate contam 0 e a UI mostra alerta com contagem.
- `expenseCents` = `sum(project_expense.amountCents)`.
- `costCents` = `laborCents + expenseCents`.
- `revenueSentCents` = `sum(crm_proposal.valueCents where status = 'sent'` na oportunidade origem).
- `revenueAcceptedCents` = `sum(... where status = 'accepted')`.
- `marginCents` = `revenueAcceptedCents - costCents` (podendo ser negativo).
- `marginPct` = margem sobre receita aceita (0 se receita 0).

### 5.4 Template a partir de projeto

`createTemplateFromProject(ctx, projectId, { name })`:

1. Verifica `name` único.
2. Em transação: cria `project_template`; itera `project_phase` copiando pra `project_template_phase` mantendo `position`; itera `project_deliverable` copiando (sem status, sem assignee, sem due, sem fileId, sem visibleToClient); mapeia `phaseId` do projeto pro id da template_phase criado.
3. Auditoria: `project.template.created`, metadata `{ fromProjectId, deliverableCount }`.

### 5.5 Criar projeto de template

`createProjectFromOpportunity(ctx, opportunityId, { title, copyValue, templateId? })`:

- Se `templateId` presente, após criar o projeto materializa fases (com mesma `position`) e entregas (assignee = ctx.user.id, status `todo`, position dentro de todo).

---

## 6. UI

### 6.1 Sub-nav do projeto

O `ProjectTabs` da Fase 3 ganha três abas: **Visão geral · Kanban · Gantt · Calendário · Financeiro**. Uma quinta aba "Templates" **não** fica no projeto — templates são globais em `/admin/projetos/templates`.

### 6.2 Kanban com drag-and-drop

`KanbanBoard` client component novo. Pacote `@dnd-kit/core` + `@dnd-kit/sortable`. Ao soltar em coluna diferente: chama `changeDeliverableStatusForm`; se `blocked`, o próprio drop abre o LostDialog-equivalente pra pedir motivo. Ao soltar na mesma coluna reordenando: chama `reorderDeliverableForm` (nova server action que renumera positions com two-pass update, mesmo padrão de `movePhase`). Fallback: clicar no card continua abrindo o diálogo.

Mobile: se `matchMedia("(pointer: coarse)")`, apresenta o menu "Mover para..." em cada card (sem drag).

### 6.3 Gantt

`/admin/projetos/[id]/gantt` — server component. Layout:

- Coluna esquerda (250 px): lista de fases; cada fase colapsável mostrando entregas.
- Grade direita: SVG. X = tempo (dias/semanas/meses conforme `?scale`), Y = linha por item. Barra da fase = larga (`--projeto-100` fundo, borda `--link`), barra de entrega = fina (fundo por status). Hoje = linha vertical `--sinal-500`.
- Dependências: caminho SVG do fim do predecessor pro início do sucessor com seta.
- Sem edição na Fase 3.5. Clicar em barra abre o DeliverableFormDialog da entrega.

Sem barra = item sem `dueAt` (fica com placeholder "sem data").

### 6.4 Calendário mensal

`/admin/projetos/[id]/calendario?ym=YYYY-MM` — server component. Grid 7 colunas (Seg–Dom) x 6 linhas. Cada célula do dia lista marcos (chip com pontinho de status) e entregas com `dueAt = dia` (chip com título + cor por status). Navegação: ← anterior · Hoje · próximo →.

### 6.5 Detalhe da entrega (nova página)

`/admin/projetos/[id]/entregas/[deliverableId]` — página server. Substitui parte do diálogo pra dar espaço a:

- Cabeçalho: título, status, fase, assignee, prazo.
- **Dependências** (bloco): "depende de" (lista com pill removível), "requerida por" (read-only lista).
- **Horas** (bloco): `TimerPanel` no topo (se não há entrada aberta do usuário: botão "Iniciar"; se há e é dessa entrega, mostra "Rodando há Xm Ys" + botão "Parar"; se há aberta em outra entrega, mostra aviso e botão "Parar aquela e iniciar aqui"). Abaixo: lista de entradas (data, duração, notas), com "Adicionar entrada manual" abrindo `TimeEntryFormDialog`.
- **Comentários** (bloco): thread com raízes e respostas de 1 nível. Formulário no rodapé de cada raiz "Responder".
- Botão "Editar" no cabeçalho abre o `DeliverableFormDialog` da Fase 3 (para editar título/descrição/prazo/assignee).

O diálogo do kanban continua servindo pra edição rápida.

### 6.6 Financeiro

`/admin/projetos/[id]/financeiro` — server component. Cabeçalho com 4 cotas:

1. Orçamento (snapshot)
2. Custo (labor + despesas)
3. Receita aceita (propostas aceitas)
4. Margem (aceita − custo) com percentual

Abaixo:

- **Horas por entrega** (tabela): entrega, minutos, custo estimado, contagem de entradas sem rate.
- **Despesas** (tabela): descrição, tipo, data, valor. Botão "Nova despesa" abre `ExpenseFormDialog`.
- **Propostas** (tabela): número, título, status, valor, data — link pra detalhe da proposta.

### 6.7 Templates

`/admin/projetos/templates` — lista de templates com contadores de fases/entregas. Botão "Novo template" só entra pelo detalhe do projeto ("Salvar como template" → `TemplateFormDialog`).

`/admin/projetos/templates/[id]` — detalhe read-only (nome, descrição, fases com entregas).

Ao criar projeto a partir de oportunidade Ganha, o `CreateProjectDialog` da Fase 3 ganha um dropdown "Modelo (opcional)".

---

## 7. Integração com outros módulos

### 7.1 `files` (Fase 1)

Sem mudança na Fase 3.5 além do que a entrega já faz. Templates **não** copiam `fileId` — templates são estrutura, não conteúdo.

### 7.2 `crm` (Fase 2)

- Financeiro consome `crm_proposal.valueCents` filtrando por `status in ('sent', 'accepted')` das propostas cuja oportunidade é `project.opportunityId`.
- Sem escrita em CRM.

### 7.3 `audit`

Novos verbos: `project.dependency.created`, `project.dependency.deleted`, `project.comment.created`, `project.comment.updated`, `project.comment.deleted`, `project.time.started`, `project.time.stopped`, `project.time.logged`, `project.time.deleted`, `project.expense.created`, `project.expense.updated`, `project.expense.deleted`, `project.template.created`, `project.template.updated`, `project.template.deleted`, `project.created_from_template`.

Metadata sem PII — ids e valores numéricos.

### 7.4 `mail`

Nada. Nenhum e-mail novo (mesma restrição das Fases 2 e 3).

### 7.5 `users`

Coluna `hourly_rate_cents` adicionada. UI de conta (`/admin/conta`) ganha um campo "Rate por hora (cents BRL)" — se a página não existe ainda, adiciona.

---

## 8. Tratamento de erros

`ActionResult<T>` em tudo. Casos nomeados:

1. **Criar dependência que fecharia ciclo** — `createDependency` retorna `fail("Esta dependência criaria um ciclo (a entrega X já depende de Y).")`.
2. **Dois timers do mesmo usuário** — `startTimer` para o aberto e inicia o novo; retorna `ok({ id, wasRunningElsewhere: true })` pra UI avisar. Unique parcial no banco é a última linha de defesa.
3. **Manual time com `endedAt <= startedAt`** — Zod refine.
4. **Manual time no futuro** — Zod refine (`endedAt <= now`).
5. **Comentário-neto** — trigger recusa; action intercepta e retorna `fail("Não é possível responder a uma resposta. Comente na raiz.")`.
6. **Deletar comentário de outro autor** — action recusa; mostra `fail("Só o autor pode deletar.")`. Admin único hoje, então cai raro.
7. **Salvar como template com nome duplicado** — unique em `name`; interceptar `23505` → `fail("Já existe um template com esse nome.")`.
8. **Criar projeto de template quando ainda não existem** (nenhum template cadastrado) — dropdown do CreateProjectDialog mostra "Nenhum template disponível" e não bloqueia; usuário procede sem template.
9. **Financeiro sem rate** — página do financeiro mostra card de aviso "N entradas de horas sem rate; custo estimado em 0 pra elas." com link pra `/admin/conta`.

---

## 9. Testes

**Vitest (unidade)** — novos:

- `detectDependencyCycle`: sem arestas retorna false; adicionar A→B em vazio false; adicionar B→A após ter A→B true; DAG mais complexa (A→B, B→C, tentar C→A) true; adicionar aresta que não conecta os componentes false.
- `computeMinutes(startedAt, endedAt)`: arredondamento up (5m 30s → 6), rejeita endedAt anterior.
- Validation Zod: dependency (mesma predecessor/successor rejeitado); comment (parent do parent rejeitado — validado antes do trigger); time (endedAt > startedAt); expense (amount >= 0); template (nome min 2).
- `computeFinancials(input)` puro: dado horas, rate, expenses, propostas → devolve os 6 números.
- `buildGanttGeometry({ items, scale, from, to })`: puro; devolve para cada item `x, y, width, laneIndex` e caminhos de linha de dependência. Testa alinhamento e overflow.
- `buildMonthGrid(ym)`: pura; devolve matriz 6×7 de datas com `outside` flag.

**Integração** (Postgres) — novos:

- Timer flow: start em entrega A; start em entrega B (fecha A automaticamente e abre B); stop; manual entry.
- Dependência: criar A→B ok; B→A cai; segunda A→B (mesma aresta) cai por PK; deletar A cascadeia deps.
- Comment threading: raiz + resposta ok; resposta-de-resposta cai; soft delete some da timeline.
- Expense: criar/atualizar/deletar; agregação no financeiro bate.
- Template: `createTemplateFromProject` snapshota fases+entregas; `createProjectFromOpportunity(..., templateId)` materializa. Deletar template não afeta projetos gerados.
- Financeiro: `getProjectFinancials` devolve orçamento, labor com rate, expenses, receita aceita corretamente. Rate ausente conta 0 e devolve `entriesWithoutRate = N`.

**Playwright (e2e)**:

- Admin registra rate em `/admin/conta`; abre entrega; inicia timer; para; vê a entrada + custo estimado no financeiro.
- Admin arrasta card no kanban entre duas colunas; volta pro diálogo pra confirmar `status` mudou.
- Admin cria template a partir de projeto; ao criar novo projeto a partir de oportunidade Ganha, seleciona template no dropdown, vê fases materializadas.

---

## 10. Migração e rollout

- **Migration única** `0003_projects_extras.sql`: adiciona `users.hourly_rate_cents`, cria 6 tabelas novas, dois enums, unique parcial de timer aberto, trigger de comment-neto, todos os índices.
- Rollback: `drop trigger`, `drop function`, `drop table` das 6 novas, `alter table users drop column hourly_rate_cents`.
- Nenhuma alteração destrutiva em tabelas da Fase 3 (só novas colunas em `users`).

---

## 11. Escopo negativo consolidado

Todos os pontos citados no §1.1 valem. Adicionar aqui os que emergiram durante a spec:

- **Sem** notificações (portal ou e-mail).
- **Sem** edição do Gantt (só visualização).
- **Sem** timer client-side com relógio contínuo.
- **Sem** rate por projeto/período.
- **Sem** faturamento real / integração contábil.
- **Sem** templates aninhados / herança.
- **Sem** dependências polimórficas.
- **Sem** markdown / anexo por comentário.
- **Sem** reordenação de colunas do kanban.
- **Sem** dashboards agregados fora do projeto (Fase 3.6 se pedirem).

---

## 12. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Detecção de ciclo em grafo grande fica lenta | BFS O(V+E); com centenas de entregas ainda é ms. Se virar gargalo, materializar `closure` table. |
| Timer aberto perdido (usuário fecha aba antes de parar) | Server é a fonte da verdade; ao voltar, UI mostra "Rodando há N min" com botão Parar. Nenhum estado importante mora no cliente. |
| Cálculo de horas com rate ausente confunde | Aviso explícito no financeiro; conta as entradas sem rate. |
| Drag-drop no kanban esbarra na regra "blocked exige motivo" | Ao soltar em blocked, o próprio drop abre o diálogo de motivo antes de commitar; se cancelado, o card volta pra origem. |
| Template com nome duplicado | Unique constraint + fail claro. |
| Circular imports entre `queries.ts` e novas queries de financeiro | Financeiro consome `crm_proposal` diretamente por join; sem chamar o módulo CRM. |
| Migration 0003 pesada | Cria tabelas vazias e uma coluna em users; instantâneo. |

---

## 13. Review focus

Cinco pontos que o revisor precisa cravar antes do merge:

1. **Ciclo de dependência bloqueado** — `detectDependencyCycle` unit-tested; `createDependency` chama e cai em fail claro.
2. **Um timer aberto por usuário** — unique parcial no banco + `startTimer` fecha aberto antes de abrir.
3. **Comentário-neto bloqueado** — trigger no banco + action intercepta.
4. **Financeiro** — números conferem com auditoria (soma de time_entries e expenses vs. dashboard).
5. **Drag-drop no kanban preserva ordem** — dropar reordena position com two-pass update; sem duplicatas.

---

## 14. Convenções de commit e branch

- Branch: `fase-3-5-projetos` (baseada em `fase-3-projetos` até PR #4 mergear; rebasear em `main` depois).
- Mensagens de commit terminam com `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- Um PR final para `main` com checklist do §13.
