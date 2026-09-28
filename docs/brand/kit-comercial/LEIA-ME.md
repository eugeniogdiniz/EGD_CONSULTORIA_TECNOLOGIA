# EGD · Kit comercial e papelaria

## Conteúdo

- Contrato de prestação de serviços: 6 páginas, incluindo anexos de escopo/investimento e tratamento de dados.
- Proposta comercial: 3 páginas.
- Acordo de confidencialidade mútuo: 2 páginas.
- Termo aditivo, termo de entrega/aceite e papel timbrado: 1 página cada.
- Documentos em DOCX nativo editável, PDF, HTML e Markdown. PDFs são a referência visual; o Word pode repaginar conforme as fontes e o aplicativo.
- Logo em SVG e PNG, prancha em PDF e manual da marca.
- Cartão frente/verso em SVG editável, PNG e PDF, com versões de corte e sangria.
- Assinatura de e-mail em HTML e texto; contato em vCard; QR que aponta para https://egdsystem.com.br.

Abra `index.html` para navegar pelo kit. Nenhum material foi publicado ou enviado a terceiros.

## Preencher e adaptar

O nome EGD é usado como marca, sem presumir razão social. Razão social, CNPJ, endereço, poderes de representação, dados do cliente, valores, prazos, foro e regime de direitos permanecem entre colchetes. Não usar CNPJs fictícios de mockups do projeto. Preencher ou marcar expressamente como não aplicável; retirar as notas de minuta apenas após revisão. Proposta e contrato não estão assinados.

As cláusulas são uma base de trabalho, não parecer jurídico. Validar a aplicação ao negócio com profissional habilitado antes da assinatura, em especial direitos sobre software, rescisão, dados pessoais e condições comerciais. Os anexos são parte do contrato e devem ser preenchidos junto com ele.

## Edição

Editar DOCX em Word ou editor compatível. O conteúdo é texto e tabelas nativos, não uma imagem. A tipografia indicada é Archivo; a versão WOFF2 e licença incluídas atendem aos HTMLs e SVGs. Para Word, instalar a família Archivo em formato de desktop a partir da fonte oficial indicada no manual, ou revisar a paginação com a fonte substituta. Os PDFs já incorporam as fontes usadas na exportação.

Para regenerar: dados em `docs/brand/templates/dados-comerciais.json`; textos em `docs/brand/templates/documentos.py`; executar `node scripts/build-brand-kit.mjs` na raiz do projeto. O script gera e verifica os PDFs, imagens e pacote ZIP. Não grava dados no CRM nem publica arquivos.

## Cartão e gráfica

Tamanho final: **90 × 50 mm**. Arquivo com sangria: **96 × 56 mm**, com 3 mm adicionais em cada lado; cortar 3 mm para obter o formato final. Conteúdo essencial está afastado pelo menos 4 mm da linha de corte. PDF tem duas páginas: frente e verso. Solicitar prova para orientação do verso antes de imprimir em lote. Não imprimir a prancha como arte de corte.

Os arquivos usam RGB/sRGB, sem perfil CMYK específico, certificação PDF/X ou marcas de corte. A gráfica deve aplicar o perfil adequado e confirmar acabamento, conversão de cor e imposição. Não reduzir o QR nem remover sua margem branca. PNGs do cartão são exportados com pelo menos 300 ppi equivalentes; os SVGs preservam vetores.

## Assinatura de e-mail

Abra `papelaria/assinatura-email.html`, copie o bloco visual e cole no editor de assinatura do seu provedor. **Insira `logos/logo-horizontal.png` como imagem pelo próprio editor de e-mail**: o caminho relativo do HTML é para prévia local e não funciona sozinho na mensagem recebida. Também é possível substituir o caminho por uma URL HTTPS pública após publicar o logo. Faça um envio de teste por conta própria. A versão `.txt` funciona sem imagens. O kit não envia mensagens nem instala a assinatura na conta.

## Dados usados

Nome, cargo, telefone, LinkedIn e GitHub: referência horizontal fornecida pelo cliente. Marca, site, e-mail e cidade: conteúdo institucional do projeto. Dados legais e condições comerciais: não informados.

## Referências jurídicas consultadas

Consultadas em 27/09/2026 como apoio à redação da minuta, sem transcrição extensa:

- [Código Civil — Lei 10.406/2002](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm): disciplina contratual e prestação de serviços.
- [Lei do Software — Lei 9.609/1998](https://www.planalto.gov.br/ccivil_03/leis/l9609.htm): direitos sobre programas e licenciamento.
- [LGPD — Lei 13.709/2018](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm): tratamento, papéis e segurança de dados pessoais.
