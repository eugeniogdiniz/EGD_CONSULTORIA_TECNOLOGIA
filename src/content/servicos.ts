export type Servico = {
  slug: string;
  titulo: string;
  resumo: string;
  lead: string;
  entregas: string[];
  stack: string;
  prazo: string;
};

export const SERVICOS: Servico[] = [
  {
    slug: "dev",
    titulo: "Desenvolvimento de sistemas",
    resumo:
      "Sistemas web e aplicativos sob medida: gestão documental, controle de processos, cadastros de campo. Do primeiro protótipo ao uso diário da equipe.",
    lead: "Sistemas web e aplicativos que substituem planilhas compartilhadas e formulários em papel.",
    entregas: [
      "Sistemas de gestão documental e de processos (SIGD, GED)",
      "Aplicativos de campo com uso sem sinal e sincronização",
      "Cadastros e fluxos de aprovação com alçadas",
      "Integração com ERP, SharePoint e e-mail",
      "Modernização de sistemas antigos por etapas",
    ],
    stack: "Power Apps, SharePoint, Supabase e Postgres, Next.js, Python, React Native",
    prazo: "Primeira versão em uso em 4 a 8 semanas",
  },
  {
    slug: "auto",
    titulo: "Automação de processos",
    resumo:
      "Relatórios, aprovações e integrações que hoje dependem de alguém copiar e colar. Power Automate, n8n e scripts em Python.",
    lead: "Relatórios e rotinas que hoje alguém monta à mão passam a rodar sozinhos, com registro do que foi feito.",
    entregas: [
      "Mapeamento do processo e cálculo da economia esperada",
      "Relatórios periódicos gerados e enviados automaticamente",
      "Aprovações e notificações sobre Microsoft 365",
      "Integrações entre sistemas por API e webhooks",
      "Automação de telas quando não existe API",
    ],
    stack: "Power Automate, n8n, Python, Azure Functions, AWS Lambda",
    prazo: "Primeiros fluxos em 2 a 3 semanas",
  },
  {
    slug: "dados",
    titulo: "Dados e painéis",
    resumo:
      "Modelagem, carga e painéis em Power BI que a diretoria abre toda semana. Todos os painéis leem da mesma base.",
    lead: "Uma base só para os números e painéis que a gestão consulta toda semana.",
    entregas: [
      "Modelagem de dados e camada semântica",
      "Cargas automáticas a partir de sistemas, planilhas e APIs",
      "Painéis em Power BI por contrato, obra ou região",
      "Indicadores com definição escrita e dono",
      "Mapas e séries históricas",
    ],
    stack: "Power BI, Postgres, Python, Azure Data Factory, SQL",
    prazo: "Primeiro painel em 3 a 5 semanas",
  },
  {
    slug: "ia",
    titulo: "Agentes de IA",
    resumo:
      "Assistentes que leem seus documentos e respondem com a fonte. Implantados dentro do seu ambiente, com registro de cada resposta.",
    lead: "Assistentes que consultam seus documentos e sistemas e respondem citando a fonte.",
    entregas: [
      "Busca e resposta sobre documentos internos (RAG)",
      "Assistentes dentro dos seus sistemas e do Teams",
      "Classificação e roteamento automático de solicitações",
      "Avaliação de qualidade e registro de cada interação",
      "Modelos hospedados no seu ambiente quando o dado exige",
    ],
    stack: "Azure OpenAI, AWS Bedrock, pgvector, Python",
    prazo: "Prova de conceito em 2 a 4 semanas",
  },
  {
    slug: "gov",
    titulo: "Governança de dados",
    resumo: "Quem acessa o quê, de onde veio cada número e como ele é validado. Inclui adequação à LGPD.",
    lead: "Regras claras sobre acesso, origem e qualidade de cada informação.",
    entregas: [
      "Catálogo de dados com dono e definição",
      "Testes de qualidade nas cargas",
      "Linhagem: de onde vem cada número do painel",
      "Adequação à LGPD: acesso, retenção e anonimização",
      "Controle de acesso por papel e por contrato",
    ],
    stack: "Microsoft Purview, dbt, Great Expectations, Postgres",
    prazo: "Diagnóstico em 2 semanas",
  },
  {
    slug: "gestao",
    titulo: "Gestão de projetos de tecnologia",
    resumo:
      "Levantamento, priorização e acompanhamento de entregas com o cliente na mesa. Cadência quinzenal, escopo escrito.",
    lead: "Levantamento, priorização e acompanhamento das entregas, com o cliente decidindo o que vem primeiro.",
    entregas: [
      "Levantamento de processos e dores com quem opera",
      "Backlog priorizado por economia e urgência",
      "Reuniões quinzenais de acompanhamento com registro",
      "Escopo e critérios de aceite por escrito",
      "Indicadores de entrega e de uso",
    ],
    stack: "Planner, Jira, Notion, planilha de CAPEX",
    prazo: "Início em 2 semanas",
  },
];
