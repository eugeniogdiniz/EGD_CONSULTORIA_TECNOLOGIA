/**
 * Artigos do site (/artigos/<slug>): textos de nicho que respondem buscas reais de quem
 * trabalha em contrato de obra, cada um com um modelo em planilha para baixar (public/modelos,
 * gerado por scripts/build-modelos.py). Blocos simples (h2, parágrafo, lista) para render
 * sem Markdown e para o JSON-LD Article. Datas absolutas; `updated` só quando o texto mudar.
 */
export type ArticleBlock = { h2: string } | { p: string } | { ul: string[] } | { ol: string[] };

export type Article = {
  slug: string;
  title: string;
  description: string;
  published: string;
  updated?: string;
  readingMinutes: number;
  /** Primeiro parágrafo: a resposta direta à pergunta do título. */
  lead: string;
  model: { file: string; label: string; what: string };
  related: { href: string; label: string };
  blocks: ArticleBlock[];
};

export const ARTICLES: Article[] = [
  {
    slug: "rdo-relatorio-diario-de-obra",
    title: "RDO: o que é e como preencher o relatório diário de obra",
    description: "O que o RDO precisa registrar (clima, efetivo, equipamentos, atividades, ocorrências, assinaturas), por que é a principal evidência do contrato e como preencher em 10 minutos.",
    published: "2026-10-09",
    readingMinutes: 6,
    lead: "O RDO (relatório diário de obra) é o registro, dia a dia, do que aconteceu no canteiro: clima, efetivo, equipamentos, atividades executadas, ocorrências e assinaturas da contratada e da fiscalização. Em contrato de engenharia ele é a principal evidência para justificar prazo, medição e pleito. Preenchido direito, leva 10 minutos por dia; preenchido de memória no fim da semana, não vale nada.",
    model: { file: "/modelos/modelo-rdo-relatorio-diario-de-obra.xlsx", label: "Baixar modelo de RDO (planilha)", what: "Planilha com RDO, efetivo por função e equipamentos, com instruções de preenchimento." },
    related: { href: "/servicos/auto", label: "Automação de relatórios" },
    blocks: [
      { h2: "O que o RDO precisa registrar" },
      { p: "Não existe um formato único por lei, mas contratos públicos e privados convergem para o mesmo conjunto de campos. Se o seu RDO não tem algum deles, a fiscalização vai pedir." },
      { ul: ["Identificação: número sequencial, data, dia da semana, obra ou contrato e frente de serviço.", "Clima e condição de trabalho, de manhã e à tarde: é o que justifica dia parado e prorrogação.", "Efetivo por função, separando equipe própria e terceiros.", "Equipamentos com horas trabalhadas e horas paradas, e o motivo da parada.", "Atividades executadas, com referência de local (estaca, eixo, pavimento).", "Atividades previstas e não executadas, com o motivo.", "Ocorrências: acidente, falta de material, interferência, visita da fiscalização, decisão tomada em campo.", "Materiais recebidos e assinaturas do responsável da contratada e do fiscal."] },
      { h2: "Por que o RDO é a evidência que mais pesa" },
      { p: "Quando o contrato atrasa, a discussão vira: de quem foi a culpa e desde quando. O RDO assinado pelas duas partes no mesmo dia encerra a discussão. Chuva registrada em 14 dias do mês sustenta a prorrogação; equipamento parado por falta de frente de serviço sustenta o pleito; efetivo abaixo do planejado sustenta a notificação da fiscalização. Sem RDO, cada lado conta a sua versão." },
      { h2: "Como preencher em 10 minutos por dia" },
      { ol: ["Preencha no fim do turno, no canteiro, não no escritório no dia seguinte.", "Numere em sequência e nunca deixe buraco: dia sem obra também tem RDO, com o motivo.", "Use referências físicas (estaca 10 a 14, pavimento 3), não descrições vagas (\"continuação dos serviços\").", "Uma linha por ocorrência, com hora. Ocorrência sem hora é opinião.", "Colha as duas assinaturas no mesmo dia. RDO assinado só pela contratada vale metade.", "Foto é complemento, não substituto: anexe e referencie no texto."] },
      { h2: "Os erros mais comuns" },
      { ul: ["Preencher vários dias de uma vez, com o mesmo texto copiado.", "Registrar clima só quando chove, o que tira a credibilidade dos dias de chuva.", "Efetivo total sem função: não dá para cruzar com o cronograma.", "Ocorrência relatada por WhatsApp e nunca transcrita para o RDO.", "RDO em papel que fica no canteiro e some antes do fim do contrato."] },
      { h2: "Quando o RDO deixa de ser planilha" },
      { p: "Com mais de uma frente de serviço ou mais de uma empresa no contrato (consórcio), a planilha vira gargalo: cada frente preenche de um jeito, e o RDO consolidado é montado à mão. É o ponto em que vale um formulário no celular, com campos obrigatórios, foto georreferenciada e assinatura digital, que gera o PDF do dia e alimenta o relatório semanal sem redigitação. A planilha deste artigo serve para padronizar os campos antes de automatizar." },
    ],
  },
  {
    slug: "medicao-de-contrato-de-obra",
    title: "Medição de contrato de obra: como montar o boletim",
    description: "Como montar o boletim de medição de um contrato de engenharia: itens contratuais, acumulado, saldo, memória de cálculo, aditivos e o que a fiscalização confere.",
    published: "2026-10-09",
    readingMinutes: 7,
    lead: "O boletim de medição é o documento que transforma serviço executado em valor a faturar: para cada item da planilha contratual, registra a quantidade do período, o acumulado, o saldo e o valor correspondente, com memória de cálculo que a fiscalização consegue conferir. Boletim organizado é aprovado na primeira; boletim sem memória volta, e o faturamento atrasa um mês.",
    model: { file: "/modelos/modelo-boletim-de-medicao-de-obra.xlsx", label: "Baixar modelo de boletim de medição (planilha)", what: "Boletim por item contratual com fórmulas de acumulado e saldo, memória de cálculo e resumo financeiro." },
    related: { href: "/produtos/contratos", label: "Gestão de contratos e medições" },
    blocks: [
      { h2: "A estrutura do boletim" },
      { p: "O boletim segue a planilha contratual: mesmo código, mesma descrição, mesma unidade e mesmo preço unitário. Qualquer diferença é motivo de devolução. Para cada item, cinco colunas fazem a conta:" },
      { ul: ["Quantidade contratual: a do contrato mais os aditivos vigentes.", "Acumulado anterior: o que já foi medido e aprovado até o boletim passado.", "Quantidade do período: o que está sendo medido agora.", "Acumulado atual: anterior mais período. É o número que a fiscalização compara com o campo.", "Saldo: contratual menos acumulado atual. Saldo negativo significa que falta aditivo."] },
      { h2: "Memória de cálculo: o que faz o boletim ser aprovado" },
      { p: "A memória de cálculo mostra de onde veio cada quantidade: referência física (estacas, eixos, pavimento, desenho), critério de medição (volume geométrico, área de projeção, unidade instalada) e a conta em si. Com memória, o fiscal confere em campo em uma tarde. Sem memória, ele pede, e o boletim espera." },
      { ul: ["Uma linha de memória por item medido no período.", "Critério conforme o caderno de encargos ou a norma de medição do contrato, não o critério que parece justo.", "Evidência anexada: RDOs do período, fotos datadas, relatório de vistoria ou ensaio.", "Serviço parcialmente executado só entra se o contrato previr medição por etapa."] },
      { h2: "Aditivos e reajuste" },
      { p: "Aditivo de quantidade altera a coluna contratual do item e precisa citar o número do termo. Aditivo de serviço novo entra como item novo, com preço aprovado. Reajuste não entra no boletim de quantidades: é calculado à parte, sobre o valor do período, com o índice e a data-base do contrato. Misturar reajuste com medição é a forma mais rápida de perder a rastreabilidade." },
      { h2: "O que a fiscalização confere" },
      { ol: ["Se códigos, unidades e preços batem com o contrato.", "Se acumulado anterior é igual ao acumulado atual do boletim anterior aprovado.", "Se nenhum item passou do contratual sem aditivo.", "Se a memória de cálculo permite verificar em campo.", "Se as evidências (RDO, fotos, vistorias) são do período medido."] },
      { h2: "Em consórcio, uma coluna a mais" },
      { p: "Quando mais de uma empresa executa o mesmo contrato, o boletim precisa dizer qual consorciada executou cada quantidade, para o rateio e a prestação de contas. Na planilha é uma coluna; na prática é a origem da maioria das divergências entre consorciadas. É o caso em que um sistema de contratos e medições, com o boletim gerado das frentes de serviço, paga o investimento no primeiro fechamento." },
    ],
  },
  {
    slug: "checklist-de-vistoria-de-obra",
    title: "Checklist de vistoria de obra: o que não pode faltar",
    description: "Como montar um checklist de vistoria de obra que vira relatório: itens por disciplina, critério, resultado, foto, gravidade, responsável, prazo e reinspeção.",
    published: "2026-10-09",
    readingMinutes: 6,
    lead: "Um checklist de vistoria de obra precisa de oito campos por item: disciplina, item verificado, critério de referência, resultado (conforme, não conforme, não se aplica), foto, gravidade, responsável e prazo. Com eles, a vistoria vira relatório e a não conformidade vira ação com dono. Sem eles, vira uma lista de observações que ninguém fecha.",
    model: { file: "/modelos/modelo-checklist-de-vistoria-de-obra.xlsx", label: "Baixar modelo de checklist de vistoria (planilha)", what: "Checklist por disciplina com resultado, foto, gravidade, responsável, prazo e reinspeção, mais cabeçalho da vistoria." },
    related: { href: "/produtos/vistorias", label: "App de vistorias e fiscalização de obras" },
    blocks: [
      { h2: "Por disciplina, não por ordem de passeio" },
      { p: "Checklist organizado pelo caminho que o vistoriador faz no canteiro vira bagunça no relatório. Organize por disciplina (estrutura, alvenaria, instalações elétricas, hidráulica, segurança do trabalho, meio ambiente) e, dentro dela, por etapa. O relatório sai agrupado, e o engenheiro de cada disciplina lê só a sua parte." },
      { h2: "Os oito campos de cada item" },
      { ul: ["Item verificado: o que se olha, em uma frase (\"cobrimento da armadura\", \"guarda-corpo em periferia de laje\").", "Critério de referência: projeto, norma (NBR 6118, NR-18), caderno de encargos. É o que torna a vistoria objetiva.", "Resultado: conforme, não conforme ou não se aplica. Nunca em branco.", "Foto numerada: toda não conformidade tem foto; conformidade crítica também.", "Gravidade: alta, média, baixa, definida antes da vistoria, não no calor do momento.", "Responsável pela correção: uma pessoa, não uma empresa.", "Prazo: data, não \"urgente\".", "Reinspeção: data e novo resultado, na mesma linha, sem apagar o original."] },
      { h2: "Cabeçalho que vale como evidência" },
      { p: "Obra ou contrato, local ou frente, data, vistoriador, acompanhante da contratada e condições do dia. Com acompanhante registrado, a contratada não pode dizer que não sabia. Com condições do dia, a foto escura tem explicação." },
      { h2: "O que acontece depois da vistoria" },
      { ol: ["O relatório sai no mesmo dia, de preferência antes de o vistoriador sair do canteiro.", "Cada não conformidade vira uma pendência com responsável e prazo, acompanhada até fechar.", "A reinspeção confirma a correção com nova foto.", "Os indicadores (não conformidades por disciplina, tempo médio de correção, reincidência) alimentam a reunião semanal."] },
      { h2: "Do papel ao aplicativo" },
      { p: "A planilha deste artigo organiza os campos. Quando a vistoria é diária e em várias frentes, o passo seguinte é o checklist no celular: foto com geolocalização e horário, assinatura digital, funcionamento sem sinal e PDF gerado ao concluir, enviado aos responsáveis. O ganho não é só tempo: é o relatório sair igual todo dia, por qualquer vistoriador." },
    ],
  },
  {
    slug: "controle-de-documentos-em-consorcio",
    title: "Controle de documentos em consórcio: evite versões perdidas",
    description: "Como montar o controle de documentos de um consórcio de engenharia: lista mestra, código único, revisão vigente, distribuição registrada e regras para o campo.",
    published: "2026-10-09",
    readingMinutes: 7,
    lead: "Controle de documentos em consórcio é uma lista mestra única, com código, revisão vigente, situação e distribuição registrada para cada projeto, memorial, laudo e licença, valendo para todas as consorciadas. O problema de versão perdida não vem da falta de pasta: vem de cada empresa ter a sua. A lista mestra única resolve, desde que uma pessoa seja dona dela.",
    model: { file: "/modelos/modelo-lista-mestra-de-documentos.xlsx", label: "Baixar modelo de lista mestra de documentos (planilha)", what: "Lista mestra com revisão vigente e situação, histórico de revisões e registro de distribuição." },
    related: { href: "/consorcios", label: "Tecnologia para consórcios de engenharia" },
    blocks: [
      { h2: "Por que consórcio perde versão" },
      { p: "Em uma construtora, o projeto chega do projetista e vai para o campo por um caminho. Em consórcio, chega para a líder, que repassa às consorciadas, que repassam às suas equipes. Cada repasse é uma chance de a revisão anterior continuar circulando. Some a isso e-mail, WhatsApp e pen drive, e em três meses existem quatro versões da mesma planta em uso." },
      { h2: "A lista mestra" },
      { p: "Uma única planilha (ou sistema) com uma linha por documento controlado e os campos que respondem às perguntas que a fiscalização faz:" },
      { ul: ["Código único, com padrão que diga contrato, disciplina, tipo e número (CT012-EST-DE-001).", "Título e tipo (desenho, memorial, laudo, ART/RRT, licença, ata, ofício).", "Revisão vigente e data: a única que pode ir para o campo.", "Situação: em elaboração, em aprovação, aprovado, superado, cancelado.", "Emitido por, aprovado por e data de aprovação.", "Local do arquivo: pasta ou link, um só.", "Histórico de revisões: motivo e o que mudou em cada uma.", "Distribuição: quem recebeu qual revisão, por qual meio, quando, e se confirmou."] },
      { h2: "Cinco regras que fazem a lista funcionar" },
      { ol: ["Uma pessoa é dona da lista mestra. Não um comitê: uma pessoa, com substituto nomeado.", "Documento sem código não existe. Chegou por e-mail, ganha código antes de circular.", "Superado nunca some da lista. Muda de situação, fica no histórico e sai do campo.", "Distribuição registrada é obrigatória: enviar sem registrar é o mesmo que não ter enviado.", "O campo consulta a lista, não a pasta. A pergunta \"qual é a revisão vigente?\" tem uma resposta, em um lugar."] },
      { h2: "O que mudar quando a planilha não basta" },
      { p: "Com centenas de documentos e várias consorciadas, a planilha pede um sistema: código gerado sozinho, revisão com fluxo de aprovação, distribuição por notificação com confirmação de leitura e busca por quem está com a versão errada. É também o que gera o acervo do as-built no fim do contrato sem retrabalho. A planilha deste artigo é o ponto de partida: os campos são os mesmos." },
    ],
  },
  {
    slug: "automacao-de-relatorios-de-campo",
    title: "Automação de relatórios de campo: do formulário ao PDF",
    description: "Como automatizar relatórios de obra (RDO consolidado, avanço físico-financeiro, fotográfico): inventário, fonte única, formulário no celular e PDF automático.",
    published: "2026-10-09",
    readingMinutes: 7,
    lead: "Automatizar relatórios de campo é fazer o dado ser coletado uma vez, no celular, no local, e todos os relatórios (RDO consolidado, avanço físico-financeiro, relatório fotográfico, medição) saírem dessa mesma fonte, gerados e enviados sem alguém montar à mão. O caminho tem quatro etapas: inventariar o que se produz hoje, definir a fonte única, trocar o papel pelo formulário e gerar o PDF automaticamente.",
    model: { file: "/modelos/modelo-inventario-de-relatorios-para-automacao.xlsx", label: "Baixar modelo de inventário de relatórios (planilha)", what: "Inventário de relatórios com frequência, produtor, fonte dos dados, horas por mês, risco e prioridade calculada." },
    related: { href: "/servicos/auto", label: "Automação de processos" },
    blocks: [
      { h2: "Etapa 1: inventariar" },
      { p: "Liste cada relatório que a equipe produz: nome, frequência, quem produz, quem recebe, de onde vêm os dados, formato de saída e horas por mês somando todos os envolvidos. Dê uma nota de risco de erro de 1 a 5. Prioridade é horas vezes risco. Em contratos de engenharia, o relatório semanal de avanço e o fotográfico mensal costumam ficar no topo: muitas horas, muita redigitação." },
      { h2: "Etapa 2: definir a fonte única" },
      { p: "Para cada número do relatório, uma origem só. Avanço físico vem da medição; efetivo vem do RDO; não conformidades vêm da vistoria. Se o mesmo número hoje é digitado em dois lugares, um deles para de existir. É a etapa que mais economiza e a que menos gente faz, porque exige decidir quem é dono de cada dado." },
      { h2: "Etapa 3: formulário no lugar do papel" },
      { ul: ["Campos obrigatórios: o formulário não fecha sem clima, efetivo e assinatura.", "Listas em vez de texto livre: frente de serviço, equipamento e função escolhidos, não digitados.", "Foto com geolocalização e horário, tirada pelo formulário, não pela galeria.", "Funcionamento sem sinal, com sincronização automática.", "Assinatura digital no aparelho, da contratada e do fiscal."] },
      { h2: "Etapa 4: gerar e enviar" },
      { p: "Com os dados em uma base, o relatório é um modelo: o PDF do RDO sai ao concluir o formulário; o semanal de avanço é montado na sexta às 17h a partir das medições e RDOs da semana; o fotográfico mensal agrupa as fotos por frente e data. O envio é automático para a lista de cada relatório, e o painel mostra o mesmo número que foi para o PDF. Power Automate ou n8n resolvem a orquestração; o PDF pode sair do próprio sistema." },
      { h2: "O que medir depois" },
      { ul: ["Horas por mês por relatório, antes e depois.", "Atraso de entrega: dias entre o período e o envio.", "Divergências apontadas pelo cliente ou pela fiscalização.", "Quantos relatórios ainda dependem de alguém montar à mão."] },
      { h2: "Por onde a EGD começa" },
      { p: "Pelo inventário, em uma semana, com a planilha deste artigo. Os primeiros fluxos automatizados ficam prontos em 2 a 3 semanas, começando pelo relatório de maior prioridade, e cada um entra em produção com monitoramento e um responsável. O ganho típico é a equipe de planejamento voltar a planejar em vez de formatar." },
    ],
  },
];

export const article = (slug: string) => ARTICLES.find((a) => a.slug === slug);
