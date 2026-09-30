# EGD — Fase 12: relatórios

**Data:** 2026-09-30
**Status:** aprovado em conversa; aguardando revisão do spec e dos mockups
**Base:** `docs/superpowers/specs/2026-09-29-fases-10-12-gestao-design.md` (seção "Fase 12"). Parte da branch `fase-11-atas`, porque o relatório de status lista as atas.
**Mockups:** `docs/mockups/admin-projeto-relatorio.html`, `admin-relatorios-portfolio.html`, `admin-relatorios-semanal.html`, `portal-projeto-relatorio.html` (estilos em `relatorio.css`; capturas e PDFs em `docs/mockups/screenshots/`).

## Objetivo

Dar ao dono três leituras que hoje exigem abrir projeto por projeto: como está um projeto (para mandar ao cliente ou decidir), como está a carteira inteira e o que andou na semana. E dar ao cliente um relatório de andamento que ele mesmo abre e imprime no portal.

**Sucesso:** cada relatório abre a partir do menu ou do projeto, imprime limpo em A4 pelo navegador, exporta CSV com os mesmos números da tela, e o cliente nunca vê valores em reais, entregas internas ou atas não compartilhadas.

## Decisões

| Decisão | Escolha |
|---|---|
| Formato | Páginas renderizadas no servidor com CSS de impressão. PDF é o "Salvar como PDF" do navegador. Sem geração de PDF no servidor e sem dependência nova. |
| Identidade | O relatório é uma folha de projeto: cabeçalho com tipo do relatório em mono laranja, seções numeradas `01…`, números em linha separados por réguas e carimbo no fim (projeto, cliente, emitido em, versão interna/cliente, emitente). |
| CSV | UTF-8 com BOM, separador `;`, CRLF, datas `DD/MM/AAAA`, horas com vírgula decimal, valores em reais com vírgula e sem símbolo. Aspas quando o campo tem `;`, aspas ou quebra de linha. Nome do arquivo: `relatorio-<slug>-<AAAA-MM-DD>.csv`. |
| Fonte única | Página e CSV chamam o mesmo builder puro. Nenhum número é recalculado na rota do CSV. |
| Hoje e fuso | "Hoje" e as semanas usam `America/Sao_Paulo`. A data de referência é injetada nos builders (testável). |
| Progresso | Entregas concluídas ÷ entregas do projeto, arredondado (reusa `summarizeProject`). Projeto sem entregas mostra "sem entregas" em vez de 0%. |
| Atrasada | Entrega não concluída com `dueAt < hoje`. Dias de atraso = hoje − prazo. |
| Custo | Reusa `getProjectFinancials` e `listTimeCostsByDeliverable`: custo de horas = minutos × valor/hora da pessoa; lançamentos sem valor/hora contam horas, não custo, e são avisados. Consumo = (custo de horas + despesas) ÷ orçamento. Faixas: < 70% normal, 70–90% atenção, > 90% alerta. Sem orçamento: "sem orçamento". |
| Horas ao cliente | Nova coluna `project.show_hours_to_client boolean not null default false`, editada no formulário do projeto ("Mostrar horas ao cliente"). Ligada: o relatório do cliente mostra total de horas e horas por fase. Nunca mostra valores. |

## Relatórios

### 1. Status do projeto (admin)
Rota `/admin/projetos/[id]/relatorio`, nova aba "Relatório" no projeto; CSV em `/admin/projetos/[id]/relatorio/csv`.

Seções: cabeçalho (título, cliente, início, término previsto, responsável, % concluído); 01 Resumo (status do projeto, atrasadas, bloqueadas, próximo marco pendente); 02 Progresso por fase (concluídas/total por fase, "Sem fase" quando houver entregas sem fase); 03 Entregas por status (barra empilhada + legenda com contagens); 04 Atrasadas e bloqueadas (entrega, fase, prioridade, responsável, prazo, situação; ordenado por prioridade e atraso); 05 Marcos (previsto e situação: concluído em, em N dias, atrasado N dias, pendente); 06 Horas e custo (horas, custo de horas, despesas, consumo do orçamento); 07 Últimas atas (3 mais recentes do projeto: data, título, decisões resumidas, compartilhada sim/não).

CSV: uma linha por entrega — fase, entrega, status, prioridade, responsável, prazo, concluída em, dias de atraso, horas, custo de horas.

### 2. Portfólio (admin)
Rota `/admin/relatorios` (aba "Portfólio"); CSV em `/admin/relatorios/csv`. Item "Relatórios" na sidebar do admin.

Projetos não arquivados com status `planning`, `active` ou `on_hold`, ordenados por atrasadas (desc) e depois pelo próximo prazo. Colunas: projeto (link para o relatório dele) e cliente, status, progresso, próximo marco, atrasadas, bloqueadas, horas, orçamento consumido. Cabeçalho com contagem por status e total de atrasadas. Estado vazio: "Nenhum projeto em andamento. Projetos entregues e cancelados não entram no portfólio."

