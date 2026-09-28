# EGD Consultoria & Tecnologia — Fase 4: Portal do cliente vê projetos

**Data:** 2026-09-28
**Status:** rascunho para aprovação (branch de trabalho: `fase-4-portal-projetos`, baseada em `fase-3-5-projetos`)
**Escopo:** quarta de seis fases do sistema EGD
**Depende de:** Fase 1 (auth/tenancy/files), Fase 2 (CRM company), Fase 3 (schema de projetos + `visibleToClient`), Fase 3.5 (Gantt/calendário read-only reaproveitados).

---

## 1. Contexto e objetivo

Até agora o portal (`/portal`) só tinha "Início" e "Minha conta" — um placeholder. Toda entrega, marco, arquivo e comentário do projeto ficou trancado no admin. A **Fase 4 abre a leitura do projeto para o cliente logado no portal**, respeitando o flag `visibleToClient` que a Fase 3 já colocou na entrega e o tenant ativo resolvido por `requirePortal()`.

Cinco entregas nesta fase:

1. **Ligação `crm_company ↔ organization`** — coluna `organization_id` opcional em `crm_company`. Admin liga uma empresa CRM a uma organização do portal em `/admin/crm/empresas/[id]` e em `/admin/organizacoes/[id]`.
2. **Portal → Projetos** — `/portal/projetos` (lista) e `/portal/projetos/[id]` (visão geral com fases, marcos, entregas visíveis).
3. **Portal → Timeline** — abas Gantt (`/portal/projetos/[id]/gantt`) e Calendário (`/portal/projetos/[id]/calendario`) reusando os componentes puros da 3.5.
4. **Portal → Detalhe da entrega** — `/portal/projetos/[id]/entregas/[deliverableId]` com download de arquivo anexo e thread de comentários do cliente.
5. **Comentários do cliente** — a mesma tabela `project_deliverable_comment` recebe autores clientes; admin vê no seu próprio detalhe já existente da 3.5 sem mudança de UI.

O portal continua read-only para tudo que muda estado do projeto (status, prazo, dependência, timer). O cliente **só cria/edita/apaga comentários próprios** e **baixa arquivos**.

### 1.1 O que a Fase 4 NÃO inclui

- **Notificações** (e-mail ou in-app) quando admin muda algo ou cliente comenta. Fica pra Fase futura.
- **Solicitações do cliente** (abrir chamado, pedir mudança de escopo). O menu "Em breve" do portal atual mencionava — fica pra depois da Fase 4.
- **Edição de projeto** pelo cliente (aprovar entrega, marcar aceite). Read-only e comentário nesta fase.
- **Portal vê Kanban** — o kanban admin é operacional. Cliente vê a visão geral e o Gantt, que já mostram estado. Sem tela extra.
- **Financeiro/horas** — nada disso vaza pra portal. Fase 4 é execução, não custo.
- **Múltiplas empresas por organização** — usamos FK simples em `crm_company.organization_id`; várias companies podem apontar pra mesma org (holding), mas a UI da 4 não trata o inverso.
- **Templates, dependências, comentários aninhados a mais de 2 níveis** — regras herdadas sem mudança.

### 1.2 Roadmap atualizado

| Fase | Entrega | Depende |
|------|---------|---------|
| 1 | Fundação | — |
| 2 | CRM | 1 |
| 3 | Projetos (fundação) | 2 |
| 3.5 | Projetos (extras) | 3 |
| **4** | **Portal do cliente vê projetos** | **3.5 (Gantt/calendário) + tenancy da 1** |
| 5 | Cases e conteúdo do site | 1 |
| 6 | APIs e webhooks | 2, 5 |

---

## 2. Decisões de arquitetura

| Decisão | Escolha | Alternativas descartadas |
|---------|---------|--------------------------|
| Ligação org↔company | `crm_company.organization_id uuid null references organizations(id) on delete set null`. FK opcional; várias companies podem apontar pra mesma org (subsidiárias). | `organizations.crm_company_id` (org nasce primeiro pelo convite, esse caminho depois liga); tabela ponte many-to-many (over-engineering pra 1 dono solo). |
| Visibilidade | Query do portal filtra `project.companyId in (select id from crm_company where organizationId = ctx.organization.id)`. Entregas filtradas por `visibleToClient = true`. Fases/marcos aparecem sempre — sem coluna própria por enquanto. | Coluna `visibleToClient` em phase e milestone (over-engineering; se necessário, Fase futura). Escopo pelo `owner` da oportunidade (não modela agências). |
| Módulo | Novo namespace `src/modules/portal-projects/` só com `queries.ts` (adaptador `PortalContext` → dados). Actions de comentário reusam `src/modules/projects/actions.ts` com adaptação: expõe `createCommentAsClient(ctx: PortalContext, ...)` que valida a visibilidade antes. | Portal chamar direto `queries.ts` do admin (Compartilha AdminContext; portable-quebra ao evoluir). Duplicar tudo (mant custo alto). |
| Kanban no portal | Não tem. Visão geral lista entregas por fase; Gantt e calendário cobrem visão temporal. | Kanban read-only (adiciona superfície sem trazer valor pro cliente). |
| Status blocked no portal | Aparece como "Em espera" (traduz nome). Não mostra `blockReason` do admin — sempre em nota interna, cliente vê só o rótulo. | Mostrar motivo (privacidade interna vs. cliente); ocultar (tira contexto). |
| Comentários do cliente | Cliente pode criar comentário raiz ou responder a raiz (2 níveis, mesma regra). `authorId` vira `PortalContext.user.id`. Cliente edita/apaga só os próprios. | Só criar (sem edit/delete — friction desnecessária). |
| Download de arquivo | Reusa `POST /portal/arquivos/baixar` que já existe (Fase 1) — só checa se o file está anexado a uma entrega de projeto que a org enxerga. Nova validação em `getDownloadUrl` (portal) por escopo de projeto. | Rota nova por entrega (duplica lógica). |
| Timeline no portal | Reusa `buildGanttGeometry` / `buildMonthGrid` (funções puras) + componentes de página adaptados (sem barra de escala? mantém a mesma). Sem clique em entrega quando ela não é visível. | Reescrever (duplica manutenção). |
| Auditoria | Novos verbos `portal.project.viewed`, `portal.file.downloaded`, `portal.comment.created`. Log inclui `organizationId` no metadata pra rastrear qual tenant acessou. | Sem audit no portal (perde forensic). |

