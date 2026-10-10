import type { FaqItem } from "./faq";

/**
 * Página "Para consórcios de engenharia" (/consorcios): o nicho em que a EGD nasceu e que
 * nenhum fornecedor de software de obras ocupa em busca (levantamento de 2026-10-09).
 * Texto direto e citável: o que é, quais problemas, o que a EGD entrega e perguntas.
 */
export const CONSORCIOS = {
  metaTitle: "Software e automação para consórcios de engenharia",
  metaDescription: "Sistemas de gestão, app de vistorias e automação de relatórios para consórcios de engenharia, habitação e energia: documentos, medições, fiscalização e prestação de contas.",
  h1: "Tecnologia para consórcios de engenharia.",
  definition: "A EGD desenvolve sistemas de gestão, aplicativos de campo e automações de relatórios para consórcios de engenharia, habitação e energia: controle de documentos, vistorias e fiscalização, medições de contrato e prestação de contas entre as consorciadas, com os dados do contrato em um só lugar.",
  problems: [
    { t: "Documentos em várias versões", d: "Cada consorciada tem sua pasta, e o campo usa o desenho superado. A lista mestra única com revisão vigente e distribuição registrada acaba com a dúvida." },
    { t: "Vistoria no papel, relatório à noite", d: "A fiscalização anota em caderneta e monta o relatório depois, com foto do WhatsApp. O app de vistoria gera o PDF na hora, offline, com foto, local e assinatura." },
    { t: "Medição que atrasa o faturamento", d: "O boletim depende de planilhas de frentes diferentes. O sistema consolida quantidades, acumulados e saldo por item contratual e por consorciada." },
    { t: "Relatório para o cliente e para as consorciadas", d: "O mesmo dado é reformatado três vezes. A automação monta avanço físico-financeiro, RDO consolidado e relatório fotográfico a partir de uma fonte." },
    { t: "Prestação de contas entre consorciadas", d: "Rateio de custos, horas e medições por participação precisa ser auditável. Painéis com camada semântica única dão o mesmo número para todas as partes." },
    { t: "Encerramento do contrato", d: "No fim, o consórcio precisa entregar o acervo: documentos, vistorias, medições e atas. Tudo nasce organizado para o as-built e para a garantia." },
  ],
  deliverables: [
    { href: "/produtos/vistorias", t: "App de vistorias e fiscalização", d: "Checklists por frente, fotos georreferenciadas, operação offline e PDF automático." },
    { href: "/produtos/contratos", t: "Gestão de contratos e medições", d: "Vigência, aditivos, boletim de medição com acumulado e saldo, alertas de vencimento." },
    { href: "/servicos/auto", t: "Automação de relatórios", d: "RDO consolidado, avanço físico-financeiro e relatório fotográfico gerados da mesma base." },
    { href: "/servicos/data", t: "Painéis para o comitê do consórcio", d: "Indicadores de contrato com definição única, por frente, por consorciada e por período." },
  ],
  faq: [
    { q: "Existe software específico para consórcio de engenharia?", a: "Os softwares de gestão de obras do mercado atendem uma construtora; o consórcio tem particularidades que eles não cobrem: várias empresas no mesmo contrato, rateio por participação, documentos com dono em cada consorciada e prestação de contas ao comitê. A EGD monta a solução a partir de produtos prontos e automações, ajustada a essa estrutura." },
    { q: "Como a EGD controla documentos entre as consorciadas?", a: "Com uma lista mestra única: cada documento tem código, revisão vigente, situação e distribuição registrada (quem recebeu qual revisão e quando). Os documentos superados continuam na lista, para auditoria, mas só a revisão vigente vai para o campo." },
    { q: "O app de vistoria funciona em canteiro sem sinal?", a: "Sim. Checklists, fotos e assinaturas ficam no aparelho e sincronizam quando a conexão volta. O relatório em PDF sai no fim da vistoria, com foto, geolocalização, horário e assinatura." },
    { q: "Quanto tempo leva para implantar em um consórcio em andamento?", a: "De 2 a 6 semanas por produto, começando pelo que mais dói: em geral vistorias ou documentos. A EGD implanta por frente de obra, sem parar a operação, e migra o histórico que o contrato exige." },
    { q: "Os dados ficam com o consórcio no fim do contrato?", a: "Sim. Código, dados e documentos são do consórcio, exportáveis e entregáveis às consorciadas e ao contratante no encerramento, inclusive para o as-built e o período de garantia." },
  ] satisfies FaqItem[],
};
