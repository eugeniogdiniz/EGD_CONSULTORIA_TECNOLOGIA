# EGD Consultoria & Tecnologia — Fase 3: Projetos no admin

**Data:** 2026-09-28
**Status:** rascunho para aprovação (branch de trabalho: `fase-3-projetos`)
**Escopo:** terceira de seis fases do sistema EGD
**Depende de:** Fase 1 (`docs/superpowers/specs/2026-09-27-fase-1-fundacao-design.md`) e Fase 2 (`docs/superpowers/specs/2026-09-27-fase-2-crm-design.md`)

---

## 1. Contexto e objetivo

A Fase 2 entregou o CRM: prospect vira oportunidade, oportunidade avança pelo funil, oportunidade fecha ganha. **A Fase 3 pega essa oportunidade ganha e vira execução.** É onde o dinheiro entra no calendário e onde o time (hoje = o dono; amanhã = equipe) sabe o que fazer.

Cinco entregas:

1. **Projetos** — cada oportunidade Ganha vira exatamente um projeto (link 1:1). O projeto herda empresa, contato principal e valor. Tem status próprio de execução (planning, active, on_hold, delivered, cancelled).
2. **Fases** — o projeto se divide em fases ordenadas (kickoff, execução, entrega — mas o admin cria as que quiser). Cada fase tem data de início e fim.
3. **Marcos** — checkpoints com data dentro do projeto (opcionalmente amarrados a uma fase). "Reunião de aprovação técnica", "Aceite formal do laudo".
4. **Entregas** — unidades de trabalho concretas com status. Cada entrega pode ter arquivo anexado (usa módulo `files` da Fase 1) e ser atribuída a alguém.
5. **Kanban de entregas** — quatro colunas (a fazer, em progresso, revisão, feita) + uma pra bloqueio. Move-se pelo detalhe da entrega (spec §6.2 explica por quê).

O escopo é admin-only. Portal do cliente não vê nada disso na Fase 3 (Fase 4 fará isso).

### 1.1 O que a Fase 3 NÃO inclui (deferido para Fase 3.5)

- **Gráfico de Gantt** — timeline visual das fases. Fica pra Fase 3.5.
- **Calendário mensal por cliente** — visão de mês agregando marcos, deadlines e entregas. Fica pra Fase 3.5.
- **Registro de horas** — time tracking, timer ativo, apontamento retroativo. Fica pra Fase 3.5.
- **Financeiro** — orçamento vs. real, faturamento, custos por entrega, cost overrun. Fica pra Fase 3.5.
- **Drag-and-drop no kanban** — mesma decisão da Fase 2 (mudança de status por dropdown/detalhe). Fica pra futuro.
- **Templates de projeto** — copiar de projeto anterior, ou aplicar template ("Consultoria de infra 3 fases"). Fica pra depois.
- **Dependências entre entregas** — grafo DAG de "só começa quando X termina". Fase futura.
- **Comentários em entregas** — thread de comentários por deliverable. Interações do CRM já dão histórico; comentários específicos ficam para depois.
- **Notificações** — nem no portal, nem por e-mail. Nenhum e-mail transacional novo (mesma restrição da Fase 2).

### 1.2 Onde a Fase 3 encaixa

| Fase | Entrega | Depende |
|------|---------|---------|
| 1 | Fundação | — |
| 2 | CRM | 1 |
| **3** | **Projetos (fundação): projetos, fases, marcos, entregas, kanban** | **2** |
| 3.5 (proposto) | Gantt, calendário por cliente, horas, financeiro | 3 |
| 4 | Portal do cliente vê projetos | 3 |
| 5 | Cases e conteúdo do site | 1 |
| 6 | APIs e webhooks | 2, 5 |

A Fase 4 (portal do cliente) precisa da Fase 3 pronta. O cliente vai enxergar **um subconjunto** do projeto (marcos, entregas prontas com arquivo), nunca as internas (fases, atribuição, bloqueios). A Fase 3 já reserva a coluna `visible_to_client` em `project_deliverable` pra Fase 4 usar sem migração nova.

---

## 2. Decisões de arquitetura

