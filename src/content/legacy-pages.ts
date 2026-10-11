/* Conteúdo das páginas internas originais (portado de legacy/assets/*.jsx). */
import { SITE } from "./site";

export type Service = {
  id: string; num: string; title: string;
  /** Rótulo curto para os chips de /servicos quando a primeira palavra do título se repete. */
  short?: string;
  lead: string; icon: string;
  capabilities: { t: string; d: string }[];
  stack: { aws: string[]; azure: string[]; apache: string[]; outros: string[] };
  delivery: string; squad: string;
};

export const SERVICES: Service[] = [
  {
    id: "dev", num: "01", title: "Desenvolvimento de Sistemas",
    lead: "Aplicações web, mobile e plataformas internas sob medida — do MVP à arquitetura distribuída em cloud.",
    icon: "M4 6h16v12H4z M4 10h16 M8 6v-2 M16 6v-2",
    capabilities: [
      { t: "Web apps & SPAs", d: "React, Next.js, Vue — TypeScript first, com testes e CI/CD." },
      { t: "Apps mobile multiplataforma", d: "React Native e PWAs com sincronização offline e push." },
      { t: "APIs & microsserviços", d: "REST, GraphQL e gRPC sobre Node, Python ou .NET." },
      { t: "Containers & Kubernetes", d: "Deploy em EKS, AKS ou GKE — com observabilidade e auto-scale." },
      { t: "Modernização de legado", d: "Refatoração progressiva, strangler pattern e migração para cloud." },
      { t: "DevOps & SRE", d: "Pipelines, IaC (Terraform, Bicep) e SLOs ativos." },
    ],
    stack: { aws: ["Lambda", "ECS", "EKS", "API Gateway", "RDS"], azure: ["Functions", "AKS", "App Service", "Cosmos DB"], apache: ["Tomcat", "Maven"], outros: ["TypeScript", "Python", ".NET", "React", "Node"] },
    delivery: "MVP em 4–8 semanas", squad: "PO, tech lead, 2–4 devs, QA",
  },
  {
    id: "auto", num: "02", title: "Automação de Processos",
    lead: "RPA, fluxos low-code e orquestração serverless que eliminam trabalho manual e reduzem erro humano em escala.",
    icon: "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1 M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
    capabilities: [
      { t: "Mapeamento de processos", d: "Discovery com BPMN, identificação de gargalos e ROI esperado." },
      { t: "Automação serverless", d: "AWS Lambda, Azure Functions e Step Functions para workflows event-driven." },
      { t: "Power Automate & SharePoint", d: "Aprovações, alçadas e integrações sobre Microsoft 365." },
      { t: "n8n self-hosted", d: "Orquestração open-source com 400+ conectores e versionamento." },
      { t: "RPA tradicional", d: "Quando o processo depende de telas legadas sem API." },
      { t: "Integrações & webhooks", d: "Barramento de eventos com Kafka, EventBridge ou Service Bus." },
    ],
    stack: { aws: ["Lambda", "Step Functions", "EventBridge", "SQS", "SNS"], azure: ["Functions", "Logic Apps", "Service Bus"], apache: ["Kafka", "Camel", "NiFi"], outros: ["Power Automate", "n8n", "Zapier"] },
    delivery: "Primeiros fluxos em 2–3 semanas", squad: "Analista, automation eng, dev",
  },
  {
    id: "data", num: "03", title: "Data Analytics & BI",
    lead: "Plataformas de dados modernas, modelagem semântica e dashboards executivos sobre lakehouse e warehouse.",
    icon: "M4 20V8 M10 20V4 M16 20v-9 M22 20H2",
    capabilities: [
      { t: "Lakehouse moderno", d: "Apache Iceberg sobre S3/ADLS, com camadas raw/silver/gold." },
      { t: "ETL/ELT em escala", d: "Apache Spark, Glue, Synapse Pipelines e dbt para modelagem." },
      { t: "Warehouses analíticos", d: "Redshift, Synapse, Snowflake — projetados para custo e performance." },
      { t: "Dashboards executivos", d: "Power BI Premium, Fabric e Tableau — com modelagem semântica robusta." },
      { t: "Streaming analytics", d: "Apache Kafka + Flink/Spark Streaming para dados em tempo real." },
      { t: "Métricas & KPIs", d: "Camada semântica única, métricas certificadas e self-service." },
    ],
    stack: { aws: ["S3", "Glue", "Redshift", "Athena", "EMR", "QuickSight"], azure: ["ADLS", "Synapse", "Data Factory", "Fabric"], apache: ["Spark", "Iceberg", "Kafka", "Flink", "Superset"], outros: ["dbt", "Power BI", "Tableau"] },
    delivery: "Dashboard inicial em 3–5 semanas", squad: "Eng. de dados, analytics eng, analista",
  },
  {
    id: "ia", num: "04", title: "Agentes de IA",
    lead: "Copilotos sob medida e agentes autônomos integrados aos seus sistemas — do RAG simples ao multi-agente orquestrado.",
    icon: "M9 12a3 3 0 1 1 6 0 3 3 0 1 1-6 0z M5 8V6a2 2 0 0 1 2-2h2 M19 8V6a2 2 0 0 0-2-2h-2 M5 16v2a2 2 0 0 0 2 2h2 M19 16v2a2 2 0 0 1-2 2h-2 M2 12h2 M20 12h2 M12 2v2 M12 20v2",
    capabilities: [
      { t: "RAG sobre dados próprios", d: "Indexação semântica, re-ranking e citação de fontes." },
      { t: "Agentes com ferramentas", d: "LangChain, LlamaIndex e MCP para integrar APIs e bancos." },
      { t: "Copilotos de produto", d: "Assistentes contextuais embutidos em apps internos e externos." },
      { t: "Avaliação & guardrails", d: "Eval pipelines, prompt firewall e telemetria de qualidade." },
      { t: "Modelos open-source", d: "Llama, Mistral, Qwen — em VPC quando o dado é sensível." },
      { t: "Hub de conhecimento", d: "Pipeline de ingestão contínua de docs, tickets e wikis." },
    ],
    stack: { aws: ["Bedrock", "SageMaker", "OpenSearch", "Lambda"], azure: ["OpenAI", "AI Search", "ML Studio"], apache: ["Kafka", "Airflow"], outros: ["LangChain", "LlamaIndex", "Pinecone", "pgvector", "Ollama"] },
    delivery: "PoC em 2–4 semanas", squad: "ML eng, data eng, dev full-stack",
  },
  {
    id: "gov", num: "05", title: "Governança de Dados",
    lead: "Catálogo, qualidade, linhagem e políticas de acesso. Dados confiáveis, auditáveis e prontos para escalar.",
    icon: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z M9 12l2 2 4-4",
    capabilities: [
      { t: "Catálogo & discovery", d: "Glossário de negócio, ownership claro, busca semântica." },
      { t: "Qualidade automatizada", d: "Testes em cada DAG com Great Expectations / Soda / dbt-tests." },
      { t: "Linhagem ponta-a-ponta", d: "OpenLineage + Marquez para impacto e auditoria." },
      { t: "LGPD & privacidade", d: "Mascaramento, minimização, data subject requests automatizados." },
      { t: "Acesso & RBAC", d: "Lake Formation, Purview e políticas por tag." },
      { t: "FinOps de dados", d: "Custo por workload, alertas e otimização contínua." },
    ],
    stack: { aws: ["Lake Formation", "Glue Catalog", "DataZone"], azure: ["Purview", "Defender for Cloud"], apache: ["Atlas", "Ranger", "OpenLineage"], outros: ["dbt", "Great Expectations", "Soda", "Collibra"] },
    delivery: "Diagnóstico em 2 semanas", squad: "Data architect, gov lead, eng. dados",
  },
  {
    id: "agile", num: "06", title: "Consultoria em Projetos Ágeis", short: "Projetos Ágeis",
    lead: "Discovery, descoberta de produto e gestão de squads. Aceleramos sua entrega com cadência, foco em valor e métricas claras.",
    icon: "M3 12h4l2-6 4 12 2-6h4",
    capabilities: [
      { t: "Discovery dual-track", d: "Pesquisa, prototipagem e validação contínuas em paralelo ao delivery." },
      { t: "Métricas DORA", d: "Lead time, deploy frequency, MTTR e change failure rate." },
      { t: "Coaching de squads", d: "Cerimônias, papéis e práticas técnicas (TDD, pair, trunk-based)." },
      { t: "OKRs & alinhamento", d: "Cascata de OKRs com check-ins quinzenais e métricas de saúde." },
      { t: "Gestão de portfólio", d: "WSJF, RICE e visibilidade contínua de capacidade vs. demanda." },
      { t: "Ritos executivos", d: "Steering committees objetivos, decisão por dado, não por opinião." },
    ],
    stack: { aws: [], azure: ["DevOps", "Boards"], apache: [], outros: ["Jira", "Linear", "Miro", "Notion", "ProductBoard"] },
    delivery: "Onboarding em 2 semanas", squad: "Agile coach, PM, tech lead",
  },
  {
    id: "consultoria", num: "07", title: "Consultoria Especializada", short: "Consultoria",
    lead: "Diagnóstico, arquitetura e acompanhamento técnico por especialistas sêniores — para quando a sua equipe precisa de decisão, não de mais mãos.",
    icon: "M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1.1 2.1h4.8c.1-.9.5-1.6 1.1-2.1A6 6 0 0 0 12 3z",
    capabilities: [
      { t: "Diagnóstico técnico e de processos", d: "Duas semanas para dizer o que está travando, o que vale mudar e em que ordem." },
      { t: "Arquitetura de soluções", d: "Desenho de sistemas, dados, integrações e nuvem antes de contratar ou construir." },
      { t: "Seleção de tecnologia e fornecedores", d: "Critérios, prova de conceito e comparação isenta: a EGD não revende licença." },
      { t: "Revisão de código, segurança e LGPD", d: "Auditoria do que já existe, com plano de correção priorizado por risco." },
      { t: "Acompanhamento de implantação", d: "Especialista ao lado do time ou do fornecedor até o sistema entrar em operação." },
      { t: "Mentoria técnica", d: "Capacitação da equipe interna para sustentar a solução sem depender da EGD." },
    ],
    stack: { aws: ["Well-Architected"], azure: ["Cloud Adoption Framework"], apache: [], outros: ["Arquitetura", "Segurança", "LGPD", "Dados", "Integrações"] },
    delivery: "Diagnóstico em 1–2 semanas", squad: "Consultor sênior, arquiteto",
  },
  {
    id: "bpo", num: "08", title: "BPO de Suporte N1, N2 e N3", short: "BPO de Suporte",
    lead: "Operação de suporte terceirizada em três níveis — atendimento ao usuário, resolução técnica e sustentação de sistemas — com SLA, indicadores e base de conhecimento.",
    icon: "M4 14v-2a8 8 0 0 1 16 0v2 M4 13h3v6H4z M17 13h3v6h-3z M12 22h3a3 3 0 0 0 3-3",
    capabilities: [
      { t: "N1: atendimento e triagem", d: "Recebe por e-mail, WhatsApp, Teams ou portal, classifica, resolve o básico e registra tudo no chamado." },
      { t: "N2: resolução técnica", d: "Analistas que resolvem incidentes de sistemas, acessos, integrações e dados, com procedimento documentado." },
      { t: "N3: sustentação e evolução", d: "Engenheiros que corrigem a causa raiz, ajustam o código e evoluem o sistema em ciclos curtos." },
      { t: "SLA e horário acordados", d: "Prazos de primeira resposta e de solução por prioridade, em horário comercial ou estendido." },
      { t: "Base de conhecimento viva", d: "Cada solução vira procedimento; o N1 resolve mais e o N3 recebe menos." },
      { t: "Indicadores mensais", d: "Volume, tempo de resposta e de solução, reincidência e satisfação, por sistema e por área." },
    ],
    stack: { aws: [], azure: ["OpenAI"], apache: [], outros: ["Central de Chamados EGD", "Teams", "WhatsApp", "Power BI"] },
    delivery: "Operação em 2–4 semanas", squad: "Coordenador, analistas N1 e N2, engenheiro N3",
  },
];

