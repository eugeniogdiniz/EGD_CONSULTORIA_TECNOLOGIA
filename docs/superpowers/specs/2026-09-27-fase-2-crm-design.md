# EGD Consultoria & Tecnologia — Fase 2: CRM

**Data:** 2026-09-27
**Status:** rascunho para aprovação (branch de trabalho: `fase-2-crm`)
**Escopo:** segunda de seis fases do sistema EGD (site + portal do cliente + portal administrativo)
**Depende de:** Fase 1 (`docs/superpowers/specs/2026-09-27-fase-1-fundacao-design.md`)

---

## 1. Contexto e objetivo

A Fase 1 entregou a fundação: um app Next.js em container, autenticação por e-mail e senha, organizações multi-tenant, esqueleto dos portais admin e cliente, formulário de contato gravando leads, e-mail transacional, upload de arquivos, auditoria e deploy no Coolify. O admin já lista leads do site e permite marcar como visto — nada além disso.

A Fase 2 entrega o **CRM do dono da EGD**: um cadastro de empresas prospectadas e seus contatos, um funil comercial com estágios fixos, um histórico de interações (ligação, e-mail, reunião, nota) e propostas comerciais registradas com anexo. O admin passa a ter uma tela onde converter um lead do site em empresa + contato + oportunidade em uma ação; e onde acompanhar o funil em quadro (kanban) e em lista.

O CRM é **operado pela EGD**, sobre os prospects da EGD. Ele não expõe nada ao portal do cliente. Só o papel `admin` vê e escreve; papel `client` que tente `/admin/crm/*` recebe 404 (padrão da Fase 1).

### 1.1 O que a Fase 2 NÃO inclui

- Estágios de funil configuráveis pelo admin (fica para outra fase; Fase 2 é fixa em seis).
- Geração de PDF de proposta a partir de template (Fase 5 tratará conteúdo editável).
- Sincronização IMAP / recebimento de e-mail para logar interação automaticamente.
- Envio de e-mail em massa, sequências, cadências, automações e workflows.
- Dashboards de conversão, previsão de receita, quotas por vendedor, comissionamento.
- Integração com WhatsApp, telefonia, calendário Google/Microsoft.
- Enriquecimento de dados externo (Clearbit, LinkedIn, Receita Federal).
- API pública ou webhooks (Fase 6).
- Cadastro de produtos/serviços da EGD e itens de proposta com preço unitário (usa `title + valor total` na Fase 2; catálogo entra quando houver demanda).
- Múltiplos usuários operando o CRM em paralelo com atribuição por vendedor. A Fase 2 assume operação por um admin único (o dono). O modelo já reserva `owner_id` para o dia em que houver equipe.

### 1.2 Onde a Fase 2 encaixa no roadmap

| Fase | Entrega | Depende de |
|------|---------|------------|
| 1 | Fundação | — |
| **2** | **CRM: empresas, contatos, interações, funil, propostas** | **1** |
| 3 | Projetos no admin | 2 |
| 4 | Portal do cliente com projetos, solicitações e documentos | 3 |
| 5 | Cases e conteúdo do site editáveis no admin | 1 |
| 6 | APIs e webhooks | 2, 5 |

A Fase 3 (projetos) puxa dado do CRM: uma oportunidade Ganha vira, com um clique, um projeto associado à mesma empresa e ao mesmo contato. A Fase 2 deixa a porta pronta (`crm_opportunity.status = 'won'` e uma coluna futura `project_id` fica de fora agora; Fase 3 adiciona).

---

## 2. Decisões de arquitetura