| Decisão | Escolha | Alternativas descartadas |
|---------|---------|--------------------------|
| Origem do projeto | **1:1 com oportunidade Ganha** — `project.opportunity_id uuid not null unique` | Projetos avulsos (perde rastro do funil); N projetos por oportunidade (complica UI). |
| Tenancy | Admin-only, sem `organization_id` — mesma exceção da Fase 2 | Escopo por org (não faz sentido; projeto é do dono, do cliente é a Fase 4). |
| Fases | Livres por projeto (não fixas globais); ordem por coluna `position int` | Templates globais (adia decisão de "quais fases"); enum fixo (rígido demais). |
| Marcos | Tabela própria, ligada a projeto (com FK opcional pra fase) | Aninhar em fase (complica queries; marco pode ser "fim do projeto"). |
| Entregas | Tabela própria com status enum de 5 valores; kanban usa esses valores como colunas | Reusar interações do CRM (interação é registro, entrega é trabalho). |
| Status da entrega | `todo`, `doing`, `review`, `done`, `blocked` | Só 3 (todo/doing/done) — perde a etapa de revisão que existe na prática. Bloqueio como status ao invés de flag booleana — kanban precisa da coluna. |
| Status do projeto | `planning`, `active`, `on_hold`, `delivered`, `cancelled` | Menos estados (perde on_hold que existe). |
| Anexo em entrega | FK opcional pra `files.id`, `on delete set null` | Múltiplos arquivos por entrega (Fase 3.5 se precisar). |
| Ordem dentro da coluna do kanban | Coluna `position int` por entrega; reordenação via ação (não drag) | Timestamp de update (perde ordem manual). |
| Numeração | Sem número global; o par (projeto, título) já identifica. Título editável. | Número tipo `PROJ-YY-042` (adia — Fase 3.5 se pedirem). |
| Soft delete | **Não.** Projeto, fase, marco e entrega deletados de vez. Auditoria guarda o que foi. Só `archived_at` no projeto. | Soft delete em tudo (excesso de flags nullable pra pouco ganho hoje). |
| Reserva pra Fase 4 | `project_deliverable.visible_to_client boolean default false` | Adicionar na Fase 4 (migration extra). Coluna já criada sem uso na Fase 3 é barata. |
| Owner de linha | `owner_id uuid not null references users(id)` em projeto e entrega | Sem owner (perde tracking; time futuro precisa). |

### 2.1 Convenções herdadas da Fase 1/2 mantidas

- Módulo em `src/modules/projects/` com `schema.ts`, `validation.ts`, `queries.ts`, `actions.ts`, `form-actions.ts`, `components/`.
- Páginas em `src/app/(admin)/admin/projetos/*` — nunca importam `@/lib/db` direto; consomem só `queries.ts`/`actions.ts`/`form-actions.ts`.
- Toda action recebe `ctx: AdminContext` e é chamada só depois de `await requireAdmin()`.
- Actions retornam `ActionResult<T>` — nunca lançam para o cliente.
- Auditoria grava `project.<entidade>.<verbo>` sem PII.
- Sub-nav dentro do detalhe do projeto usa o mesmo padrão de abas horizontais do CRM (§6.2 da spec da Fase 2).

---

## 3. Estrutura do projeto

```
src/
  modules/
    projects/
      schema.ts                    # 4 tabelas + 2 enums
      validation.ts                # Zod para todos os inputs
      queries.ts                   # reads
      actions.ts                   # domain actions (retornam ActionResult)
      form-actions.ts              # wrappers useActionState
      components/
        project-form.tsx           # criar/editar dados do projeto
        phase-form.tsx             # criar/editar fase (dialog)
        milestone-form.tsx         # criar/editar marco (dialog)
        deliverable-form.tsx       # criar/editar entrega (dialog)
        kanban-column.tsx          # coluna do kanban
        status-picker.tsx          # dropdown pra mudar status da entrega
  app/(admin)/admin/projetos/
    page.tsx                       # lista de projetos com busca e filtro por status
    [id]/
      layout.tsx                   # abas: Visão geral · Kanban
      page.tsx                     # visão geral (dados + fases + marcos + próximas entregas)
      kanban/page.tsx              # kanban de entregas
      editar/page.tsx              # editar dados do projeto
  app/(admin)/admin/crm/oportunidades/[id]/page.tsx
                                   # ganha botão "Criar projeto" quando stage=won e não há projeto
docs/
  mockups/
    admin-projetos-lista.html
    admin-projeto-detalhe.html
    admin-projeto-kanban.html
    admin-projeto-criar.html       # confirmação da criação a partir de oportunidade
  superpowers/
    specs/2026-09-28-fase-3-projetos-design.md      # este arquivo
    plans/2026-09-28-fase-3-projetos.md             # plano de execução
```

