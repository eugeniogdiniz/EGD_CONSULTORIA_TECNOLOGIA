# EGD — Fase 16: documento da proposta (PDF a partir do modelo da marca) e envio por e-mail

**Data:** 2026-10-03
**Status:** aprovado (o dono pediu para seguir com o backlog priorizado em 2026-10-03)
**Base:** "Fora do escopo" da Fase 2 (geração de PDF de proposta a partir de template; envio de proposta por e-mail) e o modelo `docs/brand/kit-comercial/documentos/proposta-comercial.{html,md}` do kit comercial.
**Depende de:** Fase 14 (nada novo de notificação; só o `deliver()` com anexo).

## Objetivo

A proposta no CRM é título, valor e validade; o documento em si é feito fora (Word do kit) e anexado à mão, e o envio é por fora com uma interação registrada manualmente. Esta fase traz o documento para dentro: a equipe preenche as seções do modelo da marca na própria proposta, gera o PDF com um clique (anexado automaticamente, versionado) e envia por e-mail ao contato da empresa, com a interação registrada e o status mudando para Enviada.

**Sucesso:** uma proposta nasce, é escrita, vira PDF no padrão do kit comercial e chega ao cliente sem sair do sistema; a linha do tempo da oportunidade mostra o envio; o arquivo anexado é sempre a última versão gerada.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Geração do PDF | **No servidor, sem navegador**, com `pdfkit` (JS puro: cabe na imagem Alpine e no VPS de 1 vCPU). Layout A4 reproduz a estrutura do modelo do kit: cabeçalho com logo, kicker, título, 11 seções numeradas, tabelas, assinaturas, rodapé com paginação. | Chromium/Playwright no servidor (≈400 MB na imagem, memória no VPS); "imprimir em PDF" pelo navegador (não anexa sozinho nem permite enviar por e-mail); serviço externo de PDF (dado de proposta em terceiro). |
| Fonte | Archivo (`public/brand/fonts/archivo.woff2`, já no repositório) embutida pelo `fontkit` do pdfkit; se a fonte falhar ao carregar, Helvetica padrão com `logger.warn`. | Baixar TTF em build (rede no build). |
| Logo | `public/brand/logo-horizontal.png`, lido do disco em runtime (o standalone copia `public/`). | SVG (pdfkit não renderiza SVG sem lib extra). |
| Conteúdo | Coluna `document jsonb` em `crm_proposal`, validada por `proposalDocumentSchema` (zod): `projectName`, `context`, `objective`, `approach[] {stage, description}`, `deliverables[] {title, acceptance, due}`, `assumptions`, `scopeLimits`, `governance`, `technology`, `investment[] {item, amountCents, condition}`, `paymentTerms`, `continuity`, `place`. Campos vazios saem do PDF (seção omitida) em vez de aparecerem como `[A PREENCHER]`. | Tabelas filhas por seção (over-engineering para um documento); markdown livre (perde a estrutura do modelo). |
| Valor | A tabela "Investimento" lista os itens informados e fecha com o **total = `valueCents` da proposta**. Se a soma dos itens difere do total, a tela avisa (não bloqueia: itens podem ser parciais). | Total derivado dos itens (quebraria propostas sem itens). |
| Versão | `document_version int` incrementa a cada geração; o nome do arquivo é `PROP-26-001-v2.pdf`; o PDF traz "versão N" no cabeçalho. Gerar substitui `file_id` (o anterior continua em `files` para auditoria). | Guardar todas as versões ligadas à proposta (sem demanda). |
| Quando pode gerar | Em `draft` e `sent` (reenvio com correção). `accepted`/`rejected`/`expired`: documento somente leitura. Editar o conteúdo só em `draft` (regra atual da proposta). | Gerar em qualquer status. |
| Prévia | `GET /admin/crm/propostas/[id]/documento/pdf` gera na hora, sem gravar, e responde `application/pdf` inline (o navegador mostra). | HTML paralelo (dois renderizadores do mesmo conteúdo). |
| Envio por e-mail | Diálogo "Enviar por e-mail": contato da empresa (com e-mail) e mensagem (texto padrão editável). Envia com o PDF anexo; se `draft`, muda para `sent` (`sentAt = hoje`, mesma regra do `changeProposalStatus`); cria `crm_interaction { type: "email", summary: "Proposta PROP-26-001 enviada para Nome" }` ligada a empresa, contato e oportunidade; grava `emailed_at`, `contact_id`. Exige PDF gerado da versão atual (sem arquivo → não envia). | Enviar link para o cliente baixar (abriria acesso sem login); portal do cliente ver propostas (fase própria). |
| Anexo no e-mail | `deliver()` ganha `attachments?` (nodemailer). O PDF é lido do storage (`getObject`) para anexar. | Regenerar na hora de enviar (o que vai deve ser exatamente o que está anexado). |
| Auditoria | `crm.proposal.document_updated`, `crm.proposal.pdf_generated` (metadata `version`, `fileId`), `crm.proposal.emailed` (metadata `contactId`, `version`; nunca o e-mail). | — |

