import { SITE } from "./site";

export type FaqItem = { q: string; a: string };

/**
 * Perguntas frequentes das páginas públicas. Cada resposta começa pela resposta em si
 * (uma ou duas frases diretas), porque é esse trecho que buscadores e assistentes de IA
 * citam quando alguém pergunta "o que é a EGD", "quanto tempo leva" ou "atende minha cidade".
 * O mesmo texto vai para a tela e para o JSON-LD (FAQPage); não duplique perguntas entre páginas.
 */
export const FAQ: Record<"home" | "servicos" | "produtos" | "sobre" | "contato", FaqItem[]> = {
  home: [
    {
      q: "O que a EGD Consultoria em Tecnologia faz?",
      a: `A EGD desenvolve sistemas de gestão, aplicativos de campo e automações de relatórios para consórcios de engenharia, habitação e energia. O trabalho vai do levantamento do processo até o software em produção, com dados, painéis e agentes de IA quando fazem sentido para a operação.`,
    },
    {
      q: "Onde a EGD atende?",
      a: `A EGD fica em São Paulo e atende remotamente em todo o Brasil. Visitas presenciais acontecem quando o projeto pede, como levantamentos em canteiro ou implantação com a equipe de campo.`,
    },
    {
      q: "Que tipo de empresa contrata a EGD?",
      a: `Empresas e consórcios que executam contratos de engenharia, habitação, energia e infraestrutura e precisam controlar documentos, vistorias, medições e relatórios sem planilhas espalhadas. Também atendemos áreas de operação que querem automatizar rotinas e enxergar indicadores em um painel.`,
    },
    {
      q: "Como começa um projeto com a EGD?",
      a: `Começa por uma conversa de 30 minutos sobre o processo real da sua operação. A partir dela a EGD envia uma proposta com escopo, prazo e investimento, e o cliente acompanha cada etapa pelo portal, com entregas aprovadas uma a uma.`,
    },
  ],
  servicos: [
    {
      q: "Quais serviços a EGD oferece?",
      a: `Seis frentes: desenvolvimento de sistemas sob medida, automação de processos, dados e painéis (BI), agentes de IA, governança de dados e consultoria em projetos ágeis. Cada frente pode ser contratada sozinha ou combinada, conforme o problema a resolver.`,
    },
    {
      q: "Quanto tempo leva para ter uma primeira entrega?",
      a: `Entre 2 e 8 semanas, dependendo da frente: os primeiros fluxos de automação saem em 2 a 3 semanas, um painel inicial em 3 a 5 semanas e um MVP de sistema em 4 a 8 semanas. O prazo é definido na proposta e acompanhado pelo cliente no portal.`,
    },
    {
      q: "A EGD trabalha com qual tecnologia?",
      a: `Com a que melhor se encaixa no contexto do cliente: AWS, Azure, Power Platform (Power Apps, Power Automate, Power BI), ecossistema Apache e open-source moderno como TypeScript, Python, n8n e PostgreSQL. O código, os modelos e os dados ficam com o cliente.`,
    },
    {
      q: "A EGD faz agentes de IA para empresas?",
      a: `Sim. A EGD constrói copilotos e agentes integrados aos sistemas do cliente, com busca sobre documentos próprios (RAG), avaliação de qualidade e guardrails. Quando o dado é sensível, o modelo roda em ambiente privado do cliente.`,
    },
  ],
  produtos: [
    {
      q: "Quais produtos prontos a EGD oferece?",
      a: `Quatro aceleradores: Gestão de Contratos, Gestão de RH, App de Vistorias e Fiscalização de Obras e Central de Chamados (helpdesk). Eles são implantados em semanas e ajustados ao processo de cada empresa.`,
    },
    {
      q: "Em quanto tempo um produto da EGD entra em operação?",
      a: `De 2 a 6 semanas, conforme o produto: a Central de Chamados em 2 a 3 semanas, a Gestão de Contratos em 2 a 4, a Gestão de RH em 3 a 5 e o App de Vistorias em 4 a 6 semanas.`,
    },
    {
      q: "O app de vistorias funciona sem internet?",
      a: `Sim. O App de Vistorias e Fiscalização de Obras opera 100% offline, com checklists, fotos georreferenciadas e assinatura digital, e sincroniza automaticamente quando a conexão volta. Os relatórios em PDF são gerados e enviados sem trabalho manual.`,
    },
    {
      q: "Os dados e o código dos produtos ficam com o cliente?",
      a: `Sim. A propriedade do código, dos modelos e dos dados é do cliente, sem dependência escondida de fornecedor. A EGD implanta na nuvem ou no ambiente que a empresa já usa.`,
    },
  ],
  sobre: [
    {
      q: "Quem é a EGD Consultoria em Tecnologia?",
      a: `A EGD é uma consultoria de tecnologia de São Paulo, fundada em ${SITE.foundingYear} e conduzida por ${SITE.founder.name}. Nasceu dentro de consórcios de engenharia e habitação, resolvendo controle de documentos, vistorias e relatórios, e hoje também entrega dados, painéis e IA.`,
    },
    {
      q: "O que diferencia a EGD de outras consultorias de tecnologia?",
      a: `A EGD entrega código em produção, não só diagnóstico: toda solução sai com testes, monitoramento e manual de operação. O time é pequeno e sênior, trabalha em ciclos curtos e mede resultado por indicadores, não por opinião.`,
    },
    {
      q: "Em quais setores a EGD já atuou?",
      a: `Principalmente em consórcios de engenharia, habitação, energia e infraestrutura, com sistemas de gestão de contratos, vistorias de campo e automação de relatórios. A mesma base atende áreas de operação em outros setores.`,
    },
  ],
  contato: [
    {
      q: "Em quanto tempo a EGD responde um contato?",
      a: `${SITE.responseTime} O atendimento é de segunda a sexta, das 9h às 18h, no horário de Brasília.`,
    },
    {
      q: "A primeira conversa com a EGD tem custo?",
      a: `Não. A conversa inicial de 30 minutos é gratuita e serve para mapear gargalos e oportunidades. Só depois dela a EGD envia uma proposta com escopo, prazo e investimento.`,
    },
    {
      q: "Como falar com a EGD?",
      a: `Pelo formulário desta página ou pelo e-mail ${SITE.email}. Clientes com acesso acompanham projetos, propostas e documentos no portal do cliente, em egdsystem.com.br/portal.`,
    },
  ],
};
