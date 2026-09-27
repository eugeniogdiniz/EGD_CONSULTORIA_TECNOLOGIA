/* SERVIÇOS page */

const SERVICES = [
  {
    id: "dev",
    num: "01",
    title: "Desenvolvimento de Sistemas",
    lead: "Aplicações web, mobile e plataformas internas sob medida — do MVP à arquitetura distribuída em cloud.",
    icon: "M4 6h16v12H4z M4 10h16 M8 6v-2 M16 6v-2",
    capabilities: [
      { t: "Web apps & SPAs",          d: "React, Next.js, Vue — TypeScript first, com testes e CI/CD." },
      { t: "Apps mobile multiplataforma", d: "React Native e PWAs com sincronização offline e push." },
      { t: "APIs & microsserviços",    d: "REST, GraphQL e gRPC sobre Node, Python ou .NET." },
      { t: "Containers & Kubernetes",  d: "Deploy em EKS, AKS ou GKE — com observabilidade e auto-scale." },
      { t: "Modernização de legado",   d: "Refatoração progressiva, strangler pattern e migração para cloud." },
      { t: "DevOps & SRE",             d: "Pipelines, IaC (Terraform, Bicep) e SLOs ativos." }
    ],
    stack: { aws: ["Lambda","ECS","EKS","API Gateway","RDS"], azure: ["Functions","AKS","App Service","Cosmos DB"], apache: ["Tomcat","Maven"], outros: ["TypeScript","Python",".NET","React","Node"] },
    delivery: "MVP em 4–8 semanas",
    squad: "PO, tech lead, 2–4 devs, QA"
  },
  {
    id: "auto",
    num: "02",
    title: "Automação de Processos",
    lead: "RPA, fluxos low-code e orquestração serverless que eliminam trabalho manual e reduzem erro humano em escala.",
    icon: "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1 M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
    capabilities: [
      { t: "Mapeamento de processos",        d: "Discovery com BPMN, identificação de gargalos e ROI esperado." },
      { t: "Automação serverless",           d: "AWS Lambda, Azure Functions e Step Functions para workflows event-driven." },
      { t: "Power Automate & SharePoint",    d: "Aprovações, alçadas e integrações sobre Microsoft 365." },
      { t: "n8n self-hosted",                d: "Orquestração open-source com 400+ conectores e versionamento." },
      { t: "RPA tradicional",                d: "Quando o processo depende de telas legadas sem API." },
      { t: "Integrações & webhooks",         d: "Barramento de eventos com Kafka, EventBridge ou Service Bus." }
    ],
    stack: { aws: ["Lambda","Step Functions","EventBridge","SQS","SNS"], azure: ["Functions","Logic Apps","Service Bus"], apache: ["Kafka","Camel","NiFi"], outros: ["Power Automate","n8n","Zapier"] },
    delivery: "Primeiros fluxos em 2–3 semanas",
    squad: "Analista, automation eng, dev"
  },
  {
    id: "data",
    num: "03",
    title: "Data Analytics & BI",
    lead: "Plataformas de dados modernas, modelagem semântica e dashboards executivos sobre lakehouse e warehouse.",
    icon: "M4 20V8 M10 20V4 M16 20v-9 M22 20H2",
    capabilities: [
      { t: "Lakehouse moderno",       d: "Apache Iceberg sobre S3/ADLS, com camadas raw/silver/gold." },
      { t: "ETL/ELT em escala",       d: "Apache Spark, Glue, Synapse Pipelines e dbt para modelagem." },
      { t: "Warehouses analíticos",   d: "Redshift, Synapse, Snowflake — projetados para custo e performance." },
      { t: "Dashboards executivos",   d: "Power BI Premium, Fabric e Tableau — com modelagem semântica robusta." },
      { t: "Streaming analytics",     d: "Apache Kafka + Flink/Spark Streaming para dados em tempo real." },
      { t: "Métricas & KPIs",         d: "Camada semântica única, métricas certificadas e self-service." }
    ],
    stack: { aws: ["S3","Glue","Redshift","Athena","EMR","QuickSight"], azure: ["ADLS","Synapse","Data Factory","Fabric"], apache: ["Spark","Iceberg","Kafka","Flink","Superset"], outros: ["dbt","Power BI","Tableau"] },
    delivery: "Dashboard inicial em 3–5 semanas",
    squad: "Eng. de dados, analytics eng, analista"
  },
  {
    id: "ia",
    num: "04",
    title: "Agentes de IA",
    lead: "Copilotos sob medida e agentes autônomos integrados aos seus sistemas — do RAG simples ao multi-agente orquestrado.",
    icon: "M9 12a3 3 0 1 1 6 0 3 3 0 1 1-6 0z M5 8V6a2 2 0 0 1 2-2h2 M19 8V6a2 2 0 0 0-2-2h-2 M5 16v2a2 2 0 0 0 2 2h2 M19 16v2a2 2 0 0 1-2 2h-2 M2 12h2 M20 12h2 M12 2v2 M12 20v2",
    capabilities: [
      { t: "RAG sobre dados próprios",  d: "Indexação semântica, re-ranking e citação de fontes." },
      { t: "Agentes com ferramentas",   d: "LangChain, LlamaIndex e MCP para integrar APIs e bancos." },
      { t: "Copilotos de produto",      d: "Assistentes contextuais embutidos em apps internos e externos." },
      { t: "Avaliação & guardrails",    d: "Eval pipelines, prompt firewall e telemetria de qualidade." },
      { t: "Modelos open-source",       d: "Llama, Mistral, Qwen — em VPC quando o dado é sensível." },
      { t: "Hub de conhecimento",       d: "Pipeline de ingestão contínua de docs, tickets e wikis." }
    ],
    stack: { aws: ["Bedrock","SageMaker","OpenSearch","Lambda"], azure: ["OpenAI","AI Search","ML Studio"], apache: ["Kafka","Airflow"], outros: ["LangChain","LlamaIndex","Pinecone","pgvector","Ollama"] },
    delivery: "PoC em 2–4 semanas",
    squad: "ML eng, data eng, dev full-stack"
  },
  {
    id: "gov",
    num: "05",
    title: "Governança de Dados",
    lead: "Catálogo, qualidade, linhagem e políticas de acesso. Dados confiáveis, auditáveis e prontos para escalar.",
    icon: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z M9 12l2 2 4-4",
    capabilities: [
      { t: "Catálogo & discovery",     d: "Glossário de negócio, ownership claro, busca semântica." },
      { t: "Qualidade automatizada",   d: "Testes em cada DAG com Great Expectations / Soda / dbt-tests." },
      { t: "Linhagem ponta-a-ponta",   d: "OpenLineage + Marquez para impacto e auditoria." },
      { t: "LGPD & privacidade",       d: "Mascaramento, minimização, data subject requests automatizados." },
      { t: "Acesso & RBAC",            d: "Lake Formation, Purview e políticas por tag." },
      { t: "FinOps de dados",          d: "Custo por workload, alertas e otimização contínua." }
    ],
    stack: { aws: ["Lake Formation","Glue Catalog","DataZone"], azure: ["Purview","Defender for Cloud"], apache: ["Atlas","Ranger","OpenLineage"], outros: ["dbt","Great Expectations","Soda","Collibra"] },
    delivery: "Diagnóstico em 2 semanas",
    squad: "Data architect, gov lead, eng. dados"
  },
  {
    id: "agile",
    num: "06",
    title: "Consultoria em Projetos Ágeis",
    lead: "Discovery, descoberta de produto e gestão de squads. Aceleramos sua entrega com cadência, foco em valor e métricas claras.",
    icon: "M3 12h4l2-6 4 12 2-6h4",
    capabilities: [
      { t: "Discovery dual-track",     d: "Pesquisa, prototipagem e validação contínuas em paralelo ao delivery." },
      { t: "Métricas DORA",            d: "Lead time, deploy frequency, MTTR e change failure rate." },
      { t: "Coaching de squads",       d: "Cerimônias, papéis e práticas técnicas (TDD, pair, trunk-based)." },
      { t: "OKRs & alinhamento",       d: "Cascata de OKRs com check-ins quinzenais e métricas de saúde." },
      { t: "Gestão de portfólio",      d: "WSJF, RICE e visibilidade contínua de capacidade vs. demanda." },
      { t: "Ritos executivos",         d: "Steering committees objetivos, decisão por dado, não por opinião." }
    ],
    stack: { aws: [], azure: ["DevOps","Boards"], apache: [], outros: ["Jira","Linear","Miro","Notion","ProductBoard"] },
    delivery: "Onboarding em 2 semanas",
    squad: "Agile coach, PM, tech lead"
  }
];