| Decisão | Escolha | Alternativas descartadas |
|---------|---------|--------------------------|
| Entidade "empresa" | **Nova tabela `crm_company`**, separada de `organizations` (tenancy) | Reusar `organizations` para tudo (poluiria a tenancy: prospect vira "organização inativa"; convite acidental fica muito perto). Duas visões da mesma tabela com discriminador (complica queries, quebra invariantes). |
| Multi-tenancy no CRM | **Single-tenant** (EGD é o dono; não há `organization_id` em tabelas CRM) | Amarrar CRM a `organization_id` (não faz sentido; o CRM é do dono, não do cliente). |
| Estágios do funil | **Fixos em seis:** `new`, `qualified`, `meeting`, `proposal`, `won`, `lost` | Configuráveis pelo admin com UI (esforço desproporcional; três meses sem editar seria o normal). |
| Interações | **Uma tabela `crm_interaction`** com enum `type` e FKs nullable para company/contact/opportunity | Três tabelas separadas (call/email/meeting) — repetição de colunas e consultas cruzadas caras. Polimorfismo por `entity_type/entity_id` (sem FK, sem integridade). |
| Propostas | **`crm_proposal`** com metadados (título, valor `numeric(14,2)`, moeda `BRL`, data de envio, data de validade, estado) + FK opcional para `files.id` (anexo) | Geração de PDF por template (Fase 5). Catálogo de itens de proposta com preço (fica quando houver demanda). |
| Conversão lead → CRM | **Manual, com sugestão por domínio de e-mail.** Botão "Converter" na linha do lead abre modal que pré-preenche empresa/contato e permite anexar a existente ou criar nova. `leads` ganha FKs nullable `converted_company_id`, `converted_contact_id`, `converted_opportunity_id`, `converted_at`. | Automática (perde controle; duplica cadastro por variação de nome). |
| Menu do admin | **Item agrupado "CRM"** na sidebar, com sub-itens Empresas / Contatos / Funil / Propostas. Novo padrão de agrupamento no design system, aprovado por mockup. | Quatro itens soltos na raiz (incha a sidebar; obscurece a hierarquia). Uma única tela "CRM" com abas (esconde a navegação profunda). |
| Owner de registros CRM | Toda tabela CRM carrega `owner_id uuid references users(id)`. Na Fase 2 default = admin único. | Ignorar owner e adicionar depois (migration futura fica cara com dado). |
| Numeração de propostas | Formato `PROP-{YY}-{seq}` com sequência por ano, gerada por `crm_proposal_number_seq_{YY}` (sequência Postgres por ano) | UUID (ilegível). Contador em application code (corrida em multi-worker; hoje é 1 worker, mas evitar dívida). |
| Soft delete | Empresas e contatos usam `archived_at timestamptz` nullable; oportunidades e propostas não são apagadas. Interações têm `deleted_at` (a operação pode ter registrado erro que precisa sumir da view sem apagar histórico de auditoria). | Delete físico (perde histórico). |
| Busca | `ILIKE '%q%'` com índices `pg_trgm` em `crm_company.name`, `crm_contact.email`, `crm_contact.name` | Full-text search com `tsvector` (peso desproporcional para volumes esperados de centenas/poucos milhares de linhas). |
| Ordenação | Padrão: `updatedAt desc`. Colunas ordenáveis na tabela: nome, estágio, valor, próximo passo, última interação. | — |

### 2.1 Exceção à invariante de tenancy da Fase 1

A Fase 1 fixou: "toda tabela de dado de cliente carrega `organization_id`". As tabelas `crm_company`, `crm_contact`, `crm_opportunity`, `crm_interaction`, `crm_proposal` **não têm `organization_id`** porque não são dados de cliente — são dados do dono. A regra continua valendo para todo o portal. `requireAdmin()` (não `requirePortal()`) é a única forma de acessá-las.

---

## 3. Estrutura do projeto

Só o que a Fase 2 adiciona. Nada do que a Fase 1 já criou muda de lugar.

```
src/
  modules/
    crm/                         # novo
      schema.ts                  # crm_company, crm_contact, crm_opportunity, crm_interaction, crm_proposal + enums
      validation.ts              # Zod schemas de entrada
      queries.ts                 # listagens, detalhes, busca — todas recebem AdminContext
      actions.ts                 # server actions (criar, atualizar, arquivar, converter lead, mudar estágio)
      form-actions.ts            # wrappers useActionState
      convert-lead.ts            # regra pura de sugestão por domínio + normalização
      proposal-number.ts         # geração PROP-YY-seq (usa sequência Postgres)
      components/
        company-form.tsx
        contact-form.tsx
        opportunity-form.tsx
        interaction-timeline.tsx
        proposal-form.tsx
        funnel-board.tsx         # kanban por estágio
        convert-lead-dialog.tsx
  app/
    (admin)/admin/crm/
      layout.tsx                 # sub-navegação Empresas / Contatos / Funil / Propostas
      page.tsx                   # redirect para /admin/crm/funil (default)
      empresas/
        page.tsx                 # lista
        nova/page.tsx
        [id]/page.tsx            # detalhe (aba: dados, contatos, oportunidades, interações, propostas)
        [id]/editar/page.tsx
      contatos/
        page.tsx
        [id]/page.tsx
      funil/
        page.tsx                 # kanban por estágio, drag para mudar estágio
      oportunidades/
        [id]/page.tsx            # aberta a partir do card do funil
      propostas/
        page.tsx
        [id]/page.tsx
    (admin)/admin/leads/
      page.tsx                   # ganha botão "Converter em empresa"
  components/shell/
    admin-sidebar.tsx            # ganha suporte a grupo colapsável com sub-itens
docs/
  mockups/
    admin-crm-funil.html         # aprovação obrigatória antes do código de UI
    admin-crm-empresa.html
    admin-crm-oportunidade.html
    admin-crm-proposta.html
    admin-crm-converter-lead.html
  specs/
    design-system.md             # emenda: padrão de grupo colapsável na sidebar
```

