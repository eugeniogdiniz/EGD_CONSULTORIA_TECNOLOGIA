# Design system EGD — Fase 1

**Status:** proposta para aprovação (Task 10). Materializado em `docs/mockups/tokens.css` e `docs/mockups/mockup.css`; após aprovação vira `src/app/globals.css` + shadcn/ui (Task 11).

## 1. Conceito

A EGD nasceu dentro de consórcios de engenharia e habitação. O vocabulário visual vem daí: **folha de projeto**. Papel técnico cinza-frio, tinta azul-escura, uma cor de sinalização de obra para o que exige atenção, cotas medindo números reais e um carimbo (título de prancha) organizando metadados. Tudo que decora tem de informar: uma linha é uma cota, um bloco é um carimbo, um número tem fonte.

O que este sistema recusa, de propósito: fundo quase-preto com acento neon, terminal animado, eyebrows em caixa alta, numeração "01 / 06" em coisas que não são sequência, grid de três cards com ícone, gradientes, sombras difusas em todo card, animação de entrada em cada seção, seta "→" em todo link.

**Onde gastamos a ousadia:** uma coisa só, a folha de projeto do hero, com cotas que se desenham no carregamento. O resto é disciplinado.

## 2. Cores

Três camadas: primitiva → semântica → componente. Só as semânticas aparecem no código de UI.

### Primitivas

| Nome | Hex | Uso |
|---|---|---|
| papel-100 | `#EEF1F2` | fundo da página (público) e da sidebar (portais) |
| papel-50 | `#F7F8F9` | fundo de linha alternada em tabela densa, hover de linha |
| folha | `#FFFFFF` | superfícies (cards, formulários, área de conteúdo dos portais) |
| tinta-900 | `#10202C` | texto principal, botão primário |
| tinta-800 | `#1B3040` | hover do botão primário |
| tinta-600 | `#4B5B67` | texto secundário, labels |
| tinta-400 | `#7D8B95` | texto mudo, placeholders, metadados |
| regua-300 | `#C8D1D6` | bordas, divisórias, linhas de cota |
| regua-500 | `#9FADB6` | bordas de inputs, ticks de cota |
| sinal-500 | `#E4571B` | laranja de sinalização: marcações, foco de atenção, status "novo", link em hover |
| sinal-700 | `#B9440F` | sinal em estado pressionado / texto sobre fundo claro |
| sinal-100 | `#FCEBE2` | fundo de destaque suave (badge "novo", célula em atenção) |
| projeto-600 | `#1C4F8A` | azul de projeto: links, anel de foco, elemento ativo do menu |
| projeto-100 | `#E3ECF6` | fundo do item ativo no menu, badge informativa |
| aprovado-600 | `#1E7A4B` | status positivo (ativo, em produção, aceito) |
| aprovado-100 | `#E1F2E8` | fundo de badge positiva |
| atencao-600 | `#B07600` | status de espera (pendente, expira em breve) |
| atencao-100 | `#FBF1D9` | fundo de badge de atenção |
| erro-600 | `#B4271F` | erro, inativo, ação destrutiva |
| erro-100 | `#FBE5E3` | fundo de badge de erro |

Contrastes verificados (WCAG AA): tinta-900 sobre papel-100 = 14,9:1; tinta-600 sobre folha = 6,9:1; tinta-400 sobre folha = 4,5:1 (só em texto ≥ 14 px); folha sobre tinta-900 = 15,4:1; folha sobre sinal-500 = 3,6:1 (por isso o laranja **não** é fundo de botão com texto branco; é marcação, borda e texto sobre claro em sinal-700 = 5,2:1); projeto-600 sobre folha = 7,2:1.

### Semânticas (variáveis CSS)

