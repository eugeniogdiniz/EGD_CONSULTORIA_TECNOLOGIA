/* Conteúdo da home original (portado de legacy/assets/index.jsx). */

export const SVC = [
  { id: "dev", title: "Desenvolvimento de Sistemas", desc: "Aplicações web, mobile e internas sob medida — do MVP à plataforma robusta.", tags: ["Web", "Mobile", "APIs", "Microsserviços"], icon: "M4 6h16v12H4z M4 10h16 M8 6v-2 M16 6v-2" },
  { id: "auto", title: "Automação de Processos", desc: "RPA e fluxos low-code que eliminam trabalho manual e reduzem erro humano.", tags: ["Power Automate", "n8n", "Webhooks", "Lambda"], icon: "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1 M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" },
  { id: "data", title: "Data Analytics & BI", desc: "Dashboards executivos, modelagem semântica e KPIs vivos sobre stack moderno.", tags: ["Power BI", "Spark", "Redshift", "Synapse"], icon: "M4 20V8 M10 20V4 M16 20v-9 M22 20H2" },
  { id: "ia", title: "Agentes de IA", desc: "Copilotos sob medida e agentes autônomos integrados aos seus sistemas.", tags: ["Bedrock", "Azure OpenAI", "RAG", "LLMs"], icon: "M9 12a3 3 0 1 1 6 0 3 3 0 1 1-6 0z M5 8V6a2 2 0 0 1 2-2h2 M19 8V6a2 2 0 0 0-2-2h-2 M5 16v2a2 2 0 0 0 2 2h2 M19 16v2a2 2 0 0 1-2 2h-2 M2 12h2 M20 12h2 M12 2v2 M12 20v2" },
  { id: "gov", title: "Governança de Dados", desc: "Catálogo, qualidade, linhagem e políticas de acesso confiáveis e auditáveis.", tags: ["Catálogo", "LGPD", "Iceberg", "Linhagem"], icon: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z M9 12l2 2 4-4" },
  { id: "agile", title: "Consultoria em Projetos Ágeis", desc: "Discovery, descoberta de produto e gestão de squads com cadência clara.", tags: ["Scrum", "Kanban", "OKRs", "Discovery"], icon: "M3 12h4l2-6 4 12 2-6h4" },
];

export const PRODUCTS = [
  { id: "contratos", title: "Gestão de Contratos", tag: "ENTERPRISE", desc: "Ciclo completo do contrato — criação, aprovação, vigência, aditivos e renovação." },
  { id: "rh", title: "Gestão de RH", tag: "PEOPLE OPS", desc: "Jornada, folha, férias, treinamentos e onboarding em plataforma unificada." },
  { id: "vistorias", title: "App de Vistorias e Fiscalização de Obras", tag: "FIELD", desc: "Inspeções em campo com checklists, fotos georreferenciadas e relatórios." },
  { id: "helpdesk", title: "Central de Chamados (Helpdesk)", tag: "OPERATIONS", desc: "Tickets com SLA, escalonamento, base de conhecimento e indicadores em tempo real." },
];

export const STACK_GROUPS = [
  { name: "AWS", color: "oklch(0.78 0.14 60)", items: [{ n: "S3", d: "Object storage" }, { n: "Lambda", d: "Serverless" }, { n: "Glue", d: "ETL" }, { n: "Redshift", d: "Warehouse" }, { n: "EKS", d: "Kubernetes" }, { n: "Bedrock", d: "GenAI" }] },
  { name: "Azure", color: "oklch(0.74 0.14 240)", items: [{ n: "Synapse", d: "Analytics" }, { n: "Functions", d: "Serverless" }, { n: "Data Factory", d: "Orquestração" }, { n: "AKS", d: "Kubernetes" }, { n: "OpenAI", d: "LLMs" }, { n: "Fabric", d: "Data plat." }] },
  { name: "Apache", color: "oklch(0.72 0.16 28)", items: [{ n: "Kafka", d: "Streaming" }, { n: "Spark", d: "Distributed" }, { n: "Airflow", d: "Orquestração" }, { n: "NiFi", d: "Data flow" }, { n: "Iceberg", d: "Table format" }, { n: "Flink", d: "Stream proc." }] },
  { name: "Power Platform & Outros", color: "var(--accent)", items: [{ n: "Power Apps", d: "Low-code" }, { n: "Power Automate", d: "RPA" }, { n: "Power BI", d: "BI" }, { n: "Python", d: "Backend" }, { n: "Supabase", d: "Backend" }, { n: "n8n", d: "Automation" }] },
];