const PageHead = () => (
  <section className="page-head">
    <div className="grid-bg"></div>
    <div className="container">
      <div className="reveal in">
        <div className="crumbs">
          <a href="index.html">/</a><span className="sep">→</span><span>SERVIÇOS</span>
        </div>
        <h1 style={{ marginTop: 24 }}>
          Tecnologia ponta-a-ponta —<br />
          do <span className="italic-grad">código</span> à decisão.
        </h1>
        <p className="lead">Seis frentes especializadas que somam capacidade de delivery sobre as principais clouds (AWS, Azure) e o ecossistema open-source moderno (Apache, Power Platform, Python).</p>
      </div>

      <div className="reveal" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 32 }}>
        {SERVICES.map(s => (
          <a key={s.id} href={`#${s.id}`} className="tag accent" style={{ padding: "8px 14px" }}>
            <span style={{ color: "var(--fg-faint)" }}>{s.num}</span> {s.title.split(" ")[0]}
          </a>
        ))}
      </div>
    </div>
  </section>
);

const ServiceDeep = ({ s }) => (
  <article className="svc-deep" id={s.id}>
    <div className="svc-deep-head">
      <div className="svc-deep-num">SERVIÇO {s.num}/06</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="icon-tile lg accent"><Icon d={s.icon} size={26} /></div>
          <h2>{s.title}</h2>
        </div>
        <p className="lead">{s.lead}</p>
      </div>
    </div>
    <div className="svc-deep-body">
      <ul className="cap-list">
        {s.capabilities.map((c, i) => (
          <li key={i}>
            <span className="cn">{String(i+1).padStart(2,"0")}</span>
            <div>
              <div className="ct">{c.t}</div>
              <div className="cd">{c.d}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="svc-stack-card">
        <div className="h">Stack & delivery</div>
        {s.stack.aws.length > 0 && (
          <div className="row"><span className="k">AWS</span><span className="v">{s.stack.aws.join(" · ")}</span></div>
        )}
        {s.stack.azure.length > 0 && (
          <div className="row"><span className="k">Azure</span><span className="v">{s.stack.azure.join(" · ")}</span></div>
        )}
        {s.stack.apache.length > 0 && (
          <div className="row"><span className="k">Apache</span><span className="v">{s.stack.apache.join(" · ")}</span></div>
        )}
        {s.stack.outros.length > 0 && (
          <div className="row"><span className="k">Outros</span><span className="v">{s.stack.outros.join(" · ")}</span></div>
        )}
        <div className="row" style={{ marginTop: 14 }}><span className="k">delivery</span><span className="v accent">{s.delivery}</span></div>
        <div className="row"><span className="k">squad</span><span className="v">{s.squad}</span></div>
      </div>
    </div>
  </article>
);

const ServicesPage = () => {
  useReveal();
  return (
    <>
      <Navbar />
      <PageHead />
      <section className="section">
        <div className="container">
          {SERVICES.map(s => <ServiceDeep key={s.id} s={s} />)}
        </div>
      </section>

      <section className="cta-final">
        <div className="container">
          <div className="cta-card reveal">
            <span className="eyebrow">CONTATO</span>
            <h2 style={{ marginTop: 22 }}>Qual frente faz<br />sentido para o seu momento?</h2>
            <p style={{ marginTop: 22, fontSize: 17, maxWidth: 620 }}>
              Em 30 minutos podemos mapear gargalos e oportunidades. Sem compromisso.
            </p>
            <div className="cta-actions">
              <a href="contato.html" className="btn btn-primary">Agendar conversa <Arrow /></a>
              <a href="produtos.html" className="btn btn-ghost">Ver produtos prontos</a>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
};

ReactDOM.createRoot(document.getElementById("app")).render(<ServicesPage />);