export type ProductVisual = "contratos" | "rh" | "vistorias" | "helpdesk";

export const PRODUCTS_FULL: { id: string; num: string; title: string; tag: string; lead: string; features: string[]; deploy: string; scope: string; stack: string[]; visual: ProductVisual }[] = [
  { id: "contratos", num: "01", title: "Gestão de Contratos", tag: "ENTERPRISE", lead: "Ciclo completo do contrato: criação, aprovação, vigência, aditivos e renovação — com alertas, dashboards e trilha de auditoria.", features: ["Workflow de aprovação multi-nível com alçadas", "Alertas automáticos de vencimento e reajuste (90/60/30 dias)", "Repositório central com versionamento e assinatura digital", "Dashboard de obrigações, SLAs e indicadores financeiros", "Integração com ERP (TOTVS, SAP) e Active Directory"], deploy: "2 a 4 semanas", scope: "Jurídico, Suprimentos, Financeiro", stack: ["SharePoint", "Power Apps", "Power Automate", "Power BI", "Azure AD"], visual: "contratos" },
  { id: "rh", num: "02", title: "Gestão de RH", tag: "PEOPLE OPS", lead: "Controle de jornada, folha, férias, treinamentos e onboarding em uma plataforma unificada — integrada ao ecossistema corporativo.", features: ["Banco de horas e ponto eletrônico com geolocalização", "Gestão de férias, abonos e benefícios em fluxo único", "Trilhas de onboarding e capacitação com certificados", "Indicadores de turnover, clima e headcount em tempo real", "Integração com folha (ADP, Senior, TOTVS RM)"], deploy: "3 a 5 semanas", scope: "RH, DP, Liderança", stack: ["Power Apps", "Power Automate", "MySQL", "Azure Functions", "Power BI"], visual: "rh" },
  { id: "vistorias", num: "03", title: "App de Vistorias e Fiscalização de Obras", tag: "FIELD", lead: "Aplicativo mobile para inspeções em campo com checklists, fotos georreferenciadas, assinatura digital e relatórios automáticos.", features: ["Checklists configuráveis por tipo de obra ou ativo", "Captura de mídia com geolocalização e timestamp", "Operação 100% offline com sincronização automática", "Relatórios PDF gerados e enviados automaticamente", "Painel web para gestores com mapa de não-conformidades"], deploy: "4 a 6 semanas", scope: "Engenharia, Manutenção, Segurança", stack: ["Power Apps", "Supabase", "Azure Storage", "Power BI", "React Native"], visual: "vistorias" },
  { id: "helpdesk", num: "04", title: "Central de Chamados (Helpdesk)", tag: "OPERATIONS", lead: "Sistema de tickets com SLA, fluxos de escalonamento, base de conhecimento com IA e indicadores em tempo real para times de suporte.", features: ["Multi-canal: e-mail, web, Teams, WhatsApp e Slack", "SLA por categoria, prioridade e horário comercial", "Base de conhecimento com busca semântica (RAG + LLM)", "Painel de operação ao vivo com alertas de SLA", "Auto-classificação e roteamento por agente de IA"], deploy: "2 a 3 semanas", scope: "TI, Facilities, Suporte interno e externo", stack: ["SharePoint", "Power Automate", "n8n", "Azure OpenAI", "Power BI"], visual: "helpdesk" },
];

