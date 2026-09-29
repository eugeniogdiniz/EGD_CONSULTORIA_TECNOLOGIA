# EGD Consultoria & Tecnologia — Fase 5: Cases editáveis no admin

**Data:** 2026-09-28
**Status:** implementada (branch `fase-5-cases`, baseada em `fase-4-portal-projetos`)
**Depende de:** Fase 1. Alimenta a Fase 6 (API pública de conteúdo).

## 1. Objetivo

Os 13 cases do site (`/cases`, totais da home e de `/sobre`) estavam fixos em `src/content/cases.ts`. Passam a viver no banco, com CRUD no admin, e o site lê de lá.

**Escopo:** cases. Outros textos do site continuam em código; podem virar tabela quando houver necessidade real.

## 2. Decisões

| Decisão | Escolha | Descartado |
|---------|---------|------------|
| Tabela | `site_case` (slug único, nome, setor, porte enum, sistemas, automações, economia e CAPEX em centavos, destaque, publicado, entregas `jsonb string[]`, nota de status). | CMS genérico de blocos (over-engineering para 13 registros). |
| Dados iniciais | A própria migration `0004` insere os 13 cases atuais (`ON CONFLICT DO NOTHING`), para o site não ficar vazio em produção. | Script de seed separado (fácil esquecer no deploy). |
| Contrato com o site | `toPublicCase` devolve o mesmo formato (`nome`, `setor`, `economia`...) que as páginas consumiam; só a fonte mudou. | Reescrever as páginas. |
| Slug | Gerado do nome na criação; **não muda** ao editar (âncoras `/cases#slug` estáveis). | Slug editável. |
| Ordem | Por economia decrescente (mesma regra do ledger). Sem ordenação manual. | Campo `position`. |
| Renderização | Páginas do site `force-dynamic`: build do Docker não precisa de banco. Ao salvar, `revalidatePath` de `/`, `/cases`, `/sobre`. | ISR (o build tentaria consultar o banco). |
| Despublicar | `published=false` tira do site e dos totais sem apagar. | Só excluir. |
| Auditoria | `case.created/updated/published/unpublished/deleted`. | — |

## 3. Fora do escopo
Upload de logo por case, ordenação manual, versões/rascunhos por campo, tradução.