---

## 4. Modelo de dados

### 4.1 Enums

- `project_status`: `planning`, `active`, `on_hold`, `delivered`, `cancelled`.
- `project_deliverable_status`: `todo`, `doing`, `review`, `done`, `blocked`.

### 4.2 Tabelas

**`project`** — um por oportunidade Ganha.
- `id uuid pk`, `opportunity_id uuid not null unique references crm_opportunity(id)` (link 1:1; `on delete restrict` — não permitimos apagar a oportunidade se há projeto), `company_id uuid not null references crm_company(id) on delete restrict` (redundante, evita join extra na maioria das queries), `title text not null` (editável; default = título da oportunidade), `status project_status not null default 'planning'`, `budget_cents bigint` (opcional; snapshot do valor da oportunidade no momento da criação; Fase 3.5 usa pra financeiro), `currency char(3) not null default 'BRL'`, `started_at date`, `ended_at date` (preenchido quando `status` vai pra `delivered` ou `cancelled`), `owner_id uuid not null references users(id)`, `notes text`, `archived_at timestamptz`, `created_at`, `updated_at`.
- Índices: `project_status_idx`, `project_company_idx`, `project_owner_idx`, `project_archived_idx (updated_at) where archived_at is null`.

**`project_phase`** — fases ordenadas dentro do projeto.
- `id uuid pk`, `project_id uuid not null references project(id) on delete cascade`, `name text not null`, `position int not null` (ordem 0-indexed), `started_at date`, `ended_at date`, `notes text`, `created_at`, `updated_at`.
- Índices: `project_phase_project_idx (project_id, position)`; unique parcial `unique (project_id, position)`.

**`project_milestone`** — checkpoints com data.
- `id uuid pk`, `project_id uuid not null references project(id) on delete cascade`, `phase_id uuid references project_phase(id) on delete set null` (opcional; marco pode ser do projeto todo), `name text not null`, `due_at date not null`, `completed_at timestamptz` (preenchido quando marcado; null = pendente), `notes text`, `created_at`, `updated_at`.
- Índices: `project_milestone_project_due_idx (project_id, due_at)`, `project_milestone_pending_idx (due_at) where completed_at is null`.

**`project_deliverable`** — unidade de trabalho, item do kanban.
- `id uuid pk`, `project_id uuid not null references project(id) on delete cascade`, `phase_id uuid references project_phase(id) on delete set null` (opcional; entrega pode ser "geral"), `title text not null`, `description text`, `status project_deliverable_status not null default 'todo'`, `position int not null default 0` (ordem dentro da coluna do kanban; menor = mais em cima), `assignee_id uuid references users(id) on delete set null` (opcional; hoje default = owner do projeto), `due_at date`, `completed_at timestamptz` (preenchido quando status vai pra `done`, zerado se sair), `file_id uuid references files(id) on delete set null`, `visible_to_client boolean not null default false` (reservado para Fase 4; não usado na 3), `owner_id uuid not null references users(id)`, `created_at`, `updated_at`.
- Índices: `project_deliverable_project_idx (project_id)`, `project_deliverable_status_position_idx (project_id, status, position)`, `project_deliverable_due_idx (due_at) where status not in ('done')`, `project_deliverable_assignee_idx (assignee_id) where status not in ('done')`.

### 4.3 Regras de integridade

