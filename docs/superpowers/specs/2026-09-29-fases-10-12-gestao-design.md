# EGD — Fases 10 a 12: demandas, priorização, atas de reunião e relatórios

**Data:** 2026-09-29
**Status:** Fases 10, 11 e 12 implementadas (Fase 12: `docs/superpowers/specs/2026-09-30-fase-12-relatorios-design.md`)
**Por quê:** o sistema já tem projetos, fases, marcos, entregas em kanban, horas, financeiro e solicitações de clientes, mas não permite **priorizar**, não tem uma **visão única de demandas** entre projetos, não registra **atas de reunião** e não gera **relatórios**. Prioridade do dono: desenvolver a gestão de demandas, kanbans, projetos, priorização, relatórios e atas.

## Fase 10 — Demandas e priorização
| Decisão | Escolha |
|---------|---------|
| Prioridade | Enum `work_priority`: `urgent`, `high`, `medium` (padrão), `low`. Em `project_deliverable` e `portal_request`. Regra de ordem em função pura: prioridade, depois prazo (sem prazo por último), depois criação. |
| Demanda | Uma **demanda** é uma entrega aberta (`status <> done`) de qualquer projeto ativo. Não cria entidade nova: `/admin/demandas` é a visão transversal (lista priorizada + quadro por status) com filtros por projeto, responsável, prioridade, status e "atrasadas". |
| Solicitação → demanda | Triagem: o admin define a prioridade da solicitação e a **converte em entrega** de um projeto (fase, responsável, prazo, visível ao cliente). A solicitação guarda o vínculo (`deliverable_id`), passa a "Em andamento" e o cliente recebe uma mensagem/e-mail com o que foi registrado. |
| Onde aparece | Selo de prioridade nos cartões do kanban, no detalhe da entrega e nas listas; seletor no diálogo da entrega. Sidebar "Demandas"; KPI "Demandas urgentes" no painel. |

## Fase 11 — Atas de reunião
`meeting` por projeto (ou da empresa): título, data/hora, local, participantes (equipe e externos), pauta, discussão, decisões, **itens de ação** que viram entregas (responsável, prazo, prioridade) ligadas à ata. Opção de compartilhar a ata com o cliente (portal, somente leitura) e visão imprimível.

## Fase 12 — Relatórios
(1) Relatório de status do projeto (imprimível e CSV): resumo, progresso por fase, marcos, entregas por status, atrasadas e bloqueios, horas e custo vs orçamento, últimas atas. (2) Portfólio: todos os projetos ativos lado a lado. (3) Semanal: concluído na semana e vencendo nos próximos 7 dias, por projeto. (4) Versão para o cliente no portal (sem custos).

## Fora do escopo
Estimativas e burndown, dependência entre projetos, automações por e-mail agendado, edição colaborativa em tempo real das atas.