Regra da Fase 1 mantida: páginas nunca importam `@/lib/db`. Só `queries.ts`/`actions.ts` de `src/modules/crm/`. Toda função dessas duas camadas recebe `ctx: AdminContext` como primeiro argumento e é chamada só depois de `await requireAdmin()`.

---

## 4. Modelo de dados

Todas as tabelas usam `uuid` primária com `defaultRandom()`, `timestamp with time zone`, `snake_case` no banco (herdado da Fase 1). Nomeação: prefixo `crm_` no nome da tabela; o objeto Drizzle exportado usa camelCase (`crmCompany`, `crmContact` etc.).

### 4.1 Enums

- `crm_opportunity_stage`: `new`, `qualified`, `meeting`, `proposal`, `won`, `lost`.
- `crm_interaction_type`: `call`, `email`, `meeting`, `note`.
- `crm_contact_role`: `primary`, `technical`, `financial`, `other`. Padrão `primary`; um contato principal por empresa (constraint parcial abaixo).
- `crm_proposal_status`: `draft`, `sent`, `accepted`, `rejected`, `expired`.
- `crm_company_source`: `site_contact`, `referral`, `event`, `outbound`, `other`.

### 4.2 Tabelas

**`crm_company`** — cadastro de empresa (prospect ou cliente).
- `id uuid pk`, `name text not null`, `slug text unique not null`, `cnpj text` (14 dígitos, sem formatação; validação Zod), `website text`, `industry text`, `size text` (livre: "1-10", "11-50", ...), `source crm_company_source not null default 'outbound'`, `owner_id uuid not null references users(id)`, `notes text`, `archived_at timestamptz`, `linked_organization_id uuid references organizations(id) on delete set null` (só preenche quando a empresa vira cliente com acesso ao portal), `created_at`, `updated_at`.
- Índices: `crm_company_name_trgm` (gin, pg_trgm), `crm_company_owner_idx`, `crm_company_archived_idx` (parcial: `where archived_at is null`).

**`crm_contact`** — pessoa dentro de uma empresa.
- `id uuid pk`, `company_id uuid not null references crm_company(id) on delete cascade`, `name text not null`, `email text` (opcional; se preenchido, normalizado por `normalizeEmail`), `phone text`, `role crm_contact_role not null default 'primary'`, `title text` (cargo livre), `notes text`, `archived_at timestamptz`, `owner_id uuid not null references users(id)`, `created_at`, `updated_at`.
- Índices: `crm_contact_company_idx`, `crm_contact_email_trgm`, `crm_contact_name_trgm`.
- Constraint parcial: `unique (company_id) where role = 'primary' and archived_at is null` — no máximo um contato principal ativo por empresa.

**`crm_opportunity`** — negócio em andamento.
- `id uuid pk`, `company_id uuid not null references crm_company(id) on delete cascade`, `primary_contact_id uuid references crm_contact(id) on delete set null`, `title text not null`, `stage crm_opportunity_stage not null default 'new'`, `value_cents bigint`, `currency char(3) not null default 'BRL'`, `expected_close_at date`, `next_step text`, `next_step_at date`, `owner_id uuid not null references users(id)`, `won_at timestamptz`, `lost_at timestamptz`, `lost_reason text`, `created_at`, `updated_at`.
- Índices: `crm_opportunity_stage_idx`, `crm_opportunity_company_idx`, `crm_opportunity_owner_idx`, `crm_opportunity_next_step_idx` (parcial: `where stage not in ('won','lost')`).
- Regra de aplicação: mudar `stage` para `won` grava `won_at = now()`, zera `lost_at`; mudar para `lost` exige `lost_reason` e grava `lost_at`. Reabertura (voltar para estágio anterior) zera `won_at`/`lost_at`. Regra vive em `actions.ts:changeOpportunityStage`.

