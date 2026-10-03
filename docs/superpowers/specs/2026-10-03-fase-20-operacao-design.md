# EGD — Fase 20: operação e robustez (erros rastreados, backup lógico diário, limite de taxa no banco, busca global)

**Data:** 2026-10-03
**Status:** aprovado (continuação do backlog pedida em 2026-10-03)
**Base:** backlog de operação levantado em 2026-10-03: sem rastreio de erros, backup dependente de configuração manual no Coolify, limite de taxa em memória, sem busca global.

## Objetivo

Hoje um erro em produção só aparece se alguém abrir os logs do container; o backup é uma tela do Coolify que ninguém confere; o limite de taxa vive na memória de um processo; e achar "aquela proposta" exige lembrar em qual tela ela está. Esta fase dá ao dono visibilidade de erros e de backup dentro do sistema, tira o limite de taxa da memória e cria a busca única.

**Sucesso:** um erro de servidor vira uma linha agrupada em `/admin/erros`, com a mesma referência que o usuário viu na tela; todo dia um backup lógico do banco cai no storage e o dono é avisado se ele falhar ou envelhecer; dois containers compartilham os mesmos limites; `/admin/busca` acha empresa, contato, oportunidade, proposta, projeto, entrega, solicitação, ata e organização pelo nome ou número.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Rastreio de erros | `onRequestError` do `instrumentation.ts` grava em `app_error (id, fingerprint, message, stack, path, method, route_kind, digest, user_id, count, first_seen_at, last_seen_at, resolved_at)`; o fingerprint é `sha256(nome + mensagem + primeira linha útil do stack)`, e ocorrências repetidas só incrementam `count`/`last_seen_at`. `/admin/erros` (dono): agrupados, mais recentes primeiro, com "resolver" (some da lista, volta se reaparecer). O `error.tsx` continua mostrando o `digest`, que é o que a pessoa relata. Notificação `error.spike` ao dono quando um fingerprint novo aparece (uma por fingerprint por dia). | Sentry (DSN, conta e dado em terceiro; fica como opção futura via env); só logs. |
| Backup lógico | Automação `backup-diario` (todo dia 03:30): para cada tabela do schema `public`, `select json_agg` → `backups/AAAA-MM-DD/<tabela>.json.gz` no bucket; grava `manifest.json` com contagens; apaga pastas com mais de 14 dias; resumo com tamanho total. Notificação `backup.failed` ao dono quando a execução falha. A tela de automações já mostra a última execução. Não substitui o backup do Coolify (§8): é a rede de segurança que o sistema mesmo confere. | `pg_dump` (não existe na imagem Alpine do Node); backup por streaming COPY (mais código para o mesmo resultado com banco pequeno). |
| Restauração | Documentada no runbook: baixar a pasta do dia, `jq`/script `scripts/restore-backup.mjs` que insere tabela a tabela em banco vazio respeitando a ordem das FKs (usa a ordem do manifest). Testada em integração com duas tabelas. | Botão "restaurar" na interface (destrutivo demais). |
| Limite de taxa | Tabela `rate_limit_bucket (key, window_start, count, pk)`; `createPgRateLimiter` com janela fixa e `insert … on conflict do update set count = count + 1 returning count`; limpeza das janelas velhas na automação de limpeza. Usado pelo formulário de contato, pela API pública e pelo limite por e-mail do login. O limite por IP interno do Better Auth continua em memória (é a camada secundária; a defesa contra força bruta é o limite por e-mail, que passa ao banco). | Redis (infra nova no VPS); `storage: "database"` do Better Auth (tabela e modelo próprios do plugin, sem ganho sobre o limite por e-mail). |
| Busca global | `/admin/busca?q=`: `ilike` em empresas (nome, CNPJ), contatos (nome, e-mail), oportunidades (título), propostas (número, título), projetos (título), entregas (título), solicitações (título), atas (título), organizações (nome). Até 8 por grupo; mínimo 2 caracteres. Caixa de busca no topo do admin (formulário GET). Colaborador vê só projetos, entregas, solicitações e atas. | Índice de texto completo (volume não justifica); busca no portal (o cliente tem poucas telas). |
| Auditoria | `error.resolved`; execuções de backup ficam em `job_run`. | — |

## Arquitetura

```
src/instrumentation.ts                 onRequestError → modules/errors/capture.ts (nunca lança)
src/modules/errors/{schema,capture,queries,actions,form-actions}.ts
src/modules/backup/{run.ts,restore.ts}  dump por tabela, manifest, retenção; restauração por manifest
src/lib/storage.ts                     listObjects, deleteObjects, putObject (gzip)
src/lib/rate-limit.ts                  createPgRateLimiter (mesma interface)
src/modules/rate-limit/schema.ts       rate_limit_bucket
src/modules/search/{queries.ts}        searchAll(ctx, q)
src/app/(admin)/admin/{erros,busca}/page.tsx; componente SearchBox no AppShell (slot topRight do admin)
src/modules/jobs/registry.ts           backup-diario; limpeza inclui rate_limit_bucket
src/modules/notifications/kinds.ts     error.spike, backup.failed
scripts/restore-backup.mjs
src/db/migrations/0018_operacao.sql
```

## Testes

- **Unitários**: `fingerprint` estável para o mesmo erro e diferente para outro; `createPgRateLimiter` com relógio injetado (janela, estouro, reset) via função pura de janela; `searchGroups` (quais grupos por papel); `planRestoreOrder(manifest)`.
- **Integração**: `captureError` agrupa duas ocorrências e reabre resolvido; `resolveError` audita; limitador no banco entre duas instâncias (dois `createPgRateLimiter` com a mesma chave compartilham a contagem); `runBackup` grava objetos e manifest no RustFS e a retenção apaga pasta antiga; `restoreTables` em banco de teste repõe linhas de `crm_service`; `searchAll` acha por nome e número e respeita o papel.
- **E2E** (`tests/e2e/operacao.spec.ts`): busca no topo acha a empresa e a proposta criadas; `/admin/erros` abre (vazia ou com linhas) e resolver funciona com um erro gerado por rota de teste (`/admin/erros/testar`, só fora de produção); automação `backup-diario` com "Executar agora" mostra "N tabelas · X KB". Rotas em acessibilidade e console limpo.

## Fora do escopo

Sentry/OpenTelemetry, alertas por SMS, backup de arquivos do storage (o RustFS tem o próprio volume), restauração pela interface, métricas de desempenho, busca no portal.