- **Um projeto por oportunidade.** `unique (opportunity_id)` garante. Segunda tentativa de "Criar projeto" cai no fail com link para o existente.
- **Não apagar oportunidade com projeto.** `on delete restrict` no FK. A UI já não oferece deletar oportunidade; se algum dia oferecer, precisa checar projeto antes.
- **Ordem estável das fases.** `position` único por projeto; reordenar chama uma action que renumera as afetadas em uma transação.
- **Entrega em fase deletada** vira "sem fase" (`phase_id` set null pela cascade), permanece no kanban.
- **Fase com entregas não pode ser deletada.** A action `deletePhase` recusa se houver entrega apontando pra ela; a UI oferece "mover entregas pra outra fase (ou nenhuma)" antes.
- **Status `delivered` ou `cancelled` congela `ended_at`.** Voltar pra `active` zera. Regras vivem em `changeProjectStatus`.

---

## 5. Autorização

Toda rota `/admin/projetos/*` chama `await requireAdmin()`. Nenhuma consulta filtra por `organization_id` — o modelo não tem essa coluna (mesma exceção da Fase 2, ver §5 da spec da Fase 2). Cliente com role `client` batendo aqui recebe `notFound()`.

Owner (`owner_id`) hoje é sempre o admin único. Fica reservado para o dia em que houver equipe e permissões finas.

---

## 6. UI

### 6.1 Lista de projetos (`/admin/projetos`)

Tabela: **Título**, **Empresa** (link para o CRM), **Status** (selo), **Fases** (contador), **Entregas abertas** (contador), **Atualizado**. Filtro por status (tabs: Ativos, Planejamento, Em espera, Entregues, Cancelados, Todos). Busca por título ou nome da empresa. Toggle "Mostrar arquivados". Sem botão "Novo projeto" — criação só a partir de oportunidade ganha (mensagem no `EmptyState` explica).

### 6.2 Detalhe do projeto (`/admin/projetos/[id]`)

Cabeçalho: título grande, meta com empresa (link) + status (selo colorido) + datas (iniciado, previsto), ações **Editar**, mudar status via dropdown, **Arquivar/Desarquivar**.

Sub-nav: **Visão geral · Kanban**.

Visão geral em duas colunas:
- Coluna esquerda (2/3): **Fases** (lista ordenada com nome, datas, notas; botão "Nova fase" e drag-free reordering via up/down arrows), **Marcos** (linha do tempo cronológica com "concluir" por checkbox), **Próximas entregas** (5 mais próximas por `due_at`).
- Coluna direita (1/3): **Dados** (kv: valor snapshot, moeda, owner, criada em, empresa, oportunidade origem — link), **Notas** (texto livre).

### 6.3 Kanban (`/admin/projetos/[id]/kanban`)

Cinco colunas: **A fazer · Em progresso · Revisão · Feita · Bloqueada**. Bloqueada aparece por último, à direita, colapsada por default (mesma UX das colunas Ganho/Perdido do funil).

Card da entrega: título, fase (chip pequeno), assignee (avatar iniciais), due date (destaque quando ≤ hoje), ícone de anexo (📎 substituído por uma marca CSS pequena) se houver arquivo.

Sem drag-and-drop. Clicar no card abre o diálogo de detalhe/edição que inclui o status picker (spec §6.4). Fallback consistente com o funil da Fase 2.

### 6.4 Ações e diálogos

- **Criar projeto** — botão no detalhe da oportunidade quando `stage = won` e não existe projeto. Modal simples: título (pré-preenchido com o título da oportunidade), owner (default = admin logado), snapshot do valor (checkbox "copiar valor da oportunidade", ligado por default). Confirmar cria projeto em `planning` e redireciona para o detalhe.
- **Diálogo de fase** — nome, datas opcionais, notas. Reordenar via botões "↑ subir / ↓ descer" no cabeçalho da fase.
- **Diálogo de marco** — nome, data (obrigatória), fase (opcional), notas. Checkbox "Concluído" ativo grava `completed_at = now()`; desmarcar zera.
- **Diálogo de entrega** — título, descrição, fase (opcional), assignee (default = owner do projeto), due date, status, upload de arquivo (usa `files.uploadFile` como o proposta faz), botão "Salvar".
- **Status picker (entrega)** — dropdown na topo do diálogo com os 5 status. Mudar para `done` grava `completed_at`; sair de `done` zera. Mudar para `blocked` pede motivo (campo obrigatório no diálogo; guardado em `description` como bloco `## Bloqueio` — Fase 3.5 pode separar em coluna se virar comum).