**`crm_interaction`** — histórico de contato.
- `id uuid pk`, `type crm_interaction_type not null`, `at timestamptz not null`, `by_user_id uuid not null references users(id)`, `summary text not null`, `body text`, `company_id uuid references crm_company(id) on delete cascade`, `contact_id uuid references crm_contact(id) on delete set null`, `opportunity_id uuid references crm_opportunity(id) on delete cascade`, `deleted_at timestamptz`, `created_at`, `updated_at`.
- Índices: `crm_interaction_company_at_idx (company_id, at desc)`, `crm_interaction_opportunity_at_idx (opportunity_id, at desc)`, `crm_interaction_contact_at_idx (contact_id, at desc)`.
- Check constraint: `coalesce(company_id, opportunity_id, contact_id) is not null` — precisa ancorar em pelo menos uma entidade.

**`crm_proposal`** — proposta comercial registrada.
- `id uuid pk`, `number text not null unique` (formato `PROP-{YY}-{seq}`, gerado por sequência Postgres `crm_proposal_seq_{YY}` criada na primeira proposta do ano), `opportunity_id uuid not null references crm_opportunity(id) on delete cascade`, `title text not null`, `value_cents bigint not null`, `currency char(3) not null default 'BRL'`, `status crm_proposal_status not null default 'draft'`, `sent_at timestamptz`, `valid_until date`, `decided_at timestamptz`, `decision_notes text`, `file_id uuid references files(id) on delete set null`, `owner_id uuid not null references users(id)`, `created_at`, `updated_at`.
- Índices: `crm_proposal_opportunity_idx`, `crm_proposal_status_idx`.
- Anexo: usa o módulo `files` da Fase 1 (`uploadFile` → recebe `id` de `files`; a proposta guarda o FK). Download só via `getDownloadUrl` (URL assinada 5 min). Anexo é opcional na `draft`, obrigatório para mover para `sent`.

**Alteração em `leads` (Fase 1 → Fase 2):**
- Adiciona `converted_company_id uuid references crm_company(id) on delete set null`.
- Adiciona `converted_contact_id uuid references crm_contact(id) on delete set null`.
- Adiciona `converted_opportunity_id uuid references crm_opportunity(id) on delete set null`.
- Adiciona `converted_at timestamptz`.
- Adiciona `converted_by uuid references users(id)`.
- O status `lead_status` passa a ter três valores: `new`, `seen`, `converted` (novo). Migration `alter type` acrescenta.
- Índice `leads_converted_at_idx` para separar convertidos de não convertidos no filtro do admin.

### 4.3 Regras de integridade

- Arquivar uma empresa não apaga oportunidades. Um filtro na UI esconde por padrão empresas arquivadas. Oportunidades de empresa arquivada continuam visíveis no funil (com selo "empresa arquivada") até serem manualmente `lost` ou `won`.
- Deletar um `user` não é permitido pela Fase 1 (só desativação por `active=false`). Owner de tabelas CRM segue sendo esse usuário; nenhuma cascade quebra.
- Deletar um `file` cascateia para `crm_proposal.file_id = null` (o registro da proposta sobrevive sem o anexo).

---

## 5. Autorização

Todas as queries e actions de CRM recebem `ctx: AdminContext` como primeiro argumento e são precedidas por `await requireAdmin()` na rota. Nenhuma tabela CRM recebe `organizationId`; `requirePortal()` nunca é chamado. O middleware da Fase 1 (`src/proxy.ts`) já barra qualquer não-autenticado em `/admin/*`; `requireAdmin()` faz `notFound()` para `client`.

Não há permissão granular dentro do papel `admin` (a Fase 2 assume um único operador). `owner_id` é registro de propriedade, não gate de acesso: outro admin (dia em que houver) enxerga e edita tudo.

---

## 6. UI e design system

### 6.1 Novo padrão: grupo colapsável na sidebar

A sidebar do admin da Fase 1 é uma lista flat. A Fase 2 adiciona **um** grupo colapsável ("CRM") com quatro sub-itens (Empresas, Contatos, Funil, Propostas). O grupo é o único item que muda de forma; os demais continuam flat.

