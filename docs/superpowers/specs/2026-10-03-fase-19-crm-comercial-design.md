# EGD — Fase 19: CRM comercial (catálogo de serviços, previsão de receita e conversão)

**Data:** 2026-10-03
**Status:** aprovado (continuação do backlog pedida em 2026-10-03)
**Base:** "Fora do escopo" da Fase 2 (catálogo de produtos/serviços e itens de proposta com preço; dashboards de conversão e previsão de receita).

## Objetivo

A proposta (Fase 16) lista itens de investimento digitados à mão, sem padrão nem preço de referência; o funil mostra oportunidades por estágio mas não responde "quanto deve entrar nos próximos meses" nem "quanto do que entra eu ganho". Esta fase cria o catálogo de serviços da EGD, liga o catálogo aos itens da proposta e entrega uma tela de previsão e conversão a partir dos dados que o CRM já guarda.

**Sucesso:** o dono cadastra os serviços com preço de referência uma vez e monta o investimento da proposta escolhendo da lista; a tela de previsão mostra o pipeline ponderado por estágio, o esperado por mês de fechamento, a taxa de conversão e o ciclo médio, com CSV.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Catálogo | `crm_service (id, name, description, unit, default_price_cents, active, position, created_at, updated_at)`. Tela `/admin/crm/servicos` (dono): lista, criar, editar, ativar/desativar, reordenar por posição. Unidade livre e curta ("hora", "mês", "projeto"). | Produtos com SKU, impostos e variações (não é loja). |
| Catálogo → proposta | No formulário do documento, a tabela Investimento ganha "Adicionar do catálogo": escolhe o serviço, quantidade e o item entra com `item = nome`, `amountCents = preço × quantidade`, `condition` em branco. O item continua editável e não guarda vínculo com o serviço (o documento é um snapshot). | FK do item para o serviço (mudar o preço reescreveria propostas antigas). |
| Probabilidade por estágio | Fixa em código: `new` 10 %, `qualified` 25 %, `meeting` 50 %, `proposal` 70 %, `won` 100 %, `lost` 0 %. | Probabilidade editável por oportunidade (vira chute); configurável (uma tela a mais). |
| Previsão | `/admin/crm/previsao` (dono): (1) pipeline aberto por estágio: quantidade, valor e **valor ponderado**; (2) **esperado por mês** de `expected_close_at` nos próximos 6 meses (ponderado), com "sem data" à parte; (3) **conversão** nos últimos 90 e 365 dias: ganhas ÷ (ganhas + perdidas), ticket médio das ganhas, **ciclo médio** (criação → ganho) em dias; (4) **motivos de perda** mais comuns (texto livre agrupado por igualdade, só os 10 primeiros). Função pura `buildForecast(opportunities, today)`; CSV das três tabelas. | Gráficos interativos; forecast por vendedor (uma pessoa). |
| Painel | KPI "Funil aberto" do dono ganha a dica "ponderado R$ X". | — |
| Estágios configuráveis | **Continua fora**: o enum de seis estágios atende uma consultoria com um vendedor; mudar exigiria migrar kanban, funil, previsão e relatórios. | — |
| Auditoria | `crm.service.created\|updated\|archived\|unarchived`. | — |

## Arquitetura

```
src/modules/crm/
  schema.ts            crmService
  forecast.ts          STAGE_PROBABILITY, buildForecast (puro), forecastCsv
  validation.ts        serviceSchema
  actions.ts           createService, updateService, setServiceActive
  queries.ts           listServices, loadForecastInput
  components/service-form.tsx; proposal-document-form.tsx ("Adicionar do catálogo")
src/app/(admin)/admin/crm/servicos/page.tsx
src/app/(admin)/admin/crm/previsao/{page.tsx,csv/route.ts}
src/app/(admin)/admin/crm/_components/tabs.tsx   abas Serviços e Previsão
src/db/migrations/0017_crm_services.sql
```

## Testes

- **Unitários**: `buildForecast` (ponderação por estágio; meses futuros e "sem data"; conversão 90/365 com ganhas e perdidas fora da janela; ticket médio; ciclo médio; motivos agrupados); `serviceSchema` (preço em centavos, unidade curta).
- **Integração**: criar/editar/desativar serviço com auditoria e ordem; `listServices({ activeOnly })`; `loadForecastInput` traz só o necessário.
- **E2E** (`tests/e2e/crm-comercial.spec.ts`): dono cria um serviço, abre o documento de uma proposta, adiciona o serviço do catálogo com quantidade 2 e vê o item com o valor multiplicado; abre `/admin/crm/previsao` e baixa o CSV. Rotas em acessibilidade e console limpo.

## Fora do escopo

Estágios configuráveis, metas e quotas, comissionamento, forecast por vendedor, enriquecimento externo, WhatsApp/telefonia, sequências de e-mail.