### 6.5 Sidebar

Adiciona item flat **Projetos** entre **Organizações** e **Leads**. Sem grupo colapsável (só há uma tela na raiz — o resto está dentro do detalhe do projeto).

Ordem final: **Painel · CRM (grupo) · Organizações · Projetos · Leads · Arquivos · Auditoria**.

### 6.6 Anti-padrões (herdados)

Nada muda. Segue proibindo gradiente decorativo, grid de três cards com ícone, emoji em título, animação de entrada por seção etc. Números monetários em Fragment Mono tabular.

---

## 7. Integração com outros módulos

### 7.1 CRM (Fase 2)

Ponto de entrada único: o detalhe da oportunidade ganha um botão **Criar projeto** quando `stage = won` e não há projeto vinculado. Ao criar, redireciona para `/admin/projetos/{id}`. Se já existe projeto, o botão vira link **Ver projeto**.

O detalhe da oportunidade também mostra, quando existe projeto, um card "Projeto associado" com título, status e link.

Auditoria: `project.created_from_opportunity` grava metadata `{ opportunityId }`.

### 7.2 `files` (Fase 1)

Entregas usam `files.uploadFile` para anexo (mesma mecânica das propostas da Fase 2). `organizationId` vai null (arquivo interno do admin). Download via `getDownloadUrl` com URL assinada de 5 min gerada no render.

### 7.3 `audit`

Convenção `project.<entidade>.<verbo>`:
- `project.created`, `project.updated`, `project.status_changed` (metadata: `from`, `to`), `project.archived`, `project.unarchived`, `project.created_from_opportunity`.
- `project.phase.created`, `project.phase.updated`, `project.phase.reordered`, `project.phase.deleted`.
- `project.milestone.created`, `project.milestone.updated`, `project.milestone.completed`, `project.milestone.uncompleted`, `project.milestone.deleted`.
- `project.deliverable.created`, `project.deliverable.updated`, `project.deliverable.status_changed` (metadata: `from`, `to`), `project.deliverable.assigned` (metadata: `to_user_id`), `project.deliverable.file_attached`, `project.deliverable.deleted`.

Metadata jamais leva PII — só ids.

### 7.4 `mail`

Nada. Nenhum e-mail transacional novo — mesma restrição da Fase 2.

### 7.5 `tenancy`

Nada. Fase 4 usará `crmCompany.linkedOrganizationId` pra decidir o que expor no portal, mas isso é problema da Fase 4.

---

## 8. Tratamento de erros

Todo `ActionResult<T>`. Casos que a spec obriga tratar por nome:

1. **Criar projeto de oportunidade sem `stage = won`** — retorna `fail("Só oportunidades ganhas viram projeto.")`.
2. **Criar projeto de oportunidade que já tem projeto** — retorna `fail("Esta oportunidade já tem um projeto: '{título}'.")` com link para ele.
3. **Deletar fase com entregas** — retorna `fail("Esta fase tem N entregas. Mova-as antes de deletar.")`.
4. **Reordenar fase pra posição inválida** — schema valida `position >= 0 && position < count`.
5. **Mudar entrega pra `blocked` sem motivo** — Zod refine exige `blockReason` (que vira parte da `description`).
6. **Corrida ao criar projeto duas vezes** (dois cliques rápidos) — `unique (opportunity_id)` no banco pega; interceptamos `23505` e caímos no caso #2.
7. **Anexar arquivo em entrega deletada** — a action verifica existência antes de chamar `uploadFile`; fail com "Entrega não encontrada".

---

## 9. Testes

**Vitest (unidade):**
- Validação: título curto, data em formato brasileiro rejeitada, posição negativa rejeitada, motivo obrigatório em `blocked`.
- Regras puras de status: `changeProjectStatus` para `delivered` grava `ended_at`; reabrir zera. Same para deliverable → `done`.
- Reordenação: função pura `reorderPositions(items, movedId, direction): items[]`.