Especificação do padrão (emenda ao `docs/specs/design-system.md`):

- Cabeçalho do grupo: texto em Fragment Mono 0.8125rem uppercase-off (sentence case), `--fg-muted`, sem sublinhado, ícone chevron 12 px à direita. Não é clicável como link; clicar alterna colapso.
- Sub-itens: recuo de 12 px em relação aos itens flat; mesma tipografia e tamanho de item raiz; selo `aria-current="page"` marca o ativo.
- Estado colapsado é padrão só quando o admin nunca abriu o grupo. Uma vez aberto, o estado persiste em `localStorage` chave `egd_admin_nav`.
- Um sub-item ativo força o grupo aberto (sub-navegação sempre visível se você está nela).
- Sem animação de altura variável; toggle instantâneo. Motivo: manter a regra "só cor/borda/opacidade" do design system.

### 6.2 Sub-navegação dentro de `/admin/crm/*`

O `layout.tsx` de `/admin/crm/` renderiza uma **barra de abas horizontal logo abaixo da topbar**, com os quatro sub-itens (Empresas, Contatos, Funil, Propostas). Motivo: cliente com sidebar colapsada precisa enxergar onde está dentro do CRM. A aba ativa herda `--accent-strong` na borda inferior; texto herda `--fg`.

### 6.3 Telas

Mockups HTML (a serem aprovados antes do código):

1. **`admin-crm-funil.html`** — kanban de seis colunas (Novo, Qualificado, Reunião, Proposta, Ganho, Perdido). Cards mostram título, empresa, valor formatado (`R$ 42.000,00`, Fragment Mono tabular), próximo passo com data se `next_step_at` estiver no passado ou hoje (destaque `--warning-soft`). Drag & drop entre colunas dispara `changeOpportunityStage`; mudar para "Perdido" abre modal pedindo motivo. Filtros de topo: owner (só um hoje, mas layout pronto), busca por texto, "esconder ganhas/perdidas" (padrão: esconde).
2. **`admin-crm-empresa.html`** — detalhe de empresa. Cabeçalho com nome, botão "Editar", selo de status (ativa/arquivada). Corpo em três colunas: **dados** (CNPJ, site, setor, tamanho, origem, notas), **contatos** (lista com selo de papel; ação "adicionar contato"), **oportunidades** (lista com estágio e valor). Abaixo: **linha do tempo de interações** unificada (empresa + contatos + oportunidades), com botão "Registrar interação" que abre modal.
3. **`admin-crm-oportunidade.html`** — detalhe. Cabeçalho com título, empresa (link), estágio (selo colorido; sequência dos seis), valor, previsão. Corpo: próximo passo com data, notas, propostas vinculadas (lista com número, valor, status, data de envio, link de download do anexo). Timeline de interações filtrada pela oportunidade.
4. **`admin-crm-proposta.html`** — detalhe. Cabeçalho com número (`PROP-26-014`), título, valor, status (selo). Corpo: dados, empresa e oportunidade vinculadas, anexo (nome do arquivo, tamanho, botão "Baixar"), datas (enviada em, válida até, decidida em), notas de decisão.
5. **`admin-crm-converter-lead.html`** — modal disparado na tela de leads. Passo 1: mostra lead (nome, e-mail, empresa, mensagem). Sugere empresa existente se o domínio do e-mail bate com empresa cadastrada — usuário escolhe "Vincular a esta empresa" ou "Criar empresa nova". Passo 2: se criar nova, formulário reduzido (nome, CNPJ, site). Passo 3: contato (nome pré-preenchido do lead). Passo 4: oportunidade (título pré-preenchido com `Contato pelo site — {name}`, valor em branco, estágio `new`). Confirmar cria tudo em transação e leva para `/admin/crm/oportunidades/{id}`. Cancelar não escreve nada.

### 6.4 Anti-padrões (herdados e explícitos)

Nenhum item novo. Continuam proibidos: gradiente decorativo, grid de três cards com ícone, emoji em título, seta "→" em link, reveal on scroll, animação de entrada de seção, fontes Inter/Roboto/Arial/Helvetica/system-ui como principal, valores monetários com fonte proporcional.

### 6.5 Copy

Direto, sentence case, específico. Exemplos de referência:

- Botões: "Nova empresa", "Registrar interação", "Enviar proposta", "Marcar como ganha", "Marcar como perdida", "Converter em empresa".
- Sucesso: "Oportunidade criada.", "Proposta PROP-26-014 marcada como enviada.", "Lead convertido em empresa e oportunidade."
- Erro: "Esse CNPJ já está cadastrado em '{nome}'.", "Uma proposta enviada precisa ter arquivo anexado.", "Você removeu o motivo obrigatório da perda."
- Vazios: "Sem oportunidades neste estágio.", "Nenhuma interação registrada.", "Nenhuma proposta ainda."
- Todo texto novo passa por `stop-slop` (herdado da Fase 1).

---

## 7. Integração com outros módulos

### 7.1 `leads` (Fase 1)

A tela `/admin/leads` ganha coluna "Convertido em" e botão "Converter" por linha. A ação `submitContact` não muda — continua gravando lead sem tocar em CRM. A conversão é sempre disparada por um admin.

Regra de sugestão: `suggestCompanyByEmailDomain(email: string, ctx): Promise<CrmCompany | null>` extrai o domínio do e-mail do lead, ignora domínios "públicos" (lista fixa em `convert-lead.ts`: `gmail.com`, `hotmail.com`, `outlook.com`, `yahoo.com`, `icloud.com`, ~30 no total), e busca `crm_company` com `website ilike '%${domain}%'` ou com contato cujo e-mail termine com `@${domain}`. Se achar exatamente uma, sugere. Se achar zero ou mais de uma, oferece criação.

### 7.2 `files` (Fase 1)

`crm_proposal.file_id` referencia `files.id`. Upload do anexo usa `uploadFile` (limite 50 MB, sanitização de nome, chave no bucket). Download só por `getDownloadUrl` (URL assinada 5 min). Deletar o arquivo (via `/admin/arquivos`) põe `file_id = null` na proposta (`on delete set null`); a proposta continua existindo com aviso na UI.

### 7.3 `mail` (Fase 1)

A Fase 2 **não** dispara e-mail para o cliente. Nenhum e-mail transacional novo. Motivo: envio de proposta com e-mail rastreado abre discussão de entregabilidade, templates ricos e engajamento — fora do escopo. Se o admin quiser enviar por e-mail, faz por fora e registra como `interaction { type: 'email' }`.

Uma exceção considerada e descartada: notificação para o admin quando uma proposta expira (`valid_until < today`). Ficaria bonito, mas exige job agendado que a Fase 1 não tem infra para (um container, sem worker). Fica para quando houver agendador.

### 7.4 `audit`

Toda action CRM chama `audit()` com `actorId = ctx.user.id`, `organizationId = null`, `entityType = "crm_company"|"crm_contact"|"crm_opportunity"|"crm_interaction"|"crm_proposal"|"lead"`, `entityId` = id do registro, e `action` seguindo a convenção `crm.<verbo>`:

- `crm.company.created`, `crm.company.updated`, `crm.company.archived`, `crm.company.unarchived`, `crm.company.linked_to_organization`.
- `crm.contact.created`, `crm.contact.updated`, `crm.contact.archived`.
- `crm.opportunity.created`, `crm.opportunity.updated`, `crm.opportunity.stage_changed` (metadata: `from`, `to`), `crm.opportunity.won`, `crm.opportunity.lost` (metadata: `reason`).
- `crm.interaction.created`, `crm.interaction.updated`, `crm.interaction.deleted`.
- `crm.proposal.created`, `crm.proposal.updated`, `crm.proposal.sent`, `crm.proposal.accepted`, `crm.proposal.rejected`, `crm.proposal.file_attached`.
- `crm.lead.converted` (metadata: `company_id`, `contact_id`, `opportunity_id`).

Metadata nunca contém CNPJ inteiro, e-mail, telefone ou nome — só ids. Motivo (Fase 1, §4): audit_log não guarda dado sensível.

### 7.5 `tenancy`

Empresa CRM que vira cliente com acesso ao portal continua sendo modelada em `organizations` (tenancy). A Fase 2 adiciona **um** botão: "Vincular a organização do portal" na tela de detalhe da empresa. Ele abre um seletor com organizações existentes e grava `crm_company.linked_organization_id`. Não cria organização automaticamente. Convite para o portal continua sendo criado em `/admin/organizacoes/[id]` (fluxo Fase 1). Motivo: cadastro no portal envolve política de acesso e cobrança; separar da atividade comercial mantém as decisões isoladas.

