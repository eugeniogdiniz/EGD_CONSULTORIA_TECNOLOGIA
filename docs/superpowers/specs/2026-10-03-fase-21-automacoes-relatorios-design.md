# EGD — Fase 21: automações e relatórios (horários configuráveis, retentativa com backoff, webhooks de saída, chaves de API com expiração, comparação entre períodos)

**Data:** 2026-10-03
**Status:** aprovado (continuação do backlog pedida em 2026-10-03)
**Base:** "Fora do escopo" da Fase 13 (horários configuráveis, retentativa com backoff), da Fase 6 (webhooks de saída, expiração e rotação de chaves) e da Fase 12 (comparação entre períodos, gráficos).

## Objetivo

As automações rodam em horários fixos em código, tentam de novo a cada minuto até três vezes e só a EGD é avisada do que acontece; a API só recebe; as chaves nunca expiram; e os relatórios mostram a semana sem dizer se melhorou ou piorou. Esta fase fecha os quatro itens que ficaram listados desde as Fases 6, 12 e 13.

**Sucesso:** o dono muda o horário de uma automação pela tela; uma falha de SMTP espera 5, 15 e 45 minutos antes de desistir; um sistema externo recebe `lead.created`, `proposal.sent`, `project.deliverable.done` e `request.created` por webhook assinado; uma chave de API tem validade e é rotacionada sem janela sem serviço; o portfólio e o semanal mostram a variação contra o período anterior.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Horário configurável | `job_setting` ganha `hour`, `minute` (nulos = padrão do código). A tela de automações ganha um campo de horário por linha (HH:MM, Brasília). A chave de período não muda (dia/semana); só o "devido a partir de". | Cron expression (desnecessário para um dono só). |
| Retentativa com backoff | `decideClaim` passa a exigir espera entre tentativas: 5 min depois da 1ª falha, 15 min depois da 2ª (a 3ª é a última). Nunca ultrapassa o período. | Tentativa a cada minuto (SMTP instável vira três falhas em três minutos). |
| Webhooks de saída | `webhook_endpoint (id, url, secret_hash?, secret (cifrado? não: guardado em claro só para assinar), events text[], active, created_by, created_at, last_delivery_at, failure_count)` e `webhook_delivery (id, endpoint_id, event, payload jsonb, status pending\|ok\|failed, attempts, next_attempt_at, response_status, error, created_at, delivered_at)`. Eventos: `lead.created`, `proposal.sent`, `proposal.accepted`, `project.deliverable.done`, `request.created`, `invoice.paid`. Entrega assíncrona pelo agendador (tique a cada minuto processa `pending` com `next_attempt_at <= now`), `POST` JSON com cabeçalhos `X-EGD-Event`, `X-EGD-Delivery`, `X-EGD-Signature: sha256=HMAC(secret, timestamp.body)` e `X-EGD-Timestamp`; 5 tentativas com backoff (1, 5, 15, 60, 180 min); endpoint com 20 falhas seguidas é desativado e o dono avisado. Tela `/admin/api` ganha a aba Webhooks: criar (URL, eventos, segredo gerado e mostrado uma vez), testar (envia `ping`), ver últimas entregas, reativar. | Entrega síncrona na action (lentidão e falha acoplada ao fluxo); fila externa. |
| Chaves de API | `api_key.expires_at` (opcional; padrão 1 ano na criação); chave expirada responde 401 `expired`. **Rotacionar**: gera uma chave nova com os mesmos escopos e mantém a antiga por 7 dias (`revoked_at` futuro), mostrando a nova uma vez. Aviso `api_key.expiring` ao dono 14 dias antes (automação diária). | Rotação com revogação imediata (derruba a integração). |
| Comparação entre períodos | Relatório semanal: ao lado de concluído/vence/atrasado, a variação contra a semana anterior (▲/▼ e número). Portfólio: coluna "Δ 7 dias" de atrasadas e de progresso por projeto (snapshot diário leve em `project_daily_snapshot (project_id, day, done_count, open_count, overdue_count, progress_pct)` gravado pela automação diária existente). | Gráficos interativos (fora); comparar com qualquer período arbitrário (uma semana contra a anterior cobre o uso). |
| Auditoria | `job.setting.updated` (com horário), `webhook.created\|updated\|tested\|deactivated\|reactivated`, `api_key.rotated`, `api_key.expired` (sistema). | — |

## Arquitetura

```
src/modules/jobs/{schema,schedule,claim,registry,queries,actions}.ts   hour/minute por job; backoff; snapshot diário; aviso de chave expirando; entrega de webhooks no tique
src/modules/webhooks/{schema,sign,queue,deliver,actions,queries,form-actions,components}.ts
src/modules/api-keys/{schema,actions,auth,queries}.ts   expires_at, rotate
src/modules/reports/{build,queries}.ts + snapshot                         Δ período
src/app/(admin)/admin/api/page.tsx (abas Chaves/Webhooks), automacoes/page.tsx (horário)
src/db/migrations/0019_automacoes_relatorios.sql
```

## Testes

- **Unitários**: `isDue` com horário sobrescrito; `decideClaim` com backoff (1ª falha → espera 5 min; antes disso `null`; 2ª → 15 min; 3ª não tenta); `sign`/`verify` do webhook (HMAC e janela de tempo); `nextAttemptAt(attempts)`; `buildWeekly` com comparação; `portfolioDelta(snapshots)`; `isExpired(key, now)`.
- **Integração**: horário salvo muda o `isDue`; webhook enfileirado por `lead.created`, entregue a um servidor HTTP local do teste com assinatura válida, falha → nova tentativa agendada, 20 falhas → desativado; rotação de chave mantém a antiga por 7 dias e a nova funciona; chave expirada responde 401; snapshot diário grava e o portfólio calcula Δ.
- **E2E** (`tests/e2e/automacoes-webhooks.spec.ts`): dono muda o horário de uma automação e vê a próxima execução recalculada; cria um webhook, testa (`ping`), vê a entrega `ok` (servidor de eco levantado pelo próprio teste); rotaciona uma chave e a antiga continua válida; o relatório semanal mostra a variação. Rotas em acessibilidade e console limpo.

## Fora do escopo

Cron expression, webhooks de entrada além de leads, retentativa manual por entrega (fica "reenviar" simples), OAuth, gráficos interativos, comparação com períodos arbitrários.
