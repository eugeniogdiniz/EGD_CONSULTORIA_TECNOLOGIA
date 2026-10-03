# Fase 16 — Documento da proposta em PDF e envio por e-mail: plano de implementação

**Goal:** Escrever o documento da proposta no sistema, gerar o PDF no padrão do kit comercial (anexado e versionado) e enviá-lo por e-mail ao contato, com interação registrada e status Enviada.

**Spec:** `docs/superpowers/specs/2026-10-03-fase-16-proposta-pdf-design.md`.

## Global Constraints

- Única dependência nova: `pdfkit` (+ tipos). Sem navegador no servidor.
- Fonte Archivo do repositório; fallback Helvetica com aviso em log.
- Editar documento só em `draft`; gerar em `draft`/`sent`; enviar exige PDF da versão atual.
- O e-mail leva exatamente o arquivo anexado (lido do storage), nunca um PDF regenerado.
- Auditoria sem e-mail do contato nos metadados.

## Tasks

### Task 1: Schema do documento (puro) e migration
- [ ] `document.ts` (zod, `emptyDocument`, `investmentMismatch`) + testes; colunas em `crm_proposal`; `0014_proposal_document.sql`.

### Task 2: Renderizador PDF
- [ ] `npm i pdfkit` / `npm i -D @types/pdfkit`; `serverExternalPackages`.
- [ ] `proposal-pdf.ts`: layout A4 do modelo (cabeçalho, seções, tabelas, assinaturas, rodapé paginado); fonte e logo com fallback.
- [ ] Testes unitários (buffer, páginas, metadados, vazio, textos longos).

### Task 3: Actions e storage
- [ ] `storage.getObject`; `deliver` com `attachments`; `renderProposalEmail`.
- [ ] `updateProposalDocument`, `generateProposalPdf`, `sendProposalByEmail`; queries.
- [ ] Integração (Mailpit com anexo).

### Task 4: Telas
- [ ] Página `documento` (formulário em seções, listas dinâmicas, aviso de soma); rota `documento/pdf`.
- [ ] Bloco Documento no detalhe; diálogo Enviar por e-mail.

### Task 5: E2E, docs, PR
- [ ] `tests/e2e/proposta-pdf.spec.ts`; rotas; runbook §18; README.
- [ ] `npm run build` local para confirmar que o pdfkit entra no standalone; verificação completa; PR `fase-16-proposta-pdf`.