---

## 8. Tratamento de erros

Tudo dentro do padrão `ActionResult<T>` da Fase 1. Nenhuma action lança para o cliente.

Casos que a spec obriga a tratar por nome:

1. **CNPJ duplicado ao criar empresa** — retorna `fail("Esse CNPJ já está cadastrado em 'Acme LTDA'.", { fieldErrors: { cnpj: [...] } })`. Não revela id, revela nome (o admin é a única audiência).
2. **Mudança de estágio para `lost` sem `lostReason`** — `fieldErrors.lostReason` obriga o preenchimento antes da persistência.
3. **Anexar arquivo com mimetype incompatível** — herda checagem do módulo `files`; erro é passado adiante.
4. **Marcar proposta como `sent` sem anexo** — falha com mensagem "Uma proposta enviada precisa ter arquivo anexado."
5. **Converter lead já convertido** — a ação verifica `converted_at is not null` e retorna `fail("Este lead já foi convertido em '{nome da empresa}'.")` com link para a empresa.
6. **Conversão em duas abas simultaneamente** (corrida) — action envolve tudo em `db.transaction(async (tx) => …)`; a segunda cai no caminho do item 5.
7. **Arquivar empresa com oportunidades abertas** — permite, mas mostra confirmação `"Esta empresa tem N oportunidades abertas. Arquivar assim mesmo?"`. Não fecha as oportunidades.

Correlation id vem do `logger` da Fase 1; erros inesperados aparecem para o admin como "Erro ao registrar. Código: {id8}" e vão para o log estruturado.

---

## 9. Testes

Cobertura mínima antes de merge:

**Vitest (unidade):**
- `convert-lead.ts` — sugestão por domínio: match único, múltiplos matches, domínio público, e-mail vazio, e-mail inválido, empresa arquivada não sugere.
- `proposal-number.ts` — formato, incremento por ano, virada de ano, transação concorrente (mock da sequência).
- Regra de estágio: `won` grava `won_at`; `lost` sem `reason` falha; reabrir zera `won_at`.
- Constraint "único contato principal por empresa" — dois com role `primary` na mesma empresa: segundo falha.
- `crm_interaction` sem âncora — check constraint recusa.
- Validação Zod: CNPJ com 13 dígitos, valor negativo, moeda diferente de `BRL`, `next_step_at` no passado (permitido — só a UI destaca).

**Integração (`vitest.integration.config.ts`, contra Postgres do compose):**
- Conversão de lead cria company + contact + opportunity em uma transação; rollback em erro deixa banco intacto.
- Mudança de estágio grava `audit_log` com `from` e `to`.
- Deletar arquivo do módulo `files` seta `crm_proposal.file_id = null`.
- Numeração `PROP-YY-seq` é atômica sob 10 inserts concorrentes.

**Playwright (e2e):**
- Admin cria empresa, adiciona contato principal, cria oportunidade, arrasta no funil de `new` para `qualified`, registra interação, gera proposta com anexo (`.pdf` de teste), marca como enviada.
- Admin converte um lead do site em empresa nova + contato + oportunidade; volta para `/admin/leads` e confirma que o lead sumiu do filtro "Novos" e aparece em "Convertidos" com link para a empresa.
- Cliente logado com role `client` acessa `/admin/crm/empresas` e recebe 404 (não 403).
- Sub-navegação do CRM: entrar por `/admin/crm/empresas`, clicar em "Funil", confirmar aba ativa e URL.

**Visual (Playwright screenshot):**
- Kanban vazio, kanban com cards em todas as colunas, empresa arquivada, proposta sem anexo com selo de aviso — comparadas contra baseline aprovada dos mockups.

---

## 10. Migração e rollout

- **Migrations Drizzle** — uma migration única `0002_crm.sql` (a Fase 1 tem `0001_*`) cria enums, cinco tabelas CRM, altera `leads`. Todas as adições em `leads` são nullable e sem default cheio; migration não bloqueia tabela de tamanho relevante.
- **Ordem de tarefas do plano** — mockups → aprovação → migrations → módulo `crm` (schema, queries, actions) → sub-navegação da sidebar → páginas admin → integração leads → testes → deploy.
- **Feature flag** — nenhuma. O CRM é 100% admin; publicar antes de estar completo não afeta cliente. Se algo não estiver pronto ao merge, fica atrás da rota `/admin/crm/*` sem link na sidebar.
- **Deploy** — mesmo pipeline da Fase 1 (GHCR + Coolify). Migrations rodam no `docker-entrypoint.sh` antes do servidor subir.
- **Rollback** — descartar a migration exige `drop table` das cinco tabelas CRM (nenhuma FK de fora para elas) e `alter table leads drop column ...`. Documentar no plano de implementação como último recurso; preferência é rollforward (corrigir e reaplicar).

