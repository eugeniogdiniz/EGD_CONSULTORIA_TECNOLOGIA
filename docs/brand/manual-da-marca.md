# EGD — Manual da marca

Versão 2.0 · 27 de setembro de 2026 · Rebranding implementado no projeto local.

## Essência

**Tecnologia que conecta projeto e operação.** A EGD organiza a complexidade de processos, dados e sistemas para quem precisa entregar. O universo da marca vem das referências fornecidas pelo cliente: consultoria, tecnologia, dados, automação e inteligência artificial. A geometria traduz integração e estrutura. A identidade deve transmitir clareza, proximidade e rigor técnico. Pilares da referência: **Tecnologia · Dados · Inteligência · Resultados**.

Nome institucional, conforme as referências fornecidas: **EGD Consultoria em Tecnologia**. Forma curta: **EGD**. Domínio: egdsystem.com.br. Preservamos o nome e o posicionamento de consultoria, desenvolvimento e automação já presentes no projeto.

Assinatura: **Tecnologia que transforma. Soluções que geram valor.** “Do projeto à operação” funciona como mensagem de aplicação. Mensagem de abertura: **Entre o desafio e a próxima entrega.** Chamada para ação: **Vamos construir juntos.**

Público: equipes responsáveis por gestão e operação, especialmente em engenharia, infraestrutura, habitação e energia, conforme o conteúdo e os cases existentes no repositório.

## Símbolo e logotipo

O monograma geométrico EG foi reconstruído em SVG a partir das duas imagens enviadas pelo cliente. O E ocupa a parte superior em azul tecnológico; o G estrutura a parte inferior em azul profundo. O contorno hexagonal aberto sugere integração de sistemas, dados e operação. A versão principal usa cores sólidas para preservar leitura e reprodução. A geometria única está em `src/content/brand.json`, usada pelo React e pelo exportador vetorial. Não adicionar efeitos, perspectiva, brilho ou sombras ao símbolo.

Arquivos oficiais em `public/brand/`:

- `simbolo.svg`: monograma EG com fundo transparente, também usado como favicon.
- `logo-horizontal.svg`: assinatura reduzida, símbolo + EGD em curvas.
- `logo-institucional.svg`: símbolo + EGD em curvas e “Consultoria em Tecnologia” em texto vetorial; Archivo incorporada.
- `logo-monocromatico.svg` e `logo-branco.svg`: versões de uma cor para reprodução restrita.
- `logo-apresentacao.png`: prancha visual das versões; PNGs transparentes da marca e do símbolo também no kit.
- `logo-negativo.svg`: assinatura clara para fundos escuros.
- `apple-touch-icon.png`: ícone 180 × 180.
- `social-cover.png`: capa social 1200 × 630.

Área de proteção: no mínimo uma largura do traço principal do símbolo (13 unidades na grade de 100 × 112) em todos os lados. Mínimo digital: símbolo 24 px de altura; assinatura reduzida 120 px de largura; institucional 280 px. Abaixo de 280 px, usar a assinatura reduzida; abaixo de 120 px, usar somente o símbolo. Para impressão: símbolo mínimo 8 mm; logotipo mínimo 32 mm. Não distorcer, rotacionar, trocar a ordem das partes, usar sobre fotos complexas ou recolorir livremente. Na interface, usar os componentes compartilhados `BrandMark`, `BrandWordmark` e `Logo`.

## Cores

| Nome | HEX | Papel |
|---|---|---|
| Tinta | #071D3B | Texto principal, logotipo, botões primários |
| Papel | #F3F6FB | Fundo predominante |
| Folha | #FFFFFF | Superfícies leves |
| Sinal | #0875E1 | Símbolo, pequenos marcadores e linhas |
| Azul claro | #54B8FF | Símbolo na versão negativa, sobre fundo escuro |
| Sinal escuro | #075EB5 | Texto azul sobre fundo claro |
| Estrutura | #E0EAF6 | Planos secundários e imagens |
| Linha | #CCD9E8 | Divisórias |
| Texto secundário | #4b6079 | Descrições e informações auxiliares |
| Projeto | #075EB5 | Links funcionais e foco |

Distribuição sugerida: 65% tons claros, 25% tinta/estrutura, até 10% sinal. O azul principal é reservado ao símbolo e às marcações; para texto pequeno, usar azul escuro. Botões primários usam tinta e branco. Não substituir cores de erro/sucesso pelo azul da marca. Contraste mínimo: 4,5:1 no texto comum, 3:1 em texto grande e controles. Foco de teclado visível em azul escuro, com contorno e afastamento. As proporções são orientação de composição, não uma regra matemática por tela.

## Tipografia

**Archivo**: títulos, texto, navegação e controles. Pesos 400, 500 e 600. **Fragment Mono**: identificadores, dados técnicos e números tabulares. Fontes carregadas pelo Next/font. O kit contém o subconjunto latino de Archivo para o manual e os vídeos; licença em `public/brand/fonts/OFL-Archivo.txt`, com origem em https://github.com/google/fonts/tree/main/ofl/archivo. O logotipo vetorial tem letras em curvas e não depende das fontes instaladas.

No site: título principal 44–77 px, títulos de seção 30–46 px, corpo 16–18 px, legendas 12–13 px. No portal: corpo 15 px e títulos mais compactos. Títulos com entrelinha 1,06–1,14; corpo 1,55–1,65. Textos curtos, alinhados à esquerda, com linhas de leitura confortáveis. Usar maiúsculas somente em siglas ou quando necessárias ao conteúdo.

## Composição e interface