## Telas

- **Detalhe da proposta** (`/admin/crm/propostas/[id]`): bloco **Documento** com estado ("Nenhum PDF gerado" / "PDF v2 gerado em 03/10/2026 · 3 páginas") e ações: **Editar documento** (vai para a página do documento), **Gerar PDF** (`ConfirmAction`; substitui o anexo), **Ver PDF** (prévia inline em nova aba), **Enviar por e-mail** (diálogo; desabilitado sem PDF ou sem contato com e-mail). O bloco Arquivo continua aceitando anexo manual (quem preferir o Word do kit).
- **Documento** (`/admin/crm/propostas/[id]/documento`): formulário longo em seções, na ordem do modelo; listas (abordagem, entregas, investimento) com linhas adicionáveis; "Salvar" (só `draft`); aviso quando a soma dos itens difere do valor; botão "Ver PDF" ao lado. Em status não rascunho, campos somente leitura.
- Linha do tempo da oportunidade: a interação de e-mail aparece como as demais (sem tela nova).

## Arquitetura

```
src/modules/crm/
  schema.ts            + document jsonb, document_version int, contact_id uuid, emailed_at timestamptz
  document.ts          proposalDocumentSchema, emptyDocument(), investmentMismatch(doc, valueCents) (puros)
  proposal-pdf.ts      renderProposalPdf(input) → Promise<Buffer> (pdfkit; puro fora do fs da fonte/logo)
  actions.ts           updateProposalDocument, generateProposalPdf, sendProposalByEmail
  form-actions.ts      updateProposalDocumentForm, generateProposalPdfForm, sendProposalByEmailForm
  queries.ts           getProposal traz document/version/contact; listCompanyContactsWithEmail
  components/proposal-document-form.tsx, send-proposal-dialog.tsx
src/lib/storage.ts     getObject(key): Promise<Buffer>
src/modules/mail/send.ts, templates.ts   deliver com attachments; renderProposalEmail
src/app/(admin)/admin/crm/propostas/[id]/documento/page.tsx
src/app/(admin)/admin/crm/propostas/[id]/documento/pdf/route.ts
next.config.ts         serverExternalPackages: ["pdfkit"] (fontes AFM lidas do pacote em runtime)
src/db/migrations/0014_proposal_document.sql
```

Dependência nova: `pdfkit` (+ `@types/pdfkit` em dev). A imagem de produção usa o build standalone: o `output file tracing` leva `pdfkit` e `fontkit` por serem importados no servidor; `public/` já é copiado pelo Dockerfile.

## Testes

- **Unitários** (`tests/unit/crm/document.test.ts`, `proposal-pdf.test.ts`): schema aceita vazio e recusa 13 entregas / valor negativo; `investmentMismatch`; `renderProposalPdf` devolve buffer que começa com `%PDF-`, tem N páginas (`/Type /Page` sem `s`) e contém o número da proposta em metadados (`/Title`); documento vazio gera uma página sem erro; textos longos quebram sem exceção.
- **Integração** (`tests/integration/crm/proposal-document.test.ts`): `updateProposalDocument` só em `draft`; `generateProposalPdf` grava `files` interno, `file_id`, `document_version = 1` depois `2`, audita; `sendProposalByEmail` sem PDF falha; com PDF muda `draft → sent`, cria interação `email` com contato, grava `emailed_at`, e o Mailpit recebe mensagem com anexo `PROP-…-v1.pdf` (API do Mailpit, `Attachments`); contato de outra empresa é recusado.
- **E2E** (`tests/e2e/proposta-pdf.spec.ts`): admin cria empresa/contato/oportunidade/proposta pelas telas (reusa o fluxo do `crm.spec`), preenche contexto e uma entrega no documento, salva, gera PDF, vê "PDF v1", a rota `documento/pdf` responde `application/pdf`, envia por e-mail ao contato, status vira Enviada e a oportunidade mostra a interação. Rota `documento` nas verificações de acessibilidade e console.

## Fora do escopo

Propostas no portal do cliente, aceite eletrônico/assinatura, link público de visualização, modelos alternativos de documento, numeração de versão exposta ao cliente além do cabeçalho, PDF dos demais documentos do kit (contrato, aditivo, NDA), edição colaborativa.