CSV: uma linha por projeto com as colunas acima mais orçamento, custo de horas e despesas.

### 3. Semanal (admin)
Rota `/admin/relatorios/semanal?semana=AAAA-MM-DD` (qualquer dia da semana; normalizado para a segunda). Sem parâmetro ou inválido: semana atual. Navegação anterior / próxima / esta semana. CSV em `/admin/relatorios/semanal/csv?semana=…`.

Por projeto (mesmo escopo do portfólio), três colunas: **Concluído** (entregas com `completedAt` e marcos com `completedAt` dentro da semana), **Vence** (entregas e marcos em aberto com prazo na semana seguinte à exibida), **Atrasado** (entregas em aberto com prazo vencido em relação a hoje). Marcos levam o sinal ◆. Projeto sem nenhum item não aparece. Número de destaque: itens concluídos na semana. Rótulo da semana ISO (`2026-S40`).

CSV: uma linha por item — projeto, cliente, tipo (entrega/marco), grupo (concluído/vence/atrasado), título, data.

### 4. Relatório do cliente (portal)
Rota `/portal/projetos/[id]/relatorio`, link "Relatório" no cabeçalho do projeto no portal; CSV em `/portal/projetos/[id]/relatorio/csv`.

Escopo e visibilidade iguais ao portal atual (`portal-projects/queries`): só projetos das empresas da organização ativa, só entregas com `visibleToClient`, só atas com `sharedWithClient`. Os números (percentual, contagens) contam apenas entregas visíveis. Status com rótulos do portal (`portalStatusLabel`: bloqueada aparece como "Em espera").

Seções: cabeçalho (sem cliente, com responsável EGD); 01 Progresso por fase; 02 Marcos; 03 Em andamento e próximas entregas (não concluídas, por prazo); 04 Horas dedicadas (só com `show_hours_to_client`); 05 Atas compartilhadas (link para a ata no portal). Carimbo com versão "cliente". Nenhum valor monetário, orçamento, responsável interno por entrega ou prioridade.

CSV: uma linha por entrega visível — fase, entrega, status, prazo, concluída em (e horas, se a chave estiver ligada).

## Arquitetura

```
src/modules/reports/
  dates.ts      puras: hoje em São Paulo, semana (segunda..domingo), rótulo ISO, dias entre datas
  csv.ts        puro: toCsv(headers, rows) com BOM, ';', CRLF e escape; formatadores de número/data
  build.ts      puros: buildProjectStatus, buildPortfolio, buildWeekly, buildClientReport
  queries.ts    leitura (admin): dados de um projeto, de todos os projetos do escopo e da semana
  portal-queries.ts  leitura (portal) sobre as queries de portal-projects, com o mesmo escopo
  components/   report-sheet (folha, seção numerada, carimbo), phase-ruler, status-stack, report-toolbar
```

- As rotas de CSV são route handlers `GET` que chamam `requireAdmin()` / `requirePortal()`, carregam os dados, passam pelo mesmo builder e respondem `text/csv; charset=utf-8` com `Content-Disposition: attachment`.
- Projeto inexistente, arquivado (no portal) ou fora do escopo do cliente: `notFound()` nas páginas e 404 no CSV.
- A barra de ações (Baixar CSV, Imprimir) reusa o `PrintButton` existente e some na impressão; o shell já esconde sidebar e topo em `print`.
- Impressão: `@page A4`, layout de mesa forçado em `print` (A4 tem ~720 px e cairia no layout de celular), seções com `break-inside: avoid`.

## Testes

- **Unitários** (`tests/unit/reports/`): semana e rótulo ISO nas viradas de mês/ano e no fuso; atraso e dias; progresso por fase incluindo "Sem fase" e projeto vazio; faixas de consumo de orçamento; ordenação do portfólio; agrupamento do semanal (concluído/vence/atrasado, marcos incluídos, projeto sem movimento omitido); `toCsv` com BOM, `;`, aspas, quebra de linha e vírgula decimal; `buildClientReport` sem campos de custo e com horas só quando a chave está ligada.
- **Integração** (`tests/integration/reports/`): queries com banco real; cliente de outra organização recebe `null`; entrega interna e ata não compartilhada não entram no relatório do cliente; números da página = números do CSV.
- **E2E** (`tests/e2e/relatorios.spec.ts`): admin abre os três relatórios e baixa os CSVs; navega semanas; cliente abre o relatório, baixa o CSV e não vê "R$"; emulação de `print` esconde a barra. Rotas novas entram nas verificações de acessibilidade (axe) e de console limpo.

## Fora do escopo

Gráficos interativos, envio agendado por e-mail, relatórios de CRM/financeiro geral, filtros além da semana, PDF gerado no servidor, comparação entre períodos.