---

## 11. Escopo negativo consolidado

Registrado aqui para não voltar como pedido de escopo silencioso durante a implementação:

- Nenhum e-mail transacional novo (nem para cliente, nem para admin, nem para alertar expiração de proposta).
- Nenhum agendador / job periódico.
- Nenhuma tela no portal do cliente (Fase 4 desenha o portal).
- Nenhuma alteração em `requireAdmin`/`requirePortal`.
- Nenhum novo item no menu do portal do cliente.
- Nenhum novo tipo de rate limit (só admin logado escreve no CRM; rate limit da Fase 1 no login já cobre).
- Nenhum novo cabeçalho de segurança ou variável de ambiente.
- Nenhum novo bucket S3, nenhuma nova SMTP.
- Nenhuma tela pública nova.
- Nenhum backfill retroativo dos leads existentes para o CRM. Convertem quando o admin quiser.

---

## 12. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Kanban com drag-and-drop quebra em mobile | Fallback em mobile: cada card tem menu "Mover para..." com lista de estágios. Playwright cobre os dois caminhos. |
| Sequência anual de proposta gera lacunas em transação abortada | Aceito: `PROP-26-014` seguido de `PROP-26-016` é irrelevante para o admin. Regeneração pós-fato não vale o custo. |
| Empresa duplicada (mesmo CNPJ inserido por variação) | Zod normaliza CNPJ para 14 dígitos e a `unique` no banco recusa. Sem CNPJ, aceita duplicado — a busca por nome expõe. |
| Perda do padrão de sidebar ao introduzir grupo colapsável | Mockup passa por aprovação separada. Emenda ao design system versionada. Se recusado, cai para plano B: quatro itens flat na raiz, com "CRM" só como prefixo textual. |
| Módulo cresce sem se apoiar em `queries.ts`/`actions.ts` | Lint rule (ou revisão) proíbe importar `@/lib/db` fora de `src/modules/*/queries.ts` e `actions.ts`. Se a lint rule não estiver pronta, revisão manual no PR marca. |
| Auditoria enche com `crm.opportunity.stage_changed` no primeiro drag confuso | Aceitável — o audit é apêndice imutável. `metadata.from` e `metadata.to` facilitam filtrar noise. |
| Volume esperado esgota `ILIKE` sem índice | Trigram (gin) em `name` e `email` cobre até dezenas de milhares de linhas com folga. Volume esperado da EGD: ordem de centenas. |

---

## 13. Review focus

Cinco pontos que o revisor precisa cravar antes do merge:

1. **Multi-tenancy: tabelas CRM não têm `organization_id`** — checar que nenhuma query CRM chama `requirePortal()` nem filtra por org. `requireAdmin()` em toda rota `/admin/crm/*`.
2. **Conversão lead → CRM em transação** — `convertLead` roda tudo dentro de `db.transaction`; se o insert de oportunidade falha, empresa e contato somem. Testado por integração.
3. **Regra de estágio `lost` sem `lostReason`** — validação Zod e path de `changeOpportunityStage`. Não pode ser gravado sem `reason`. Auditoria carrega `reason` em `metadata`.
4. **Anexo obrigatório em proposta `sent`** — `updateProposalStatus` recusa transição `draft → sent` (ou `draft → sent` implícita) sem `file_id`. Erro é fieldError, não toast.
5. **Sub-navegação do admin com `client`** — role `client` batendo em `/admin/crm/empresas` recebe `notFound()`; teste e2e cobre.

---

## 14. Convenções de commit e branch

- Branch: `fase-2-crm` (uma só; sub-tarefas viram commits pequenos).
- Mensagens de commit terminam com `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` (atualizado do rodapé da Fase 1, que citava Fable 5.1).
- PR único para a `main` ao final, com checklist dos itens do §13 (Review focus) marcados.
