import type { FaqItem } from "./faq";

/**
 * Páginas "Para quem" (/para/<slug>): uma URL por público, no padrão da página de consórcios
 * (/consorcios), para que quem busca "software para construtora", "vistoria de entrega para
 * incorporadora" ou "app de fiscalização para gerenciadora" encontre uma página que fala a
 * língua dele. Texto direto e citável: o que é, quais problemas, o que a EGD entrega e perguntas.
 */
export type Publico = {
  slug: string;
  /** Nome curto do público, para cards e rodapé ("Construtoras"). */
  nome: string;
  /** Rótulo do link ("Para construtoras"). */
  rotulo: string;
  /** Uma frase para o card da home e do índice. */
  resumo: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  definition: string;
  problems: { t: string; d: string }[];
  deliverables: { href: string; t: string; d: string }[];
  /** Slugs de artigos relacionados (ver `artigos.ts`). */
  articles: string[];
  faq: FaqItem[];
  /** Pergunta de fechamento do CTA. */
  cta: { title: [string, string]; text: string };
};

export const PUBLICOS: Publico[] = [
  {
    slug: "construtoras",
    nome: "Construtoras",
    rotulo: "Para construtoras",
    resumo: "RDO no celular, medição por item e por frente, vistorias com PDF automático e painel de obra que o escritório e o cliente leem do mesmo lugar.",
    metaTitle: "Software e automação para construtoras",
    metaDescription: "Sistemas de gestão, app de vistorias e automação de RDO, medições e relatórios para construtoras e empreiteiras: obra, escritório e cliente com o mesmo dado.",
    h1: "Tecnologia para construtoras e empreiteiras.",
    definition: "A EGD desenvolve sistemas de gestão, aplicativos de campo e automações de relatórios para construtoras e empreiteiras: RDO preenchido no celular, medição do contrato por item e por frente, vistorias de qualidade com foto e PDF automático e painéis de obra que o escritório, a diretoria e o cliente leem do mesmo lugar.",
    problems: [
      { t: "RDO atrasado e sem padrão", d: "Cada engenheiro preenche do seu jeito e, no fim do mês, falta evidência para o pleito. O formulário no celular registra clima, efetivo, equipamentos e ocorrências com foto e horário, e gera o PDF no mesmo dia." },
      { t: "Medição montada em planilhas de frentes diferentes", d: "O boletim demora porque cada frente manda a sua planilha. O sistema consolida quantidade, acumulado e saldo por item contratual, com memória de cálculo pronta para a fiscalização conferir." },
      { t: "Obra e escritório com números diferentes", d: "O avanço físico da obra não bate com o financeiro do escritório. Uma fonte única alimenta a curva física, o faturamento e o painel da diretoria." },
      { t: "Não conformidade anotada e esquecida", d: "A vistoria de qualidade fica na caderneta e não vira ação. O app registra item, gravidade, foto, responsável e prazo, e cobra a reinspeção." },
      { t: "Subempreiteiros sem controle de contrato", d: "Vigência, aditivo e medição do subempreiteiro ficam no e-mail. A gestão de contratos registra tudo, com alerta de vencimento e saldo por fornecedor." },
      { t: "Relatório para o cliente refeito toda semana", d: "O relatório semanal e o fotográfico são montados à mão a partir dos mesmos dados. A automação monta e envia no dia e no horário combinados." },
    ],
    deliverables: [
      { href: "/produtos/vistorias", t: "App de vistorias e RDO", d: "Checklists por frente, fotos georreferenciadas, operação offline e PDF automático." },
      { href: "/produtos/contratos", t: "Gestão de contratos e medições", d: "Contrato principal e subempreiteiros, boletim com acumulado e saldo, alertas de vencimento." },
      { href: "/servicos/auto", t: "Automação de relatórios", d: "RDO consolidado, avanço físico-financeiro e relatório fotográfico gerados da mesma base." },
      { href: "/servicos/data", t: "Painel de obra e da diretoria", d: "Curva física, faturamento e pendências por obra, com definição única de cada indicador." },
    ],
    articles: ["rdo-relatorio-diario-de-obra", "medicao-de-contrato-de-obra", "checklist-de-vistoria-de-obra"],
    faq: [
      { q: "A EGD atende construtora de pequeno e médio porte?", a: "Sim. Os produtos são implantados por obra, começando pelo que mais dói, em geral o RDO ou a medição, em 2 a 6 semanas. O investimento é definido na proposta, pelo escopo contratado." },
      { q: "A EGD substitui o ERP ou o software de orçamento da construtora?", a: "Não. A EGD integra com o ERP já em uso, como TOTVS e SAP, e com as planilhas de orçamento existentes, e cuida do que fica entre eles: o registro de campo, a medição, a vistoria e o relatório. O orçamento e o financeiro continuam onde estão." },
      { q: "Dá para começar só pelo RDO e ampliar depois?", a: "Sim. O RDO digital é a entrada mais comum: formulário no celular, foto, assinatura e PDF no mesmo dia. Como a base é a mesma, a medição, a vistoria e os painéis entram depois sem redigitar nada." },
      { q: "O encarregado que não é de tecnologia consegue usar o app?", a: "Sim. O formulário tem os campos do RDO que ele já conhece, funciona sem sinal e a implantação inclui treinamento da equipe de campo e um período de acompanhamento até a rotina pegar." },
    ],
    cta: { title: ["Qual obra está começando", "ou atrasando o relatório?"], text: "Em 30 minutos dizemos por onde começar: RDO, medição, vistoria ou painel." },
  },
  {
    slug: "incorporadoras",
    nome: "Incorporadoras",
    rotulo: "Para incorporadoras",
    resumo: "Vistoria de entrega de unidades, assistência técnica pós-obra com SLA, contratos com fornecedores e painel por empreendimento.",
    metaTitle: "Software para incorporadoras: vistoria de entrega e pós-obra",
    metaDescription: "Vistoria de entrega de unidades, assistência técnica pós-obra, controle de contratos com fornecedores e painéis de empreendimento para incorporadoras e programas habitacionais.",
    h1: "Tecnologia para incorporadoras e programas habitacionais.",
    definition: "A EGD desenvolve sistemas e aplicativos para incorporadoras e empreendimentos habitacionais: vistoria de entrega de unidades com laudo em PDF, central de chamados de assistência técnica pós-obra com SLA, gestão de contratos com construtoras e fornecedores e painéis que mostram cada empreendimento do lançamento à entrega das chaves.",
    problems: [
      { t: "Vistoria de entrega com retrabalho", d: "O cliente aponta, o vistoriador anota, e o laudo é digitado depois. O app faz o checklist por unidade, com foto, assinatura do cliente e laudo em PDF na hora, e cada pendência sai com responsável e prazo." },
      { t: "Assistência técnica pós-obra sem SLA", d: "Chamados do morador chegam por WhatsApp e e-mail, sem prazo nem histórico. A central de chamados registra, encaminha ao responsável, cobra o SLA e guarda tudo por unidade." },
      { t: "Contratos com construtora e fornecedores espalhados", d: "Aditivos, medições, retenções e garantias ficam em pastas diferentes. A gestão de contratos consolida vigência, saldo e alertas de vencimento por empreendimento." },
      { t: "Prestação de contas do programa habitacional", d: "O agente financeiro e o poder público pedem relatório de avanço e fotográfico em formato próprio. A automação monta os dois a partir da mesma base, no padrão exigido." },
      { t: "Cada empreendimento com um painel diferente", d: "Vendas, obra e pós-obra têm planilhas separadas. A camada semântica única dá um painel por empreendimento e um consolidado para a diretoria, com os mesmos indicadores." },
      { t: "Histórico da unidade perdido na entrega", d: "No período de garantia ninguém acha a vistoria nem os reparos feitos. O acervo por unidade guarda vistoria, chamados e reparos, pronto para a assistência e para a defesa." },
    ],
    deliverables: [
      { href: "/produtos/vistorias", t: "Vistoria de entrega de unidades", d: "Checklist por unidade, foto, assinatura do cliente e laudo em PDF, offline." },
      { href: "/produtos/helpdesk", t: "Assistência técnica pós-obra", d: "Chamados por e-mail, web e WhatsApp, SLA por categoria, base de conhecimento e indicadores." },
      { href: "/produtos/contratos", t: "Contratos com construtora e fornecedores", d: "Vigência, aditivos, medições, retenções e alertas de vencimento por empreendimento." },
      { href: "/servicos/data", t: "Painel por empreendimento", d: "Obra, entrega e pós-obra com definição única, por empreendimento e consolidado." },
    ],
    articles: ["checklist-de-vistoria-de-obra", "automacao-de-relatorios-de-campo", "medicao-de-contrato-de-obra"],
    faq: [
      { q: "O app de vistoria serve para a entrega de chaves ao cliente?", a: "Sim. O checklist é por unidade e por ambiente, com foto de cada item, assinatura do cliente na tela e laudo em PDF enviado na hora. As pendências ficam registradas com responsável e prazo, e a reinspeção é agendada no mesmo app." },
      { q: "Como a EGD organiza a assistência técnica pós-obra?", a: "Com a central de chamados: o morador abre o chamado por e-mail, web ou WhatsApp, o sistema classifica, encaminha ao responsável e cobra o SLA. Cada unidade guarda o histórico de chamados e reparos, e a diretoria vê o volume por empreendimento e por tipo de defeito." },
      { q: "A EGD atende programas habitacionais de interesse social?", a: "Sim. A EGD nasceu em contratos de engenharia e habitação, e monta os relatórios de avanço e fotográfico no padrão que o agente financeiro e o poder público pedem, gerados da mesma base da obra, sem redigitar." },
      { q: "Dá para ver todos os empreendimentos em um só painel?", a: "Sim. A camada semântica única define cada indicador uma vez (avanço, entregas, chamados abertos, prazo médio de reparo) e o painel mostra por empreendimento e consolidado, com o mesmo número para obra, pós-obra e diretoria." },
    ],
    cta: { title: ["Qual empreendimento está", "chegando na entrega?"], text: "Em 30 minutos dizemos por onde começar: vistoria de entrega, assistência técnica, contratos ou painel." },
  },
  {
    slug: "empresas-de-engenharia",
    nome: "Empresas de engenharia",
    rotulo: "Para empresas de engenharia",
    resumo: "Fiscalização com evidência, conferência da medição da contratada, documentos na revisão vigente e relatório mensal ao contratante gerado da mesma base.",
    metaTitle: "Software para gerenciadoras e fiscalização de obras",
    metaDescription: "App de fiscalização, controle de documentos e relatórios automáticos para gerenciadoras, fiscalizadoras e projetistas: evidência de campo, medição conferida e relatório mensal.",
    h1: "Tecnologia para empresas de engenharia consultiva.",
    definition: "A EGD desenvolve aplicativos de fiscalização, controle de documentos e automações de relatórios para gerenciadoras, fiscalizadoras e projetistas: a vistoria vira relatório no mesmo dia, a medição da contratada é conferida item a item, o projeto circula na revisão vigente e o contratante recebe o relatório mensal gerado da mesma base.",
    problems: [
      { t: "Fiscalização sem evidência organizada", d: "A foto fica no WhatsApp e a anotação na caderneta. O app registra checklist, foto georreferenciada, horário e assinatura, e gera o relatório de fiscalização em PDF ao fim da visita." },
      { t: "Conferência da medição da contratada", d: "O boletim chega pronto e a conferência é no olho. O sistema compara o medido em campo com o pleiteado, item a item, registra glosas e a memória de cálculo que sustenta a decisão." },
      { t: "Relatório mensal ao contratante feito à mão", d: "Avanço físico-financeiro, fotográfico e pendências são montados em três arquivos. A automação gera os três da mesma base, no modelo do contrato, e envia na data." },
      { t: "Projetos em revisões desencontradas", d: "A obra executa pela revisão superada porque a GRD se perdeu. A lista mestra única registra código, revisão vigente e distribuição, e só a vigente vai para o campo." },
      { t: "Vários contratos, vários indicadores", d: "Cada contrato tem a sua planilha de acompanhamento. O painel da carteira mostra avanço, pendências e prazos por contrato e consolidado, com definição única." },
      { t: "Atas e pendências sem dono", d: "A reunião de obra gera ata, mas as ações não são cobradas. O sistema registra ata, responsável e prazo, e lembra quem deve o quê antes da próxima reunião." },
    ],
    deliverables: [
      { href: "/produtos/vistorias", t: "App de fiscalização", d: "Checklist por disciplina, foto georreferenciada, assinatura e relatório em PDF, offline." },
      { href: "/servicos/auto", t: "Relatórios ao contratante", d: "Avanço físico-financeiro, fotográfico e pendências gerados da mesma base, no modelo do contrato." },
      { href: "/servicos/dev", t: "Controle de documentos e medições", d: "Lista mestra, GRD, conferência de boletim e atas em sistema sob medida para a carteira." },
      { href: "/servicos/data", t: "Painel da carteira de contratos", d: "Avanço, pendências e prazos por contrato e consolidado, com definição única." },
    ],
    articles: ["checklist-de-vistoria-de-obra", "controle-de-documentos-em-consorcio", "medicao-de-contrato-de-obra"],
    faq: [
      { q: "O app de fiscalização serve para contrato público?", a: "Sim. Cada registro sai com data, hora, local e assinatura, o relatório segue o modelo que o contratante exige e os dados são exportáveis para anexar ao processo. A fiscalizadora fica com a evidência organizada por contrato e por visita." },
      { q: "Como a gerenciadora confere a medição da contratada no sistema?", a: "O fiscal registra o medido em campo por item contratual, o sistema compara com o boletim pleiteado e destaca as diferenças. A glosa e a memória de cálculo ficam registradas, e o boletim aprovado sai com acumulado e saldo." },
      { q: "A EGD faz controle de documentos de projeto com GRD?", a: "Sim. A lista mestra registra código, título, revisão vigente e situação de cada documento, e a GRD (guia de remessa) registra quem recebeu qual revisão e quando. As revisões superadas continuam no histórico, para auditoria, mas não vão para o campo." },
      { q: "Uma projetista pode contratar só o controle de documentos?", a: "Sim. O controle de documentos é entregue sozinho, com lista mestra, GRD e distribuição por cliente ou por obra, e cresce depois para medições e relatórios se a projetista também fizer acompanhamento de obra." },
    ],
    cta: { title: ["Qual contrato está pedindo", "mais evidência e menos retrabalho?"], text: "Em 30 minutos dizemos por onde começar: fiscalização, documentos, medição ou relatório." },
  },
];

export const publico = (slug: string) => PUBLICOS.find((p) => p.slug === slug);

/** Todos os públicos com página própria, incluindo consórcios (que tem URL própria em /consorcios). */
export const PUBLICOS_LINKS: { href: string; nome: string; rotulo: string; resumo: string }[] = [
  { href: "/consorcios", nome: "Consórcios de engenharia", rotulo: "Para consórcios", resumo: "Documentos entre consorciadas, vistorias, medições por participação e prestação de contas ao comitê." },
  ...PUBLICOS.map((p) => ({ href: `/para/${p.slug}`, nome: p.nome, rotulo: p.rotulo, resumo: p.resumo })),
];