```
--bg            papel-100 (público) | folha (área de conteúdo dos portais)
--bg-subtle     papel-50
--surface       folha
--fg            tinta-900
--fg-muted      tinta-600
--fg-faint      tinta-400
--border        regua-300
--border-strong regua-500
--accent        sinal-500      --accent-strong sinal-700   --accent-soft sinal-100
--link          projeto-600    --link-soft projeto-100
--ring          projeto-600
--success       aprovado-600   --success-soft aprovado-100
--warning       atencao-600    --warning-soft atencao-100
--danger        erro-600       --danger-soft erro-100
```

Temas: `.theme-site` (bg papel-100, tipografia maior, seções com respiro) e `.theme-app` (bg folha na área de conteúdo, sidebar papel-100, escala menor, densidade alta). Mesmas primitivas; o que muda é `--bg`, escala tipográfica e espaçamentos.

## 3. Tipografia

Duas famílias, papéis distintos.

| Papel | Família | Por quê |
|---|---|---|
| Títulos e texto | **Archivo** (Google Fonts, variável em peso e largura) | Grotesca desenhada para sinalização; largura semi-expandida nos títulos dá voz própria sem cair em display gótico. Fora da lista proibida. |
| Dados tabulares e códigos | **Fragment Mono** | Mono com algarismos tabulares; usada só onde o conteúdo é dado: tabela de cases, carimbo, auditoria, identificadores. Nunca em labels de interface. |

Carregamento: `next/font/google`, subsets latin + latin-ext, `display: swap`. Archivo com eixo `wdth` 100–112 e pesos 400/500/600.

### Escala (rem, base 16 px)

| Token | Tamanho | Linha | Peso | Largura | Uso |
|---|---|---|---|---|---|
| display | 3.5 (56) / mobile 2.25 (36) | 1.02 | 600 | 112 | h1 do site, letter-spacing −0.02em |
| h1 | 2.5 (40) / mobile 1.875 | 1.08 | 600 | 108 | título de página do site |
| h2 | 1.75 (28) / mobile 1.5 | 1.15 | 600 | 104 | título de seção |
| h3 | 1.25 (20) | 1.25 | 600 | 100 | título de card, item |
| lead | 1.1875 (19) | 1.5 | 400 | 100 | parágrafo de abertura |
| body | 1.0625 (17) site / 0.9375 (15) portais | 1.55 | 400 | 100 | texto |
| small | 0.875 (14) | 1.45 | 400/500 | 100 | labels, metadados, células |
| micro | 0.8125 (13) | 1.4 | 500 | 100 | badges, notas de tabela |
| data | 0.875 (14) | 1.4 | 400 | mono | números tabulares, códigos |

Regras: sentence case em tudo, inclusive labels e botões. Nada em caixa alta com tracking. Sem palavra isolada em itálico ou cor no título. Comprimento de linha máximo 72 caracteres (`max-width: 38rem` em parágrafos de lead, `34rem` em body). Números grandes nas cotas usam Archivo 600 com `font-variant-numeric: tabular-nums`.

## 4. Espaço e grade

- Base 4 px. Escala: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Container: 1180 px, padding lateral 24 px (mobile 20 px).
- Grade de 12 colunas, gutter 24 px.
- **Registro de folha**: no site, cada seção tem o título na coluna esquerda (3/12) e o conteúdo à direita (9/12), separados por uma régua de 1 px acima. Isso substitui o cabeçalho centralizado e o eyebrow. No mobile, empilha.
- Seções: padding vertical 96 px (mobile 64). Hero: 112 px acima.
- Portais: sidebar 240 px, topbar 56 px, conteúdo com padding 32 px, blocos separados por 24 px.
- Breakpoints: 640, 960, 1280.

## 5. Forma, borda, elevação

- Raio: 2 px em controles (botão, input, badge), 4 px em superfícies (card, folha, dialog), 0 em tabelas.
- Bordas de 1 px em `--border` fazem a estrutura. Sem sombras em cards. Sombra só em dialog e menus flutuantes: `0 24px 48px -24px rgb(16 32 44 / 0.35)`.
- Sem gradientes em fundo. A folha do hero tem uma grade de 8 mm em `--border` a 40% de opacidade, só ali.

