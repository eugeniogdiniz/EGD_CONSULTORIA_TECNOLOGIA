# EGD — Fase 22: aceites no portal (proposta e entrega)

**Data:** 2026-10-04
**Status:** aprovado (continuação do backlog pedida em 2026-10-04)
**Base:** "Fora do escopo" da Fase 4 (edição pelo cliente: aprovar entrega, marcar aceite) e da Fase 16 (propostas no portal, aceite eletrônico).

## Objetivo

A proposta chega ao cliente por e-mail e o aceite volta por e-mail ou telefone, registrado à mão pelo dono; a entrega é marcada concluída pela equipe e o cliente só olha. Esta fase fecha os dois ciclos dentro do portal: o cliente vê as propostas da organização, baixa o PDF e **aceita ou recusa** com evidência gravada; numa entrega concluída, **aprova** ou **pede ajustes**, e a equipe é avisada.

**Sucesso:** o dono envia a proposta e o cliente aceita no portal sem trocar e-mails; a tela do admin mostra quem aceitou, quando, de onde e qual versão do PDF; uma entrega concluída só é dada como aceita quando o cliente aprovar, e um pedido de ajustes volta a entrega para a equipe com o motivo.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Propostas visíveis | Da empresa vinculada à organização, com arquivo anexado e status `sent`, `accepted`, `rejected` ou `expired`. Rascunho nunca aparece. Regra pura `proposalVisibleToClient`. | Mostrar rascunhos "em preparação" (confunde). |
| Aceite | `crm_proposal_decision (proposal_id pk, user_id, decision accepted\|rejected, name, notes, ip_hash, user_agent, file_id, document_version, decided_at)`: uma decisão por proposta. Aceitar exige o nome digitado e a caixa "li e aceito"; recusar exige motivo. Só em `sent` (expirada: o portal orienta a pedir renovação). A proposta muda de status com o mesmo efeito do admin (interação na linha do tempo, auditoria com o usuário do cliente, webhook `proposal.accepted`). | Assinatura digital com certificado (fora); aceite por link sem login (abre acesso sem conta). |
| Evidência | Bloco "Aceite" na proposta do admin: nome, usuário, data, IP (hash) e agente, arquivo e versão aceitos. Nunca mostra o IP em claro. | — |
| Entrega: aprovação | `project_deliverable_acceptance (id, deliverable_id, user_id, decision approved\|changes_requested, notes, created_at)` com histórico; a última decisão manda. Só entregas `done` e visíveis. **Aprovar** registra; **Pedir ajustes** exige motivo, cria um comentário do cliente com o texto e volta a entrega para `doing`. Aprovar de novo depois de ajustes é permitido (nova linha). | Status novo "aceita" no enum (mexeria em kanban, relatórios e portal). |
| Avisos | Admin: `proposal.decided` (aceita/recusada pelo cliente), `deliverable.approved`, `deliverable.changes_requested`. Cliente: `proposal.sent` quando uma proposta é enviada e a empresa tem portal (link para `/portal/propostas/[id]`). | — |
| Telas | Portal: item **Propostas** na sidebar; `/portal/propostas` (lista com status e valor); `/portal/propostas/[id]` (dados, baixar PDF, aceitar/recusar ou a decisão já tomada). Entrega no portal: bloco "Sua aprovação" quando concluída. Admin: bloco "Aceite" na proposta; selo "Aprovada pelo cliente" / "Ajustes solicitados" na entrega e na lista de entregas do portal. | — |
| Auditoria | `portal.proposal.accepted\|rejected`, `portal.deliverable.approved\|changes_requested`; os já existentes `crm.proposal.accepted\|rejected` continuam sendo gravados com o ator cliente. | — |

## Arquitetura

```
src/modules/portal-proposals/{rules,queries,actions,form-actions}.ts  + schema (crm_proposal_decision em crm/schema.ts)
src/modules/portal-projects/{actions,queries,form-actions}.ts         approveDeliverable, requestDeliverableChanges, latestAcceptance
src/modules/projects/schema-extras.ts                                  projectDeliverableAcceptance
src/modules/notifications/{kinds,events}.ts                            4 tipos novos
src/modules/crm/actions.ts                                             notifica proposal.sent ao cliente quando a empresa tem portal
src/app/(portal)/portal/propostas/{page.tsx,[id]/page.tsx,[id]/baixar/route.ts}
src/app/(portal)/layout.tsx                                            item Propostas
src/app/(admin)/admin/crm/propostas/[id]/page.tsx                      bloco Aceite
src/app/(admin)/admin/projetos/[id]/entregas/[deliverableId]/page.tsx  selo de aprovação
src/db/migrations/0020_aceites.sql
```

## Testes

- **Unitários**: `proposalVisibleToClient` (status × arquivo), `decisionSchema` (nome e caixa no aceite, motivo na recusa), `acceptanceState(list)` (última decisão; vazio).
- **Integração**: cliente de outra organização não vê nem decide; rascunho não aparece; aceitar muda status, grava evidência, interação, auditoria e notifica o dono; recusar grava motivo; segunda decisão é recusada; aprovar entrega exige `done` e visível; pedir ajustes volta para `doing`, cria comentário e notifica a equipe; `proposal.sent` notifica os membros quando a empresa tem portal.
- **E2E** (`tests/e2e/aceites.spec.ts`): admin gera PDF e envia a proposta de uma empresa vinculada à organização A → cliente A vê em Propostas, baixa, aceita → admin vê "Aceita" e o bloco de evidência; cliente aprova a entrega concluída da fixture e pede ajustes em outra. Rotas em acessibilidade e console limpo.

## Fora do escopo

Assinatura com certificado digital, aceite por link sem login, múltiplos aprovadores, aceite parcial por item, contrato gerado a partir do aceite (fase seguinte).