Container de 1280 px incluindo margens internas; 48 px de margem no desktop e 20–24 px no celular. Base de espaçamento de 4 px. Seções com 60–88 px de respiro. Bordas finas, cantos discretos de 4–8 px e superfícies sem sombras decorativas.

A página inicial alterna abertura editorial, imagem conceitual, evidências, serviços em linhas, método interativo, produtos e filme. Site, login e portais compartilham símbolo, tipografia e cores. Nos portais, priorizar leitura e ação: tabelas, navegação e formulários mantêm a densidade operacional. Não inserir vídeos ou grandes imagens em telas de trabalho só para decorar.

## Imagens

As duas imagens foram criadas com a ferramenta integrada imagegen. São **representações conceituais geradas**, não fotografias de clientes, obras entregues ou instalações da empresa. Nunca apresentá-las como evidência de execução real.

- `images/territorio-azul.webp`: hero, autenticação e aplicações institucionais. Infraestrutura, habitação e energia conectadas por um percurso azul. Original em `territorio-original.png`.
- `images/fluxo-azul.webp`: serviços, método e página sobre. Plataformas estruturadas conectadas por um percurso contínuo. Original em `fluxo-original.png`.

Direção: maquetes arquitetônicas tangíveis, cerâmica e papel foscos, luz natural lateral, sombras precisas, branco frio, tinta e azul. Evitar cérebros luminosos, robôs genéricos, neon, telas fictícias com números comerciais e fotos de bancos apresentadas como equipe real. Texto e logo devem permanecer fora da imagem raster, em HTML ou vetores.

Cortes: preservar o percurso azul e os volumes principais. Hero panorâmico no desktop; corte central no mobile. Usar `next/image`, dimensões explícitas, `sizes` e carregamento prioritário apenas no hero. Demais imagens com carregamento sob demanda. Prompts completos em `docs/brand/prompts-imagens.md`.

## Movimento em JavaScript

O componente `OperationFlow` usa React/JavaScript e SVG. A seleção das três etapas altera o trecho do percurso e o texto. Suporte a clique, Tab, setas, Home e End. Uma animação de traço de 750 ms, sem temporizador contínuo. Com `prefers-reduced-motion: reduce`, a mudança é imediata.

Transições de controles em 180–200 ms, principalmente cor e borda. Não ocultar conteúdo esperando JavaScript ou rolagem. Não usar pulsos contínuos para sugerir telemetria que não existe. “Java” foi interpretado como JavaScript para navegador; o sistema é Next.js/React/TypeScript, sem runtime Java.

## Vídeos

Dois motion graphics sem áudio, produzidos localmente com JavaScript, Canvas e MediaRecorder no Chrome, usando os materiais da marca:

1. `video/egd-apresentacao.webm`: 15 segundos, 1280 × 720. Abertura → entender/conectar → entregar → convite. Incorporado na página inicial com controles, poster, legenda pt-BR e transcrição.
2. `video/egd-assinatura.webm`: 8 segundos, 1280 × 720. Assinatura institucional para fechar apresentações ou peças de comunicação. Disponível no kit e na página Sobre, com controles, poster, legenda e transcrição, sem reprodução automática.

Roteiro do filme principal: 0–4 s “Entre o desafio e a próxima entrega”; 4–8 s “Entender. Conectar. Dados, sistemas e pessoas”; 8–12 s “Entregar. Tecnologia para a operação”; 12–15 s “Vamos construir juntos. egdsystem.com.br”.

Não usar autoplay com áudio. O player carrega a mídia somente por demanda (`preload="none"`). Arquivos WebVTT: `video/apresentacao.vtt` e `video/assinatura.vtt`. Posters: `video/apresentacao-poster.webp` e `video/assinatura-poster.webp`. Transcrição textual acompanha o player para acesso mesmo sem reprodução. Os vídeos são animações gráficas das imagens, não filmagens nem vídeo generativo. Para redes que exigem MP4, será necessária conversão de formato; este kit entrega WebM para web.

Exportação do manual e da prancha, sem servidor: `node scripts/check-brand.mjs --manual-only`.

Regeneração dos vetores: `node scripts/build-brand-logo.mjs`. Regeneração dos formatos web e vídeos: `node scripts/build-brand-media.mjs`. Chrome local em `/usr/bin/google-chrome` ou variável `CHROME_PATH`. As imagens originais devem estar presentes. O script não chama APIs nem publica arquivos.

## Voz

Clara, específica, colaborativa. Explicar o que a solução faz antes de listar ferramentas. Falar com quem opera e decide. “Conectamos dados, sistemas e pessoas” em vez de promessas genéricas de revolução. Evitar urgência artificial, superlativos sem prova e números sem origem.

A página inicial e a página sobre usam os totais calculados em `src/content/cases.ts`. Esses dados são os existentes no projeto; não houve auditoria externa das entregas. Métricas comerciais novas exigem comprovação. Status de disponibilidade só deve aparecer se integrado a monitoramento real.

## Aplicações e manutenção

- Site público: `src/styles/brand.css` e tokens do stylesheet compartilhado.
- Portal e autenticação: tokens em `src/app/globals.css`, símbolo e lockup compartilhados.
- Metadados: título institucional, capa Open Graph e favicon.
- Manual visual: `public/brand/manual-da-marca.html` e PDF correspondente.
- Análise e validação: `docs/brand/analise-e-entrega.md`.

Este manual substitui as orientações visuais conflitantes do antigo “dark tech” e da proposta de design da Fase 1 para as áreas alteradas. As regras de segurança, autorização e funcionamento do sistema continuam pertencendo à arquitetura existente.