export const PRINCIPLES = [
  { t: "Engenharia, não promessa", d: "Toda solução vai a produção com testes, observabilidade e runbook — não slides." },
  { t: "Stack agnóstico", d: "AWS, Azure, Apache, Power Platform — escolhemos pela aderência ao seu contexto." },
  { t: "Propriedade do cliente", d: "Código, modelos e dados ficam com você. Sem lock-in proprietário escondido." },
  { t: "Time pequeno, sênior", d: "Squads enxutos com tech leads experientes. Nenhum elo fraco no delivery." },
  { t: "Ciclo curto", d: "Entregas em semanas, não trimestres. Valor demonstrável a cada sprint." },
  { t: "Métrica acima de opinião", d: "Decisões guiadas por DORA, SLOs e indicadores de produto — não preferências." },
];

export const TIMELINE = [
  { y: "ORIGEM", t: "Fundação em São Paulo", d: `Fundada em ${SITE.foundingYear}, dentro de contratos de engenharia e habitação: as primeiras entregas foram automações de planilhas, documentos e relatórios com Microsoft 365 e BI.` },
  { y: "CAMPO", t: "Vistorias e fiscalização no celular", d: "O app de vistorias leva o checklist para o canteiro, com foto, assinatura e PDF automático, e funciona sem sinal." },
  { y: "CONTRATOS", t: "Documentos e medições em sistema", d: "Lista mestra de documentos, boletim de medição e gestão de contratos passam a rodar com histórico auditável, inclusive entre consorciadas." },
  { y: "DADOS", t: "Painéis e governança", d: "Camada semântica única para que campo, consorciadas, contratante e diretoria leiam o mesmo número." },
  { y: "HOJE", t: "IA e operação assistida", d: "Agentes de IA sobre a base do cliente, suporte N1 a N3 e consultoria especializada completam as oito frentes de serviço." },
];
/** Públicos e setores da página Sobre; os quatro primeiros têm página própria. */
export const SECTORS: { n: string; d: string; href?: string }[] = [
  { n: "Consórcios de engenharia", d: "Documentos, vistorias, medições e prestação de contas entre consorciadas", href: "/consorcios" },
  { n: "Construtoras", d: "RDO, medição, vistorias de qualidade e painel de obra", href: "/para/construtoras" },
  { n: "Incorporadoras", d: "Vistoria de entrega, assistência técnica pós-obra e habitação", href: "/para/incorporadoras" },
  { n: "Empresas de engenharia", d: "Gerenciadoras, fiscalizadoras e projetistas", href: "/para/empresas-de-engenharia" },
  { n: "Energia", d: "Geração, transmissão e manutenção de ativos" },
  { n: "Infraestrutura", d: "Rodovias, saneamento e obras públicas" },
];
