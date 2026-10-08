# EGD — Fase 23: contrato e termo de aceite gerados a partir do sistema

**Data:** 2026-10-04
**Status:** aprovado (continuação do backlog pedida em 2026-10-04)
**Base:** "Fora do escopo" da Fase 16 (PDF dos demais documentos do kit) e da Fase 22 (contrato gerado a partir do aceite). Modelos: `docs/brand/kit-comercial/documentos/contrato-prestacao-servicos.md` e `termo-aceite.md`.

## Objetivo

Depois do aceite da proposta, o contrato ainda é feito no Word do kit, à mão, copiando dados que o sistema já tem (empresa, contato, objeto, entregas, preço e condições). E a entrega aprovada pelo cliente no portal não gera o documento de aceite que o kit prevê. Esta fase gera os dois no servidor, a partir dos dados do CRM, do documento da proposta e do aceite registrado.

**Sucesso:** com a proposta aceita, um clique gera o contrato em PDF com partes, objeto, anexo de escopo e investimento preenchidos; o dono revisa, ajusta campos e emite a versão final; uma entrega aprovada pelo cliente gera o termo de aceite com a evidência da aprovação. Nada sai sem revisão humana.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Dados jurídicos | Da EGD: chaves em `app_setting` (`legal.razao_social`, `legal.cnpj`, `legal.endereco`, `legal.representante`, `legal.cargo`, `legal.foro`) editáveis em `/admin/configuracoes` (bloco "Dados da empresa"). Do cliente: `crm_company` ganha `legal_name`, `address`, `representative_name`, `representative_role`; CNPJ já existe. Campo vazio aparece no PDF entre colchetes, como no kit, e a tela avisa o que falta. | Tabela própria de "entidade jurídica" (dois registros não justificam). |
| Contrato | `crm_contract (id, proposal_id, number "CT-AA-NNN", status draft\|issued\|signed, document jsonb, version, file_id, issued_at, signed_at, created_by, …)`. `document` = campos editáveis do modelo: vigência (início, prazo), responsáveis, periodicidade de reuniões, canal de registro, garantia, foro, dados de pagamento, mais as cláusulas-padrão (texto do kit, editável só em "texto livre" por seção). Gerado a partir da proposta aceita: objeto = título e documento da proposta; Anexo I = entregas e investimento do documento; preço = valor da proposta; parcelas = `project_invoice` do projeto se existirem. Botões: **Gerar PDF** (versiona, anexa como arquivo interno), **Emitir** (bloqueia edição), **Marcar assinado** (data). | Assinatura eletrônica integrada (fora); cláusulas por IA (não). |
| Termo de aceite | Gerado por entrega aprovada no portal: objeto, data da conclusão, aprovação (nome, usuário, data, hash de IP), "ressalvas" opcionais do dono. PDF anexado à entrega como arquivo (não substitui o arquivo da entrega: `project_deliverable.acceptance_file_id`). Botão na entrega do admin quando a última decisão é `approved`. | Termo assinado pelo cliente (o aceite no portal já é a evidência). |
| Renderização | O mesmo `pdfkit` da Fase 16, com um renderizador de **blocos** (`doc-pdf.ts`): título, kicker, h2/h3, parágrafo, lista, tabela, assinaturas, rodapé paginado. O texto do kit vira dados estruturados em `contract-template.ts` (seções e parágrafos com placeholders `{{chave}}`). | Markdown → HTML → Chromium (sem navegador); copiar o `.docx` do kit (sem motor de templates). |
| Numeração | `CT-AA-NNN` por função Postgres igual à das propostas (`crm_next_contract_number`). | Sequência global sem ano. |
| Visibilidade | Só o dono (`requireOwner`). O cliente **vê o contrato emitido no portal** em `/portal/propostas/[id]` ("Contrato") para baixar, sem aceite eletrônico nesta fase. | — |
| Auditoria | `crm.contract.created\|updated\|pdf_generated\|issued\|signed`, `project.deliverable.acceptance_pdf_generated`, `setting.updated` (dados legais), `crm.company.updated` (campos legais). | — |

## Arquitetura

```
src/modules/contracts/{schema,template,document,actions,queries,form-actions}.ts, components/contract-form.tsx
src/modules/crm/doc-pdf.ts                  renderizador genérico de blocos (reusa fontes/logo/rodapé do proposal-pdf)
src/modules/crm/acceptance-pdf.ts           termo de aceite
src/modules/crm/schema.ts                   campos legais da empresa
src/modules/settings/queries.ts             chaves legal.*
src/app/(admin)/admin/crm/propostas/[id]/page.tsx        bloco Contrato (gerar a partir do aceite)
src/app/(admin)/admin/crm/contratos/[id]/{page.tsx,pdf/route.ts}
src/app/(admin)/admin/configuracoes/page.tsx             bloco Dados da empresa
src/app/(admin)/admin/projetos/[id]/entregas/[deliverableId]/page.tsx   botão Termo de aceite
src/app/(portal)/portal/propostas/[id]/page.tsx          bloco Contrato (baixar emitido)
src/db/migrations/0021_contratos.sql (tabela, campos, função de numeração)
```

## Testes

- **Unitários**: `fillTemplate` (placeholders, campos vazios viram `[CHAVE]`), `contractFromProposal` (objeto, anexo com entregas e investimento, parcelas), `formatContractNumber`, renderizador de blocos (PDF válido, N páginas, tabela quebra página).
- **Integração**: criar contrato a partir de proposta aceita (recusa em `sent`), numeração anual, gerar PDF v1/v2, emitir bloqueia edição, marcar assinado; termo de aceite só com entrega aprovada; campos legais da empresa e da EGD gravados e refletidos; portal vê só contrato emitido.
- **E2E** (`tests/e2e/contratos.spec.ts`): dono preenche os dados da empresa em Configurações, cria o contrato da proposta aceita da fixture, gera o PDF (rota responde `application/pdf`), emite; cliente baixa em Propostas; dono gera o termo de aceite da entrega aprovada.

## Fora do escopo

Assinatura eletrônica/ICP, aditivo e NDA gerados (próxima rodada), versionamento com diff, cláusulas condicionais complexas, tradução.