**Integração (Postgres do compose):**
- Criar projeto a partir de oportunidade ganha (happy path).
- Segunda tentativa cai em fail citando o projeto existente.
- Oportunidade sem `stage=won` recusa.
- Cascade: apagar projeto apaga fases, marcos e entregas (test que `crm_opportunity` sobrevive por `restrict`).
- Deletar fase com entregas falha; sem entregas passa.
- `changeDeliverableStatus`: `todo → done` grava `completed_at`; `done → doing` zera; `→ blocked` sem motivo falha via Zod.
- Reordenar fase: `moveUp` e `moveDown` mantém posições sequenciais 0..n-1.

**Playwright (e2e):**
- Admin abre oportunidade ganha, clica "Criar projeto", vê o detalhe, adiciona uma fase, um marco e uma entrega; abre o kanban, muda status via diálogo, marca como feita.
- Cliente em `/admin/projetos` recebe redirect para `/entrar` (ou 404 se logado como client).

---

## 10. Migração e rollout

- **Migration única** `0002_projects.sql` cria enums e tabelas. Nenhuma alteração em tabelas da Fase 2 além de referências FK.
- Nenhuma feature flag. `/admin/projetos/*` fica atrás da URL até estar pronto; sem link até a Task de sidebar rodar.
- Pipeline de deploy inalterado (GHCR + Coolify + migrations no boot).
- Rollback: `drop table` das quatro novas tabelas (não há FK apontando de fora pra elas). Documentado no plano.

---

## 11. Escopo negativo consolidado

Registrado aqui pra não voltar como pedido silencioso durante execução:

- **Sem** Gantt, sem calendário mensal, sem horas, sem financeiro (todos na Fase 3.5).
- **Sem** drag-and-drop no kanban.
- **Sem** templates de projeto, dependências entre entregas, comentários por entrega.
- **Sem** notificações no portal ou por e-mail.
- **Sem** múltiplos arquivos por entrega.
- **Sem** numeração global de projeto/entrega (`PROJ-YY-042` etc.).
- **Sem** portal do cliente vendo projetos (é a Fase 4).
- **Nenhum** novo cabeçalho de segurança, variável de ambiente, bucket S3 ou SMTP.

---

## 12. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Kanban lento com muitos cards | Filtro por fase e por assignee na topbar do kanban; paginação por status coluna se passar de ~100 cards. |
| Fases livres viram bagunça sem template | Aceito para MVP; Fase 3.5 pode adicionar templates. UI mostra fases em uma lista clara com contador de entregas por fase. |
| Reordenação com posição única quebra em inserts concorrentes | Reordenação inteira em `db.transaction`; posição temporária = `n * 100` (deixa gaps) e renumera em cada save. Se conflitar, retry único. |
| Deletar oportunidade quebra por `restrict` | UI da Fase 2 já não oferece deletar oportunidade. Se algum dia oferecer, precisa detectar projeto antes. |
| Time zone em `date` (started_at etc.) — `2026-10-15T03:00Z` no Brasil ainda é 14/10 | Já resolvido em `lib/format.ts:formatIsoDate` (parse manual da string sem passar por Date). |
| Anexar arquivo grande demora e trava UI | Limite herdado (50 MB). Feedback de "Enviando…" no botão. |
| Auditoria enche rápido com `status_changed` | Aceitável; `metadata.from` e `to` facilitam filtrar. |

---

## 13. Review focus

Cinco pontos que o revisor precisa cravar antes do merge:

1. **1:1 oportunidade↔projeto** — unique constraint + interceptação de `23505` no `createProjectFromOpportunity`; UI mostra "Ver projeto" quando já existe.
2. **`requireAdmin()` em toda rota `/admin/projetos/*`** — client → 404, sem `organization_id` em nenhuma tabela.
3. **Deletar fase com entregas bloqueado** — action recusa; UI oferece mover antes.
4. **Status `blocked` sem motivo bloqueado** — Zod refine; motivo entra em `description`.
5. **Kanban não usa `@lib/db` direto** — respeita o padrão de módulos da Fase 1.

---

## 14. Convenções de commit e branch

- Branch: `fase-3-projetos`.
- Mensagens de commit terminam com `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- Um PR final para `main` com checklist do §13 (Review focus) marcado.
