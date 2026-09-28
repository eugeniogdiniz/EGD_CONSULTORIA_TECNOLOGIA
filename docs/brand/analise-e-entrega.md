# Análise e entrega do rebranding EGD

## Sistema analisado

Aplicação Next.js 16 / React 19 / TypeScript, com site público, autenticação, portal do cliente e administração. Autorização via Better Auth, persistência Postgres/Drizzle, arquivos S3 e notificações SMTP. O trabalho visual preserva essas integrações e não altera migrations ou regras de acesso.

## Problemas encontrados

1. Duas identidades simultâneas: site escuro com acento azul e componentes de terminal; portal claro com laranja. Quatro famílias de fontes carregadas.
2. Símbolos diferentes nos componentes do site e do portal.
3. Home com números de retorno, SLA e projetos diferentes dos totais da base de cases, sem fonte rastreável junto ao conteúdo.
4. Rodapé sugeria status de sistemas sem telemetria e tinha link LinkedIn sem destino.
5. Conteúdo dependia de uma animação de entrada para ficar visível; observação de rolagem desnecessária para leitura.
6. Ausência de imagens próprias, filmes institucionais, capa social e manual executável.
7. Grade de setores da página sobre fixada em três colunas mesmo no celular.

## Decisões

A direção final foi revista após o cliente enviar duas referências visuais: monograma angular EG, azul tecnológico e azul profundo, nome “EGD Consultoria em Tecnologia” e pilares tecnologia, dados, inteligência e resultados. O monograma foi reconstruído em SVG, com variantes positiva, negativa, monocromática e institucional. A primeira exploração em papel/laranja foi arquivada em `docs/brand/exploracao-inicial/`, fora do kit final.

Preservar EGD e o contexto de engenharia. Conceito: “Tecnologia que conecta projeto e operação”. Paleta branca/azul profundo/azul tecnológico, monograma EG, imagens conceituais e percurso contínuo como linguagem visual. Site editorial; portal funcional com a mesma assinatura. Trocar o terminal da home por imagem e método interativo. Remover indicadores sem fonte identificada da home e sobre; usar `TOTAIS` da base de cases.

## Aplicação

Home reconstruída. Identidade aplicada às seis páginas públicas por tema compartilhado; serviços e sobre recebem imagem conceitual. Autenticação com painel institucional desktop e formulário compacto mobile. Portais recebem paleta, fontes e marca compartilhadas. Menu mobile com estado expandido, identificação da rota atual, fechamento ao navegar e Escape. Skip link e conteúdo visível sem observer de rolagem.

Kit: símbolo, versões reduzida, institucional, negativa, branca e monocromática da assinatura vetorial, ícone Apple, capa social, duas imagens originais/otimizadas, dois WebM, poster, legenda e manual em HTML/Markdown/PDF. As imagens são conceituais geradas por IA; os filmes são motion graphics produzidos com JavaScript.

## Limites

Não foi feito deploy. O arquivo de especificação de CRM já presente como não rastreado foi preservado. A base histórica de cases, depoimentos e linha do tempo não foi auditada externamente. Fotografias reais de equipe e projetos não foram fornecidas, portanto não foram inventadas. Operações autenticadas dependem de Postgres, SMTP e S3; a verificação visual local não substitui os testes de integração desses serviços.

## Validação anterior do rebranding

- `npm run lint`: sem erros; a execução durante o trabalho apontou dois avisos em arquivos do CRM alterados em paralelo.
- `npm run typecheck`: aprovado. O build final também completou a checagem TypeScript.
- `npm test`: 46 testes unitários existentes aprovados na primeira validação (antes da ampliação paralela do CRM).
- `npm run build`: aprovado após a correção paralela da tipagem do CRM. Permanece o aviso preexistente de `process.exit` em `src/instrumentation.ts` para Edge Runtime.
- Navegador Chrome: sete rotas (`/`, `/servicos`, `/produtos`, `/cases`, `/sobre`, `/contato`, `/entrar`), em 1440 px e 390 px, HTTP 200, título visível, sem overflow horizontal ou erros JavaScript.
- Menu mobile, seleção de etapas por clique/setas, movimento reduzido e reprodução do vídeo em ambas as larguras: aprovados.
- Manual: oito páginas A4, sem corte de conteúdo; folga mínima medida de 50 px antes do rodapé na revisão anterior à incorporação das referências do cliente. PDF inspecionado por capturas.
- Contrastes recalculados para a paleta azul final: tinta/papel 15,53:1; secundário/papel 5,97:1; sinal escuro e projeto/papel 5,92:1. Sinal/papel 4,18:1: reservado a marcações, não a texto pequeno.

Relatório do navegador: `docs/brand/validacao.json`. Capturas em `docs/brand/screenshots/`. Script reproduzível: `scripts/check-brand.mjs`; use `--manual-only` para exportar somente o manual e a prancha diretamente dos arquivos locais, sem servidor, preservando o relatório anterior das telas. As operações autenticadas com banco e serviços externos não foram exercitadas nesta revisão.

## Conclusão do manual e movimento — 27/09/2026

- PDF final reexportado com o monograma EG e a identidade azul, substituindo o PDF da exploração anterior. Oito páginas A4, fontes e imagens carregadas, sem conteúdo sobreposto ao rodapé; menor folga: 32 px. Prancha `logo-apresentacao.png` gerada com as variantes finais.
- Manual HTML verificado em 390, 768 e 1440 px, sem overflow horizontal. Regras de tamanho mínimo da assinatura institucional e azul claro da versão negativa sincronizadas com o kit.
- Filmes de 15 e 8 segundos regenerados em 1280 × 720. Apresentação na página inicial; assinatura na página Sobre, com poster próprio, legendas pt-BR e transcrição. Carregamento sob demanda e reprodução por ação do visitante.
- Animação interativa em JavaScript/React e SVG verificada com clique e teclado. Corrigida a preservação da etapa selecionada quando o visitante prefere movimento reduzido.
- `node scripts/check-brand.mjs`: aprovado. Sete rotas em 1440 e 390 px, sem erros JavaScript ou overflow; menu, etapas, movimento reduzido, reprodução dos dois vídeos, legendas e transcrições aprovados.
- ESLint dos arquivos de código alterados nesta continuação: aprovado.
- `npx tsc --noEmit`: bloqueado por três usos de `Button asChild` em páginas do CRM (`empresas/page.tsx` e `empresas/[id]/page.tsx`), fora das alterações do manual e dos vídeos. O resultado de build registrado acima pertence à validação anterior; não foi realizado novo build nesta continuação.
- Entrega local, sem deploy.