### 2.1 Convenções herdadas mantidas

- `requirePortal()` no topo de cada `page.tsx` do portal.
- Nenhuma query do portal importa `@/lib/db` fora de `queries.ts`/`actions.ts`.
- Todo `ActionResult<T>`.
- Nenhuma nova dep externa.

---

## 3. Estrutura do projeto

```
src/
  modules/
    portal-projects/
      queries.ts                 # NEW: listPortalProjects, getPortalProject, listPortalDeliverables,
                                 #  listPortalMilestones, listPortalPhases, getPortalDeliverable,
                                 #  listPortalDependencies, listPortalCommentsForClient
      actions.ts                 # NEW: createClientComment, updateClientComment, deleteClientComment,
                                 #  wrappers que validam PortalContext + visibilidade
      form-actions.ts            # NEW
    projects/
      queries.ts                 # (Fase 3) adiciona getProjectVisibilityForOrg helper interno
    crm/
      schema.ts                  # adiciona crm_company.organization_id
      queries.ts                 # amplia getCompany p/ trazer organizationName
      actions.ts                 # linkCompanyToOrganization, unlinkCompany
      form-actions.ts            # linkCompanyToOrganizationForm
  app/(portal)/portal/
    projetos/page.tsx            # NEW: lista de projetos da org ativa
    projetos/[id]/page.tsx       # NEW: visão geral (fases + marcos + próximas entregas visíveis)
    projetos/[id]/gantt/page.tsx # NEW
    projetos/[id]/calendario/page.tsx # NEW
    projetos/[id]/entregas/[deliverableId]/page.tsx # NEW
    projetos/[id]/_components/tabs.tsx # NEW: Visão geral | Gantt | Calendário
  app/(admin)/admin/crm/empresas/
    [id]/page.tsx                # botão "Vincular a organização" (Dialog)
  app/(admin)/admin/organizacoes/
    [id]/page.tsx                # bloco "Empresas CRM vinculadas"
  db/migrations/0004_*.sql       # migration
tests/
  unit/projects/portal-scope.test.ts       # puro: filtra por org + visibleToClient
  integration/portal/projects.test.ts      # RLS de fato (via 2 orgs)
  e2e/portal.spec.ts                       # amplia: cliente vê projeto, comenta, baixa
```

---

## 4. Modelo de dados

### 4.1 Nova coluna

- `crm_company.organization_id uuid null references organizations(id) on delete set null`
- Índice: `crm_company_organization_idx (organization_id)` para lookup por tenant.

### 4.2 Tabelas novas

Nenhuma. Todo o resto reusa o que a Fase 3/3.5 criou.

### 4.3 Migração

- `alter table crm_company add column organization_id uuid references organizations(id) on delete set null;`
- `create index crm_company_organization_idx on crm_company(organization_id);`

Sem backfill obrigatório — colunas ficam null até o admin ligar cada empresa.

---

## 5. Fluxos principais

### 5.1 Admin liga company a org

1. Admin em `/admin/crm/empresas/[id]` → clica "Vincular a organização" → escolhe uma das orgs ativas → confirma.
2. `linkCompanyToOrganization(ctx, companyId, organizationId)` atualiza a coluna e loga `crm.company.linked_to_org`.
3. Cliente da org já vê o(s) projeto(s) no próximo carregamento de `/portal/projetos`.

### 5.2 Cliente vê projeto

1. Cliente logado no portal com org ativa (cookie `egd_org`).
2. `/portal/projetos` mostra card por projeto onde `project.companyId` está em `crm_company` com `organizationId = ctx.organization.id` E `archivedAt is null`.
3. Card: título, status (traduzido), empresa, próximo marco pendente, contagem de entregas visíveis.

### 5.3 Cliente vê detalhe de entrega e comenta

