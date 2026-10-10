import type { FaqItem } from "./faq";
import { PRODUCTS_FULL } from "./legacy-pages";

/**
 * Página própria de cada produto (/produtos/<slug>). A lista em /produtos continua com as
 * âncoras antigas; aqui entra o que faz a página valer uma busca: definição em uma frase,
 * para quem é, como a implantação acontece e perguntas com resposta direta.
 * O `id` é o mesmo de PRODUCTS_FULL (título, funcionalidades, prazo e stack vêm de lá).
 */
export type ProductDetail = {
  id: (typeof PRODUCTS_FULL)[number]["id"];
  metaTitle: string;
  metaDescription: string;
  /** Primeira frase da página: o que é, para quem, com qual resultado. */
  definition: string;
  forWhom: string[];
  steps: { t: string; d: string }[];
  faq: FaqItem[];
  /** Artigo relacionado (slug em artigos.ts), quando existe. */
  article?: string;
};

export const PRODUCT_DETAILS: ProductDetail[] = [
  {
    id: "contratos",
    metaTitle: "Sistema de gestão de contratos de engenharia e obras",
    metaDescription: "Sistema de gestão de contratos para construtoras e consórcios: aprovação por alçada, vigência, aditivos, medições e alertas de vencimento. Implantação em 2 a 4 semanas.",
    definition: "A Gestão de Contratos da EGD é um sistema para controlar o ciclo completo de contratos de engenharia e serviços: criação, aprovação, vigência, aditivos, medições e renovação, com alertas e trilha de auditoria.",
    forWhom: ["Consórcios e construtoras que administram dezenas de contratos com subcontratados e fornecedores", "Áreas jurídica, de suprimentos e financeira que hoje controlam vigências em planilha", "Gerentes de contrato que precisam responder rápido sobre saldo, aditivos e vencimentos"],
    steps: [
      { t: "Levantamento", d: "Mapeamos os tipos de contrato, as alçadas de aprovação e os alertas que a operação precisa. Uma semana." },
      { t: "Configuração", d: "Ajustamos o fluxo, os campos e os painéis ao seu processo, e migramos a carteira atual com vigência e saldo." },
      { t: "Operação assistida", d: "A equipe passa a registrar contratos e aditivos no sistema com acompanhamento da EGD nas primeiras semanas." },
    ],
    faq: [
      { q: "O sistema de gestão de contratos controla aditivos e medições?", a: "Sim. Cada aditivo fica ligado ao contrato original, com número, data, objeto e impacto no valor e no prazo. As medições registram quantidade e valor do período, acumulado e saldo contratual, e geram o boletim para aprovação." },
      { q: "Quais alertas de vencimento de contrato o sistema envia?", a: "Alertas automáticos a 90, 60 e 30 dias do fim da vigência e de datas de reajuste, por e-mail e no painel. Os prazos são configuráveis por tipo de contrato." },
      { q: "A gestão de contratos integra com ERP?", a: "Sim. Há integração com TOTVS e SAP para fornecedores, centros de custo e pagamentos, e com Active Directory ou Azure AD para login e permissões." },
    ],
    article: "medicao-de-contrato-de-obra",
  },
  {
    id: "rh",
    metaTitle: "Sistema de gestão de RH para empresas de engenharia",
    metaDescription: "Sistema de RH com ponto eletrônico georreferenciado, banco de horas, férias, onboarding e turnover, integrado à folha (ADP, Senior, TOTVS RM). Implantação em 3 a 5 semanas.",
    definition: "A Gestão de RH da EGD é uma plataforma para controlar jornada, banco de horas, férias, treinamentos e onboarding de equipes próprias e de campo, integrada à folha de pagamento que a empresa já usa.",
    forWhom: ["Empresas de engenharia com equipes em canteiro e escritório que precisam registrar ponto com geolocalização", "Departamentos pessoais que fecham banco de horas e férias em planilhas separadas", "Lideranças que querem enxergar headcount, turnover e capacitação por obra ou contrato"],
    steps: [
      { t: "Levantamento", d: "Mapeamos jornadas, escalas, regras de banco de horas e o sistema de folha a integrar." },
      { t: "Configuração e integração", d: "Configuramos escalas, aprovações e trilhas de treinamento e ligamos a plataforma à folha (ADP, Senior ou TOTVS RM)." },
      { t: "Implantação por frente", d: "Começamos por uma obra ou área, ajustamos com o feedback da equipe e expandimos." },
    ],
    faq: [
      { q: "O ponto eletrônico funciona em canteiro de obras?", a: "Sim. O registro é feito pelo celular com geolocalização e horário do servidor, e funciona sem internet, sincronizando depois. O sistema atende às regras de ponto eletrônico vigentes no Brasil." },
      { q: "A gestão de RH integra com a folha de pagamento?", a: "Sim. Há integração com ADP, Senior e TOTVS RM para enviar horas, faltas, férias e afastamentos sem redigitação." },
      { q: "Dá para acompanhar treinamentos obrigatórios por função?", a: "Sim. As trilhas de onboarding e capacitação emitem certificados e avisam quando um treinamento obrigatório, como NR-18 ou NR-35, está para vencer." },
    ],
  },
  {
    id: "vistorias",
    metaTitle: "App de vistoria de obras: checklist offline e relatório PDF",
    metaDescription: "Aplicativo de vistoria e fiscalização de obras com checklists, fotos georreferenciadas, assinatura digital, operação offline e PDF automático. Implantação em 4 a 6 semanas.",
    definition: "O App de Vistorias e Fiscalização de Obras da EGD é um aplicativo móvel para inspeções em campo, com checklists por tipo de obra, fotos georreferenciadas, assinatura digital, operação 100% offline e relatório em PDF gerado automaticamente.",
    forWhom: ["Fiscalização de consórcios e gerenciadoras que vistoriam frentes de obra todo dia", "Equipes de qualidade e segurança do trabalho que registram não conformidades com foto e prazo", "Manutenção de ativos e inspeções periódicas em unidades habitacionais, redes e subestações"],
    steps: [
      { t: "Checklists", d: "Transformamos os seus formulários em checklists configuráveis, com critérios, gravidade e campos de foto." },
      { t: "Piloto em campo", d: "Uma equipe usa o app em uma frente real por duas semanas, inclusive sem sinal, e ajustamos o que atrapalha." },
      { t: "Relatórios e painel", d: "Configuramos o PDF automático, o envio por e-mail e o painel web com mapa de não conformidades." },
    ],
    faq: [
      { q: "O app de vistoria funciona sem internet?", a: "Sim. Checklists, fotos e assinaturas ficam no aparelho e sincronizam automaticamente quando a conexão volta. O vistoriador não perde nada em canteiro sem sinal." },
      { q: "O relatório de vistoria em PDF é gerado automaticamente?", a: "Sim. Ao concluir a vistoria, o app gera o PDF com fotos, geolocalização, horário, resultado de cada item e assinaturas, e envia por e-mail aos responsáveis sem trabalho manual." },
      { q: "Dá para usar o app com os checklists que já temos?", a: "Sim. Os checklists são configuráveis por tipo de obra ou ativo: itens, critérios, gravidade, campos obrigatórios e fotos. Migramos os formulários atuais na implantação." },
    ],
    article: "checklist-de-vistoria-de-obra",
  },
  {
    id: "helpdesk",
    metaTitle: "Central de chamados (helpdesk) com SLA, WhatsApp e IA",
    metaDescription: "Sistema de tickets multicanal (e-mail, web, Teams, WhatsApp) com SLA por categoria, escalonamento, base de conhecimento com IA e painel ao vivo. Implantação em 2 a 3 semanas.",
    definition: "A Central de Chamados da EGD é um sistema de tickets para suporte interno e externo, com entrada por e-mail, web, Teams e WhatsApp, SLA por categoria e prioridade, escalonamento automático e base de conhecimento com IA.",
    forWhom: ["Áreas de TI e facilities que recebem pedidos por e-mail e WhatsApp sem controle de prazo", "Suporte a clientes e a unidades habitacionais entregues, com garantia e assistência técnica", "Operações que precisam medir tempo de primeira resposta e de solução por categoria"],
    steps: [
      { t: "Catálogo e SLA", d: "Definimos categorias, prioridades, horário comercial e os prazos de resposta e solução de cada uma." },
      { t: "Canais", d: "Ligamos e-mail, formulário web, Teams e WhatsApp ao sistema; cada mensagem vira um chamado classificado." },
      { t: "Base de conhecimento", d: "Carregamos procedimentos e respostas; o agente de IA sugere a solução e roteia o chamado." },
    ],
    faq: [
      { q: "A central de chamados recebe pedidos pelo WhatsApp?", a: "Sim. Mensagens de WhatsApp, e-mail, Teams, Slack e formulário web viram chamados na mesma fila, com classificação automática por agente de IA e resposta pelo mesmo canal." },
      { q: "Como o SLA é controlado na central de chamados?", a: "Cada categoria e prioridade tem prazo de primeira resposta e de solução, contados em horário comercial. O painel ao vivo mostra os chamados perto de estourar e escala automaticamente." },
      { q: "A base de conhecimento com IA responde sozinha?", a: "Ela sugere a resposta ao atendente com base nos procedimentos da empresa (busca semântica com RAG) e pode responder automaticamente perguntas simples, sempre citando a fonte. A decisão de ativar resposta automática é da empresa." },
    ],
    article: "automacao-de-relatorios-de-campo",
  },
];

export const productDetail = (id: string) => PRODUCT_DETAILS.find((p) => p.id === id);
export const productBase = (id: string) => PRODUCTS_FULL.find((p) => p.id === id);