## 6. Dispositivos próprios

**Cota** (`.cota`): linha horizontal em `--border-strong` com ticks verticais nas pontas e o valor acima, centralizado. Mede números reais (clientes, sistemas, economia). Nunca decorativa: se não houver número medido, não há cota.

**Carimbo** (`.carimbo`): tabela de metadados no rodapé da folha (Projeto, Cliente, Folha, Rev., Status), células com borda de 1 px, label em `--fg-faint` small e valor em Fragment Mono. Usado na folha do hero e nos cards de case.

**Folha** (`.folha`): superfície branca com borda de 1 px, grade de 8 mm de fundo e um carimbo no rodapé. Só no hero e na página de cases.

**Status** (`.status`): ponto de 8 px + texto small, cores por semântica. Substitui badges coloridas cheias na maior parte dos casos.

## 7. Componentes (shadcn/ui com tema próprio)

| Componente | Especificação |
|---|---|
| Botão primário | fundo `--fg`, texto `--surface`; hover tinta-800; ativo translate 0; foco anel 2 px `--ring` com offset 2 px; desabilitado 45% opacidade. Alturas 32 / 40 / 48; padding horizontal 12 / 16 / 20; raio 2 px; peso 500. Sem ícone de seta por padrão. |
| Botão secundário | fundo transparente, borda 1 px `--border-strong`, texto `--fg`; hover fundo `--bg-subtle`. |
| Botão discreto | texto `--link`, sublinhado 1 px com offset 3 px; hover cor `--accent-strong`. |
| Botão destrutivo | borda 1 px `--danger`, texto `--danger`; hover fundo `--danger-soft`. |
| Input / Textarea / Select | altura 40 (portais 36), borda 1 px `--border-strong`, fundo `--surface`, raio 2 px, padding 0 12; foco borda `--ring` + anel 2 px `--link-soft`; erro borda `--danger`; label small 500 `--fg-muted` acima com 6 px; texto de erro micro `--danger` abaixo com 6 px e `role="alert"`. |
| Card | fundo `--surface`, borda 1 px `--border`, raio 4 px, padding 24 (portais 20). Sem sombra. |
| Tabela | cabeçalho small 500 `--fg-muted`, fundo `--bg-subtle`, borda inferior 1 px; linhas 48 px (portais 44), divisória 1 px `--border`; hover `--bg-subtle`; colunas numéricas alinhadas à direita em Fragment Mono; sem zebra no site. |
| Status / badge | ponto + texto (padrão). Badge cheia só para "Novo" (`--accent-soft` + `--accent-strong`). |
| Alerta | borda esquerda 3 px na cor semântica, fundo soft correspondente, texto `--fg`, padding 12 16. |
| Dialog | largura 480, fundo `--surface`, raio 4, sombra de elevação, título h3, ações à direita (secundário + primário ou destrutivo). Confirmações destrutivas repetem o nome do objeto. |
| Sidebar (portais) | 240 px, fundo `--bg` papel-100, itens 36 px altura, texto small 500; ativo: fundo `--link-soft`, texto `--link`, barra esquerda 2 px `--link`. |
| Topbar (portais) | 56 px, fundo `--surface`, borda inferior 1 px; título da página à esquerda; seletor de organização (portal do cliente) e menu do usuário à direita. |
| Navbar (site) | 64 px, fundo `--bg` com borda inferior 1 px ao rolar; logo à esquerda, links small 500 ao centro-direita, botão primário 32 px; "Entrar" como link discreto. Mobile: Sheet lateral. |
| Footer (site) | fundo `--surface`, borda superior 1 px, 4 colunas, texto small, linha final micro `--fg-faint`. |
| Estado vazio | ícone nenhum; título h3, uma frase com o próximo passo, botão primário quando houver ação. |
| Página de erro | título h2, texto com código de referência em Fragment Mono, botão "Tentar de novo". |