1. `/portal/projetos/[id]/entregas/[deliverableId]` só carrega se:
   - projeto pertence à org ativa (via company),
   - entrega tem `visibleToClient = true`.
2. Cliente vê: título, descrição, status ("Em espera" no lugar de "Bloqueada"), prazo, arquivo anexo (link download).
3. Bloco de comentários: cliente escreve raiz ou responde raiz. Autor visível pra admin como usuário-cliente. Cliente só edita/apaga próprios (mesma regra da 3.5).
4. Sem bloco de horas, sem dependências, sem picker.

### 5.4 Cliente baixa arquivo

1. Rota `POST /portal/arquivos/baixar` (Fase 1) já valida `getDownloadUrl(ctx, fileId)`.
2. Precisa **estender** essa validação: o arquivo só é baixável se estiver anexado a uma entrega de projeto visível pra org **ou** se já estava permitido pela lógica da Fase 1.
3. Alternativa mais segura pra 4: adicionar rota específica `POST /portal/entregas/baixar` que valida `deliverableId` + `visibleToClient` + `organizationId`, e devolve o download. Mantém `/portal/arquivos/baixar` como estava (não regride Fase 1).

**Decisão da spec:** rota nova `POST /portal/projetos/[id]/entregas/[deliverableId]/baixar`. Sinal-forte de escopo; testes isolam melhor.

---

## 6. UI

### 6.1 Sidebar do portal

- Adiciona item **Projetos** entre Início e Minha conta.
- Ativo em `/portal/projetos` e sub-rotas (reusa lógica do sidebar mais-específico da 3.5).

### 6.2 `/portal/projetos` — lista

- Cabeçalho: "Meus projetos" + meta com quantidade + org ativa.
- Empty state: "Nenhum projeto ativo. Se você espera ver algo aqui, avise a equipe da EGD."
- Cards com título, status pill, empresa (mesma da company), próximo marco, N entregas.

### 6.3 `/portal/projetos/[id]` — visão geral

- Header: título, status pill, empresa, datas (`startedAt` → `endedAt` se houver).
- Tabs: Visão geral | Gantt | Calendário.
- Blocos:
  - **Fases** com progresso `k/n` entregas visíveis por fase e barra de status.
  - **Marcos** (todos, com estado check ✓ / próximos / atrasados).
  - **Próximas entregas visíveis** (top 5 com dueAt >= hoje, ordenadas por dueAt).

### 6.4 Gantt/calendário do portal

- Reusam funções puras `buildGanttGeometry` / `buildMonthGrid`.
- Só entregas com `visibleToClient = true` viram barras/chips.
- Sem dependência (portal não vê arestas).
- Sem `?scale=day` (só week e month; day é ruído pro cliente).

### 6.5 Detalhe da entrega no portal

- Header: título, status pill (blocked → "Em espera"), prazo.
- Descrição.
- Bloco anexo: "Baixar arquivo" se `fileId` presente.
- Bloco comentários: mesmo `CommentThread` da 3.5, adaptado pra chamar `form-actions.ts` do portal (novo módulo). Escrita permitida.

### 6.6 Admin: vincular company a org

- No detalhe da empresa (`/admin/crm/empresas/[id]`), aside novo:
  - Se `organizationId` presente: badge com nome da org + botão "Desvincular".
  - Se null: botão "Vincular a organização" → Dialog com select das orgs ativas.
- Sim: `/admin/organizacoes/[id]` também mostra bloco "Empresas CRM vinculadas" com contagem de projetos por company.

---

## 7. Segurança e tenant

- Toda query do portal filtra por `organizationId = ctx.organization.id`. Zero exceção.
- `requirePortal()` retorna a org ativa; qualquer tentativa de acessar `/portal/projetos/<id>` de outra org → `notFound()`.
- Teste de integração cria duas orgs, duas companies, dois projetos, e verifica que cada cliente só enxerga o seu.
- Auditoria loga `organizationId` em todo verbo `portal.*`.
- Cliente nunca vê `blockReason`, valores de propostas, custos ou dependências (nada disso vaza pra query do portal).

---

## 8. Testes

- Unit: `computePortalProjectSummary` (puro) — dado projeto + entregas visíveis, calcula progresso, próximas entregas, marcos.
- Unit: `isDeliverableVisibleForOrg` (puro) — dada tupla (projeto, org, deliverable) → bool.
- Integration: cria 2 orgs + companies + projetos; cliente-A não vê projeto-B.
- Integration: cliente comenta; admin vê o comentário no seu detalhe (a mesma tabela).
- E2E (playwright): cliente convidado acessa /portal, vê projeto, baixa arquivo, comenta.

---

## 9. Review focus

1. Query do portal jamais executa sem `organizationId` no `where` (grep no PR).
2. `visibleToClient = false` NUNCA aparece no portal (nem em Gantt, nem em calendário, nem em detalhe).
3. Download de arquivo do portal valida cadeia: file → deliverable visível → project → company → organizationId.
4. Cliente não consegue criar comentário-neto (2 níveis; regra da 3.5 mantida).
5. Cliente não vê custos, dependências, `blockReason`, entradas de tempo, propostas.
