# EGD — Fase 18: financeiro (faturamento, rate por projeto com histórico, horas por pessoa, estimativas e burndown)

**Data:** 2026-10-03
**Status:** aprovado (continuação do backlog pedida em 2026-10-03)
**Base:** "Fora do escopo" da Fase 3.5 (faturamento real, múltiplos rates, rate histórico) e das Fases 10–12 (estimativas e burndown); backlog "relatório de horas por pessoa e período".

## Objetivo

O financeiro do projeto para no "orçamento × custo × receita aceita". Não há parcelas, vencimentos nem o que foi recebido; o rate é um só por pessoa e mudar o rate reescreve o passado; não existe relatório de horas para fechar o mês; e as entregas não têm estimativa, então não dá para saber se o projeto está consumindo mais do que o previsto. Esta fase fecha esses quatro pontos sem virar um sistema contábil.

**Sucesso:** o dono cadastra as parcelas do projeto, marca o que recebeu e vê vencido/a receber no painel; uma parcela vencida vira aviso no sistema e no resumo diário; o custo de horas antigas não muda quando o rate muda; o fechamento do mês sai de uma tela com CSV; cada entrega tem estimativa e o projeto mostra o burndown.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Parcelas | `project_invoice (id, project_id, number int, description, amount_cents, due_at date, status pending\|paid\|cancelled, paid_at date, notes, created_by, created_at, updated_at)`. "Vencida" é derivada (`pending` e `due_at < hoje`), não um status gravado. Número sequencial por projeto. | Status `overdue` gravado (precisaria de job para virar); integração com nota fiscal/boleto (fora). |
| Onde | Bloco **Faturamento** em `/admin/projetos/[id]/financeiro` (dono): tabela, nova parcela, marcar paga (data), cancelar, editar enquanto pendente. Cards: faturado, recebido, a receber, vencido. | Tela própria de faturamento (uma a mais para o mesmo dono). |
| Aviso de vencida | Resumo diário ganha a seção **Financeiro** (vencidas e vencendo em 7 dias). Automação `parcelas-vencidas` (seg–sex 08:30) cria **uma** notificação por dia ao dono (`invoice.overdue`, e-mail ligado por padrão) com a contagem e o total, só quando há vencida. Painel do dono: KPI "A receber" com dica "N vencidas". | E-mail por parcela (ruído). |
| Rate por projeto e histórico | `project_rate (project_id, user_id, hourly_rate_cents)` sobrescreve o rate da pessoa naquele projeto. **Toda entrada de tempo grava `rate_cents`** no momento em que fecha (timer parado ou manual): rate do projeto, senão o da pessoa, senão nulo. Custo = `minutes × rate_cents / 60`; entradas antigas sem snapshot continuam usando o rate atual da pessoa (`coalesce`). | Tabela de histórico de rate por período (mais complexa e o snapshot resolve o mesmo problema). |
| Horas por pessoa e período | `/admin/relatorios/horas?de=&ate=&pessoa=&projeto=` (dono): linhas por pessoa → projeto, com minutos e custo; total; CSV com o mesmo filtro. Padrão: mês corrente. | Relatório por entrega (já existe no financeiro do projeto). |
| Estimativas | `project_deliverable.estimate_minutes` (campo "Estimativa (h)" no diálogo da entrega, decimal em horas). Financeiro do projeto: coluna Estimado e Δ por entrega; totais. | Estimativa por fase (deriva da soma). |
| Burndown | `/admin/projetos/[id]/burndown` (equipe): SVG puro, semanas desde o início do projeto (primeira fase ou criação) até hoje ou o último prazo; linha "restante" = soma das estimativas não concluídas naquela semana (concluída = `completed_at`); linha ideal do total até o último prazo. Função pura `buildBurndown`. Sem estimativa em nenhuma entrega, a tela explica como preencher. | Gráfico interativo (lib). |
| Quem vê | Faturamento, rates, horas por pessoa e custo: só o dono. Estimativa e burndown: equipe (não têm dinheiro). Portal não vê nada disto. | — |
| Auditoria | `project.invoice.created\|updated\|paid\|cancelled`, `project.rate.set`, `project.deliverable.updated` já cobre a estimativa. | — |

## Arquitetura

```
src/modules/projects/
  schema-extras.ts     projectInvoice, projectRate; projectTimeEntry.rateCents; projectDeliverable.estimateMinutes (schema.ts)
  invoices.ts          puras: invoiceState(inv, today), summarizeInvoices(list, today)
  burndown.ts          pura: buildBurndown(deliverables, { from, to, today })
  validation.ts        invoiceSchema, rateSchema, estimateHours no deliverableSchema
  actions.ts           createInvoice, updateInvoice, markInvoicePaid, cancelInvoice, setProjectRate; timer/manual gravam rate_cents
  queries.ts           listInvoices, listProjectRates, resolveRateFor(projectId, userId), listHoursByPerson(filters); custos com coalesce(rate_cents)
  components/invoice-form.tsx, rate-form.tsx
src/modules/reports/hours.ts   buildHoursReport (puro) + CSV
src/modules/jobs/digests/daily.ts   seção Financeiro (vencidas / 7 dias)
src/modules/jobs/registry.ts        parcelas-vencidas
src/modules/notifications/kinds.ts  invoice.overdue (admin/dono)
src/modules/dashboard/queries.ts    receivables (a receber, vencido)
src/app/(admin)/admin/projetos/[id]/financeiro/page.tsx   Faturamento, Rates, Estimado × apontado
src/app/(admin)/admin/projetos/[id]/burndown/page.tsx
src/app/(admin)/admin/relatorios/horas/{page.tsx,csv/route.ts}
src/db/migrations/0016_finance.sql
```

## Testes

- **Unitários**: `invoiceState`/`summarizeInvoices` (pendente, vencida, paga, cancelada; totais); `buildBurndown` (sem estimativa, concluída na semana certa, ideal linear, projeto sem prazo); custo com `rate_cents` snapshot vs rate atual (`computeFinancials` recebe o rate resolvido); `buildHoursReport` agrupa por pessoa e projeto e fecha o total.
- **Integração**: parcelas (criar, pagar, cancelar, numeração por projeto, vencida derivada); `setProjectRate` e snapshot: entrada fechada antes da mudança mantém o custo, nova entrada usa o novo rate; `listHoursByPerson` respeita período e pessoa; job `parcelas-vencidas` cria uma notificação por dia e nenhuma sem vencida; resumo diário traz a seção Financeiro.
- **E2E** (`tests/e2e/financeiro.spec.ts`): dono cria parcela, marca paga, vê cards; define rate do projeto; preenche estimativa numa entrega e abre o burndown; abre `/admin/relatorios/horas` e baixa o CSV; colaborador recebe 404 em horas e 200 no burndown. Rotas novas em acessibilidade e console limpo.

## Fora do escopo

Nota fiscal, boleto/PIX, conciliação bancária, impostos, multa/juros, parcelas recorrentes, previsão de caixa, custo por hora com encargos, aprovação de horas, metas de utilização.