## 8. Movimento

- Transições de estado: 160 ms, `cubic-bezier(.2,.6,.2,1)`, só em cor, borda e opacidade.
- Um único momento não solicitado: no carregamento do início, as cotas da folha do hero se desenham (stroke-dashoffset) em 700 ms, com atraso escalonado de 120 ms. Nada mais anima sozinho. Sem reveal on scroll.
- `prefers-reduced-motion: reduce` desliga o desenho das cotas e reduz transições a 0.

## 9. Acessibilidade

- Foco visível em todo elemento interativo (anel 2 px `--ring`).
- Contraste AA em texto e AAA no corpo principal.
- Formulários com `label` associado, erros com `role="alert"`, sucesso com `role="status"`.
- Tabelas com `caption` visualmente oculta e `scope` em cabeçalhos.
- Alvos de toque mínimos de 40 px nos portais e 44 px no site.
- Idioma `pt-BR` no `<html>`.

## 10. Anti-padrões proibidos (do CLAUDE.md global e desta spec)

Fontes Inter, Roboto, Arial, Helvetica, system-ui como principal. Gradiente roxo ou qualquer gradiente decorativo. Grid de três cards com ícone genérico. Emoji em título. Textos vagos. Eyebrow em caixa alta. Numeração em conteúdo não sequencial. Seta "→" em texto de link. Sombra difusa em card. Animação de entrada por seção. Fundo quase-preto com acento neon. Tickers ou métricas inventadas.

## 11. Emenda — Fase 2: grupo colapsável na sidebar admin

Introduzido para o CRM (Fase 2), aprovado no mockup `docs/mockups/admin-shell-crm.html`. Padrão reutilizável para qualquer módulo que agrupe mais de dois sub-itens na sidebar do admin.

**Anatomia.** Um grupo é um item de sidebar com cabeçalho não navegável e uma lista de sub-itens. O grupo aparece na mesma coluna dos itens flat; o que muda é o cabeçalho (não é link) e o recuo dos sub-itens.

**Cabeçalho.** Texto em **Fragment Mono 0.8125rem (`--text-micro`)**, sentence case, cor `--fg-muted`, altura 36 px como um `.item` normal, padding horizontal 12 px, sem sublinhado. Chevron 12 px à direita, cor `--fg-faint`, orientado à direita quando fechado e para baixo quando aberto. `role="button"`, `aria-expanded`, `aria-controls`. Hover: cor `--fg`. Sem `aria-current`; o cabeçalho nunca é a página ativa.

**Sub-itens.** Herdam de `.sidebar .item`. Recuo adicional de 12 px à esquerda (padding-left 24 px). Regras de ativo (`aria-current="page"`) e hover são idênticas. Selo `.badge` continua permitido à direita.

**Comportamento.**
1. Estado inicial fechado se o usuário nunca abriu o grupo.
2. Toggle persiste em `localStorage`, chave `egd_admin_nav`, valor JSON `{ groups: { crm: "open" | "closed" } }`.
3. Sub-item ativo (URL bate com prefixo de qualquer sub-item) força o grupo aberto e ignora o estado persistido enquanto durar a navegação.
4. Toggle é instantâneo: sub-itens aparecem/somem sem animação de altura. Motivo: manter a regra do §8 ("só cor, borda e opacidade").
5. `prefers-reduced-motion` não muda nada aqui (não havia movimento a reduzir).

**Nunca fazer.** Aninhar mais de um nível (sub-item de sub-item). Colocar contador agregado no cabeçalho do grupo (o dado vive no sub-item). Usar chevron em `.item` flat (é reservado ao grupo).

**Onde aplicar.** Sidebar do admin. Não aplicar na sidebar do portal do cliente (regras 1–3 assumem operação diária; portal do cliente é raso).
