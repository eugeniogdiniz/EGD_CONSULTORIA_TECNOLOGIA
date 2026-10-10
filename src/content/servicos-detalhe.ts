import type { FaqItem } from "./faq";
import { SERVICES } from "./legacy-pages";

/**
 * Página própria de cada frente de serviço (/servicos/<slug>). Capacidades, stack e prazos vêm
 * de SERVICES; aqui entra a definição em uma frase, os problemas que a frente resolve e as
 * perguntas com resposta direta.
 */
export type ServiceDetail = {
  id: (typeof SERVICES)[number]["id"];
  metaTitle: string;
  metaDescription: string;
  definition: string;
  problems: string[];
  faq: FaqItem[];
  article?: string;
};

export const SERVICE_DETAILS: ServiceDetail[] = [
  {
    id: "dev",
    metaTitle: "Desenvolvimento de sistemas sob medida para engenharia",
    metaDescription: "Desenvolvimento de sistemas web, mobile e APIs sob medida, do MVP em 4 a 8 semanas à plataforma em nuvem, com testes, CI/CD e código de propriedade do cliente.",
    definition: "O desenvolvimento de sistemas da EGD cria aplicações web, mobile e plataformas internas sob medida para a operação do cliente, do MVP à arquitetura em nuvem, com testes, observabilidade e código entregue em produção.",
    problems: ["Processo crítico rodando em planilhas compartilhadas e e-mails", "Sistema legado que ninguém consegue mais alterar com segurança", "Produto novo que precisa sair do papel em semanas, não em trimestres"],
    faq: [
      { q: "Quanto custa desenvolver um sistema sob medida?", a: "Depende do escopo, por isso a EGD só precifica depois de uma conversa e de um levantamento curto. A proposta traz escopo, prazo e investimento fechados por etapa, e o cliente acompanha cada entrega pelo portal." },
      { q: "O código do sistema fica com o cliente?", a: "Sim. Código, infraestrutura e dados são do cliente desde o primeiro commit, em repositório próprio, sem dependência de licença da EGD." },
      { q: "Em quanto tempo um MVP fica pronto?", a: "Entre 4 e 8 semanas para um MVP em produção, com um time de PO, tech lead, dois a quatro desenvolvedores e QA. Funcionalidades seguintes entram em ciclos de duas semanas." },
    ],
  },
  {
    id: "auto",
    metaTitle: "Automação de processos: RPA, Power Automate, n8n e serverless",
    metaDescription: "Automação de processos com Power Automate, n8n, AWS Lambda e Azure Functions: aprovações, relatórios, integrações e RPA. Primeiros fluxos em 2 a 3 semanas.",
    definition: "A automação de processos da EGD elimina trabalho manual repetitivo com fluxos low-code (Power Automate, n8n), orquestração serverless e RPA quando o sistema não tem API, começando pelo mapeamento do processo real.",
    problems: ["Relatórios montados à mão toda semana a partir de várias fontes", "Aprovações que param em caixa de e-mail e ninguém sabe onde estão", "Redigitação de dados entre sistemas que não conversam"],
    faq: [
      { q: "Quais processos valem a pena automatizar primeiro?", a: "Os que consomem mais horas por mês e têm maior risco de erro: relatórios periódicos, aprovações com alçada, conciliações e redigitação entre sistemas. A EGD começa pelo inventário desses processos com horas e risco medidos." },
      { q: "Automação com Power Automate ou com n8n: qual escolher?", a: "Power Automate quando a empresa já vive no Microsoft 365 (SharePoint, Teams, aprovações). n8n quando precisa de orquestração própria, versionada e sem custo por execução. A EGD trabalha com os dois e escolhe pelo contexto." },
      { q: "Em quanto tempo os primeiros fluxos automatizados ficam prontos?", a: "Entre 2 e 3 semanas, com analista de processos, engenheiro de automação e desenvolvedor. Cada fluxo entra em produção com monitoramento e um responsável definido." },
    ],
    article: "automacao-de-relatorios-de-campo",
  },
  {
    id: "data",
    metaTitle: "Dados e painéis (BI): plataformas de dados e dashboards",
    metaDescription: "Plataformas de dados, modelagem semântica e dashboards executivos em Power BI, Fabric e Tableau sobre lakehouse e warehouse. Painel inicial em 3 a 5 semanas.",
    definition: "A frente de dados e painéis da EGD constrói plataformas de dados modernas e dashboards executivos com uma camada semântica única, para que indicadores de contrato, obra e operação saiam de uma fonte confiável.",
    problems: ["Cada área tem um número diferente para o mesmo indicador", "Painéis que dependem de uma pessoa atualizar planilha", "Dados de campo, financeiro e planejamento que nunca se encontram"],
    faq: [
      { q: "O que é uma camada semântica e por que ela importa?", a: "É a definição única de cada métrica (o que é 'avanço físico', 'saldo contratual', 'horas paradas') aplicada em todos os painéis. Sem ela, cada relatório calcula do seu jeito e a reunião vira discussão sobre qual número está certo." },
      { q: "Em quanto tempo o primeiro painel fica pronto?", a: "Entre 3 e 5 semanas, incluindo a ingestão das fontes, a modelagem e o painel em Power BI, Fabric ou Tableau. Os painéis seguintes reaproveitam a base." },
      { q: "Vale a pena um lakehouse para uma empresa média?", a: "Vale quando há várias fontes (ERP, campo, planilhas) e histórico a preservar. Para poucas fontes, um warehouse simples resolve. A EGD dimensiona pelo volume e pelo uso, não pela moda." },
    ],
  },
  {
    id: "ia",
    metaTitle: "Agentes de IA para empresas: copilotos, RAG e automação com LLM",
    metaDescription: "Agentes de IA integrados aos sistemas da empresa: busca sobre documentos próprios (RAG), copilotos, classificação e roteamento, com avaliação e guardrails. PoC em 2 a 4 semanas.",
    definition: "Os agentes de IA da EGD são copilotos e agentes autônomos integrados aos sistemas e documentos do cliente, com busca sobre dados próprios (RAG), ferramentas, avaliação de qualidade e guardrails, em nuvem ou em ambiente privado.",
    problems: ["Conhecimento da empresa espalhado em PDFs, e-mails e cabeças", "Triagem manual de chamados, documentos e e-mails", "Pilotos de IA que impressionam na demo e não chegam à produção"],
    faq: [
      { q: "O que é RAG e quando usar?", a: "RAG (retrieval-augmented generation) é a técnica em que o modelo responde com base em documentos da própria empresa, citando a fonte, em vez de inventar. Use quando a resposta precisa ser rastreável: normas, contratos, procedimentos, histórico de chamados." },
      { q: "Os dados da empresa saem para fora com os agentes de IA?", a: "Não precisam. A EGD implanta modelos em Bedrock, Azure OpenAI ou open-source (Llama, Mistral, Qwen) dentro da nuvem privada do cliente quando o dado é sensível, e registra cada chamada para auditoria." },
      { q: "Como saber se um agente de IA está respondendo bem?", a: "Com avaliação contínua: um conjunto de perguntas com resposta esperada, medido a cada mudança de prompt, modelo ou base. A EGD entrega esse pipeline junto com o agente, além de guardrails para o que ele não pode fazer." },
    ],
  },
  {
    id: "gov",
    metaTitle: "Governança de dados: catálogo, qualidade, linhagem e LGPD",
    metaDescription: "Governança de dados com catálogo, testes de qualidade automatizados, linhagem ponta a ponta, políticas de acesso e adequação à LGPD. Diagnóstico em 2 semanas.",
    definition: "A governança de dados da EGD organiza catálogo, qualidade, linhagem e políticas de acesso para que os dados da empresa sejam confiáveis, auditáveis e adequados à LGPD antes de escalar painéis e IA.",
    problems: ["Ninguém sabe de onde vem o número do relatório da diretoria", "Dados pessoais de clientes e colaboradores sem controle de acesso", "Pipelines que quebram em silêncio e ninguém percebe"],
    faq: [
      { q: "Por onde começar a governança de dados?", a: "Pelo diagnóstico de duas semanas: quais dados existem, quem é dono de cada um, onde estão os riscos de LGPD e quais pipelines alimentam decisões. Daí sai um plano curto, começando pelo que tem mais impacto." },
      { q: "O que a LGPD exige na prática dos dados da empresa?", a: "Saber quais dados pessoais existem e onde, ter base legal para cada uso, controlar acesso, mascarar quando possível e conseguir atender pedidos do titular (acesso, correção, exclusão) em prazo. A EGD automatiza o inventário e esses pedidos." },
      { q: "O que é linhagem de dados?", a: "É o rastro de cada dado da origem ao relatório: qual sistema gerou, por quais transformações passou e quem consome. Com OpenLineage e Marquez, a EGD torna isso visível para auditoria e análise de impacto." },
    ],
  },
  {
    id: "agile",
    metaTitle: "Consultoria em projetos ágeis: discovery, squads e métricas",
    metaDescription: "Consultoria em projetos ágeis: discovery de produto, coaching de squads, métricas DORA, OKRs e gestão de portfólio. Onboarding em 2 semanas.",
    definition: "A consultoria em projetos ágeis da EGD estrutura discovery, squads e cadência de entrega com métricas claras (DORA, OKRs, portfólio), para que a área de tecnologia entregue valor demonstrável a cada ciclo.",
    problems: ["Projetos de tecnologia que atrasam e ninguém consegue explicar por quê", "Backlog infinito sem critério de prioridade", "Comitês que decidem por opinião, sem dado de capacidade e entrega"],
    faq: [
      { q: "O que são métricas DORA?", a: "Quatro indicadores de entrega de software: frequência de deploy, tempo de mudança até produção, taxa de falha e tempo de recuperação. Mostram se o time entrega rápido e com segurança, e a EGD as instala nas primeiras semanas." },
      { q: "A consultoria ágil serve para empresas que não são de tecnologia?", a: "Sim. Consórcios e empresas de engenharia com projetos de sistemas, dados e automação ganham com cadência curta, prioridade por valor e visibilidade de capacidade. A EGD adapta os ritos ao contexto, sem teatro." },
      { q: "Como a EGD prioriza o backlog?", a: "Com WSJF ou RICE: valor, urgência e risco divididos pelo esforço, aplicados em sessão com quem decide. O resultado é uma ordem que a diretoria entende e que muda quando os dados mudam." },
    ],
  },
  {
    id: "consultoria",
    metaTitle: "Consultoria especializada em tecnologia e arquitetura",
    metaDescription: "Especialistas sêniores para diagnóstico técnico, arquitetura de soluções, seleção isenta de fornecedores, revisão de segurança e LGPD e mentoria. Diagnóstico em 1 a 2 semanas.",
    definition: "A consultoria especializada da EGD coloca um especialista sênior ao lado da sua decisão: diagnóstico do que trava a operação, arquitetura da solução, escolha isenta de tecnologia e fornecedores, revisão de segurança e acompanhamento até o sistema entrar em operação.",
    problems: ["Decisão de compra ou de arquitetura sem ninguém de confiança para avaliar", "Fornecedor entregando e ninguém da empresa consegue conferir", "Equipe interna que precisa de direção técnica, não de mais um sistema"],
    faq: [
      { q: "O que a consultoria especializada da EGD entrega?", a: "Um diagnóstico escrito em 1 a 2 semanas, com o que está travando, o que vale mudar e em que ordem, e depois o acompanhamento que a empresa quiser: arquitetura, seleção de fornecedor, revisão do que foi construído ou mentoria da equipe." },
      { q: "A EGD é isenta na escolha de tecnologia e fornecedores?", a: "Sim. A EGD não revende licença nem recebe comissão de fornecedor. A recomendação é por aderência ao contexto do cliente, com critérios escritos e, quando vale, uma prova de conceito antes da compra." },
      { q: "Consultoria especializada serve para quem já tem equipe de TI?", a: "Sim, é o caso mais comum. A equipe interna segue dona da operação; o especialista da EGD entra para decidir arquitetura, revisar segurança e LGPD, destravar um projeto parado ou capacitar o time em uma tecnologia nova." },
    ],
  },
  {
    id: "bpo",
    metaTitle: "BPO de suporte N1, N2 e N3: suporte técnico terceirizado com SLA",
    metaDescription: "Suporte técnico terceirizado em três níveis: N1 atendimento, N2 resolução técnica, N3 sustentação de sistemas, com SLA e indicadores. Operação em 2 a 4 semanas.",
    definition: "O BPO de suporte da EGD assume o atendimento técnico da empresa em três níveis: N1 recebe e resolve o básico, N2 resolve incidentes de sistemas, acessos e dados, e N3 corrige a causa raiz e evolui o sistema, tudo com SLA, base de conhecimento e indicadores mensais.",
    problems: ["Pedidos de suporte chegando por WhatsApp e e-mail sem fila, prazo ou histórico", "Desenvolvedores interrompidos o dia todo por chamados simples", "Sistema entregue por um fornecedor que sumiu e ninguém sustenta"],
    faq: [
      { q: "O que são suporte N1, N2 e N3?", a: "São os três níveis de atendimento técnico. N1 recebe o chamado, classifica e resolve o básico (acesso, dúvida, procedimento). N2 resolve incidentes que exigem conhecimento técnico do sistema. N3 é a engenharia: corrige a causa raiz no código ou na infraestrutura e evolui o sistema." },
      { q: "Como funciona o SLA no BPO de suporte da EGD?", a: "Cada prioridade tem prazo de primeira resposta e de solução, contados no horário acordado (comercial ou estendido). O painel mostra os chamados em risco, e o relatório mensal traz volume, tempos, reincidência e satisfação por sistema." },
      { q: "A EGD sustenta sistemas que não foram feitos por ela?", a: "Sim. O BPO começa por uma transição de 2 a 4 semanas em que a EGD documenta o sistema, monta a base de conhecimento e assume os chamados por nível. Vale para sistemas de fornecedores que saíram e para plataformas como Power Platform e SharePoint." },
    ],
  },
];

export const serviceDetail = (id: string) => SERVICE_DETAILS.find((s) => s.id === id);
export const serviceBase = (id: string) => SERVICES.find((s) => s.id === id);
