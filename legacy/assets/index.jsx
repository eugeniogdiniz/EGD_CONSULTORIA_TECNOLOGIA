/* HOME — index.jsx (useState/useEffect/useRef from shared.jsx) */

/* ---------- Animated terminal ---------- */
const TERM_LINES = [
  { type: "prompt", txt: "egd@stack:~$ ", input: "deploy --env=prod --pipeline=customer-360" },
  { type: "out", txt: "→ Validating manifests ............ ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Building containers (3/3) ....... ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Pushing to ECR + ACR ............ ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Apache Airflow DAG sync ......... ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Kafka topics provisioned ........ ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Power BI dataset refresh ........ ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Smoke tests (42 passed) ......... ", tail: "OK", tailCls: "ok" },
  { type: "spacer" },
  { type: "out", txt: "✓ pipeline ", em: "customer-360", emCls: "key", txt2: " live em ", em2: "1m 47s", em2Cls: "num" },
  { type: "out", txt: "  ↳ throughput: ", em: "12.4k events/s", emCls: "num", txt2: " · latência p99: ", em2: "84ms", em2Cls: "num" },
  { type: "spacer" },
  { type: "prompt", txt: "egd@stack:~$ ", input: "_", isCursor: true }
];

const Terminal = () => {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState("");

  useEffect(() => {
    if (shown >= TERM_LINES.length) return;
    const line = TERM_LINES[shown];
    if (line.type === "prompt" && line.input && !line.isCursor) {
      let i = 0;
      const t = setInterval(() => {
        i++;
        setTyping(line.input.slice(0, i));
        if (i >= line.input.length) {
          clearInterval(t);
          setTimeout(() => { setShown(s => s + 1); setTyping(""); }, 360);
        }
      }, 28);
      return () => clearInterval(t);
    } else {
      const delay = line.type === "spacer" ? 80 : 180;
      const t = setTimeout(() => setShown(s => s + 1), delay);
      return () => clearTimeout(t);
    }
  }, [shown]);

  // restart loop
  useEffect(() => {
    if (shown >= TERM_LINES.length) {
      const t = setTimeout(() => setShown(0), 6000);
      return () => clearTimeout(t);
    }
  }, [shown]);

  return (
    <div className="terminal">
      <div className="term-head">
        <div className="term-dots"><i></i><i></i><i></i></div>
        <div className="term-title">~ /egd/ops/deploy.log</div>
        <div className="term-meta">zsh · 132×24</div>
      </div>
      <div className="term-body" style={{ minHeight: 420 }}>
        {TERM_LINES.slice(0, shown).map((l, i) => {
          if (l.type === "spacer") return <div key={i} style={{ height: 8 }}></div>;
          if (l.type === "prompt") {
            return (
              <div className="ln" key={i}>
                <span className="lno">{String(i + 1).padStart(2, "0")}</span>
                <div><span className="prompt">{l.txt}</span><span>{l.input}</span></div>
              </div>
            );
          }
          return (
            <div className="ln" key={i}>
              <span className="lno">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <span className="out">{l.txt}</span>
                {l.em && <span className={l.emCls}>{l.em}</span>}
                {l.txt2 && <span className="out">{l.txt2}</span>}
                {l.em2 && <span className={l.em2Cls}>{l.em2}</span>}
                {l.tail && <span className={l.tailCls}>[ {l.tail} ]</span>}
              </div>
            </div>
          );
        })}
        {shown < TERM_LINES.length && TERM_LINES[shown]?.input && !TERM_LINES[shown]?.isCursor && (
          <div className="ln">
            <span className="lno">{String(shown + 1).padStart(2, "0")}</span>
            <div><span className="prompt">{TERM_LINES[shown].txt}</span><span className="cur">{typing}</span></div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Hero ---------- */
const Hero = () => (
  <section className="hero" id="top">
    <div className="hero-bg"></div>
    <div className="hero-grid"></div>
    <div className="container hero-inner">
      <div className="hero-grid-2col">
        <div>
          <div className="hero-status reveal in">
            <span className="status"><span className="dot"></span>Operando · 99.97%</span>
            <span className="eyebrow no-dot"><span style={{color:"var(--fg-faint)"}}>v4.2</span> <span className="slash">/</span> SP · BR</span>
          </div>

          <h1 className="reveal in" style={{ marginTop: 28 }}>
            Engenharia de <span className="italic-grad">dados</span>,<br />
            sistemas e automação<br />
            que <span className="italic-grad">escalam</span>.
          </h1>

          <p className="hero-sub reveal in">
            Construímos plataformas, pipelines e produtos digitais sobre AWS, Azure e o stack Apache. Da arquitetura à entrega — com squads ágeis, governança e observabilidade desde o primeiro commit.
          </p>

          <div className="hero-cta reveal in">
            <a href="contato.html" className="btn btn-primary">Iniciar um projeto <Arrow /></a>
            <a href="servicos.html" className="btn btn-ghost">Ver capacidades</a>
          </div>

          <div className="hero-tickers reveal">
            <Ticker />
          </div>
        </div>

        <div className="hero-right reveal in">
          <Terminal />
          <div className="diag-mini">
            <DiagMini />
          </div>
        </div>
      </div>

      <div className="hero-meta reveal">
        <div className="meta-item">
          <div className="num">+120<small>%</small></div>
          <div className="lbl">RETORNO MÉDIO EM AUTOMAÇÕES</div>
        </div>
        <div className="meta-item">
          <div className="num">8<small>+</small></div>
          <div className="lbl">ANOS DE CONSULTORIA</div>
        </div>
        <div className="meta-item">
          <div className="num">40<small>+</small></div>
          <div className="lbl">PROJETOS ENTREGUES</div>
        </div>
        <div className="meta-item">
          <div className="num">99,9<small>%</small></div>
          <div className="lbl">SLA MÉDIO DAS SOLUÇÕES</div>
        </div>
      </div>
    </div>
  </section>
);

/* ---------- Live ticker ---------- */
const Ticker = () => {
  const [t, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT(x => x + 1), 1200);
    return () => clearInterval(i);
  }, []);
  const events = (12400 + (t * 137) % 2400).toLocaleString("pt-BR");
  const lat    = (78 + (t * 11) % 18);
  const dags   = 14;
  const ok     = (99.94 + ((t * 7) % 6) / 100).toFixed(2);
  return (
    <div className="ticker">
      <div className="tick"><span className="k">events/s</span><span className="v">{events}</span></div>
      <div className="tick"><span className="k">p99 lat</span><span className="v">{lat}<i>ms</i></span></div>
      <div className="tick"><span className="k">DAGs vivas</span><span className="v">{dags}</span></div>
      <div className="tick"><span className="k">SLA 30d</span><span className="v">{ok}<i>%</i></span></div>
    </div>
  );
};

/* ---------- Mini diagram (hero) ---------- */
const DiagMini = () => (
  <svg viewBox="0 0 520 120" width="100%" height="120" style={{ display: "block" }}>
    <defs>
      <linearGradient id="line-grad" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%"  stopColor="rgba(255,255,255,0.05)" />
        <stop offset="50%" stopColor="var(--accent)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
      </linearGradient>
    </defs>
    {/* lines */}
    {[ [60,60,200,60], [200,60,300,60], [300,60,420,60], [420,60,500,60] ].map(([x1,y1,x2,y2],i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 4" />
    ))}
    {[ [60,60,200,60], [200,60,300,60], [300,60,420,60], [420,60,500,60] ].map(([x1,y1,x2,y2],i) => (
      <circle key={"d"+i} r="3" fill="var(--accent)">
        <animateMotion dur={`${2.4 + i*0.3}s`} repeatCount="indefinite" path={`M ${x1} ${y1} L ${x2} ${y2}`} begin={`${i*0.4}s`} />
      </circle>
    ))}
    {/* nodes */}
    {[
      { x: 60,  label: "INGEST", sub: "Kafka" },
      { x: 200, label: "LAKE",   sub: "S3 / ADLS" },
      { x: 300, label: "TRANSF", sub: "Spark" },
      { x: 420, label: "BI",     sub: "Power BI" },
      { x: 500, label: "AGENT",  sub: "LLM" }
    ].map((n, i) => (
      <g key={i} transform={`translate(${n.x} 60)`}>
        <circle r="22" fill="#0f1219" stroke="var(--line-2)" />
        <circle r="22" fill="none" stroke="var(--accent)" strokeOpacity="0.4">
          <animate attributeName="r" values="22;28;22" dur="3s" begin={`${i*0.5}s`} repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="3s" begin={`${i*0.5}s`} repeatCount="indefinite" />
        </circle>
        <text x="0" y="-28" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="var(--fg-mute)" letterSpacing="0.1em">{n.label}</text>
        <text x="0" y="42" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fill="var(--fg-dim)">{n.sub}</text>
      </g>
    ))}
  </svg>
);

/* ---------- Services Preview ---------- */
const SVC = [
  { id:"dev",   title: "Desenvolvimento de Sistemas", desc: "Aplicações web, mobile e internas sob medida — do MVP à plataforma robusta.", tags:["Web","Mobile","APIs","Microsserviços"], icon:"M4 6h16v12H4z M4 10h16 M8 6v-2 M16 6v-2"},
  { id:"auto",  title: "Automação de Processos",      desc: "RPA e fluxos low-code que eliminam trabalho manual e reduzem erro humano.",       tags:["Power Automate","n8n","Webhooks","Lambda"], icon:"M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1 M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"},
  { id:"data",  title: "Data Analytics & BI",         desc: "Dashboards executivos, modelagem semântica e KPIs vivos sobre stack moderno.",     tags:["Power BI","Spark","Redshift","Synapse"], icon:"M4 20V8 M10 20V4 M16 20v-9 M22 20H2"},
  { id:"ia",    title: "Agentes de IA",               desc: "Copilotos sob medida e agentes autônomos integrados aos seus sistemas.",            tags:["Bedrock","Azure OpenAI","RAG","LLMs"], icon:"M9 12a3 3 0 1 1 6 0 3 3 0 1 1-6 0z M5 8V6a2 2 0 0 1 2-2h2 M19 8V6a2 2 0 0 0-2-2h-2 M5 16v2a2 2 0 0 0 2 2h2 M19 16v2a2 2 0 0 1-2 2h-2 M2 12h2 M20 12h2 M12 2v2 M12 20v2"},
  { id:"gov",   title: "Governança de Dados",         desc: "Catálogo, qualidade, linhagem e políticas de acesso confiáveis e auditáveis.",      tags:["Catálogo","LGPD","Iceberg","Linhagem"], icon:"M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z M9 12l2 2 4-4"},
  { id:"agile", title: "Consultoria em Projetos Ágeis", desc: "Discovery, descoberta de produto e gestão de squads com cadência clara.",        tags:["Scrum","Kanban","OKRs","Discovery"], icon:"M3 12h4l2-6 4 12 2-6h4"}
];

const ServicesPreview = () => (
  <section className="section" id="servicos-preview">
    <div className="container">
      <div className="section-head row reveal">
        <div>
          <span className="eyebrow">SERVIÇOS · 06 FRENTES</span>
          <h2>Capacidades que cobrem<br />o ciclo completo de tecnologia.</h2>
          <p className="lead">Atuamos do código à arquitetura de decisão. Cada frente entrega valor isolada — ou soma capacidade quando combinada num programa de transformação.</p>
        </div>
        <a href="servicos.html" className="btn btn-ghost">Ver tudo <Arrow /></a>
      </div>

      <div className="grid-services reveal">
        {SVC.map((s, i) => (
          <a className="svc" key={s.id} href={`servicos.html#${s.id}`}>
            <div className="svc-num">{String(i + 1).padStart(2, "0")} / 06</div>
            <div className="icon-tile"><Icon d={s.icon} /></div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
            <div className="svc-tags">
              {s.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
            </div>
            <div className="svc-cta">explorar <Arrow size={12}/></div>
          </a>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- Architecture diagram (full) ---------- */
const Architecture = () => (
  <section className="section" style={{ borderTop: "1px solid var(--line)", background: "var(--bg-2)" }}>
    <div className="container">
      <div className="section-head reveal">
        <span className="eyebrow">ARQUITETURA / FLUXO DE REFERÊNCIA</span>
        <h2>Da fonte ao agente,<br />em uma plataforma observável.</h2>
        <p className="lead">Pipeline padrão que aplicamos em projetos de dados — adaptado ao stack do cliente (AWS, Azure, ou híbrido) e à maturidade do time.</p>
      </div>

      <div className="arch-card reveal">
        <ArchDiagram />
        <div className="arch-legend">
          <div><span className="status"><span className="dot"></span>Stream</span> Apache Kafka, Kinesis, Event Hubs</div>
          <div><span className="status"><span className="dot"></span>Batch</span> Airflow, ADF, AWS Glue</div>
          <div><span className="status warn"><span className="dot"></span>ML/IA</span> Bedrock, Azure OpenAI, modelos próprios</div>
        </div>
      </div>
    </div>
  </section>
);

const ArchDiagram = () => {
  const cols = [
    { x: 80,   label: "FONTES", items: [{n:"ERPs",y:60},{n:"CRMs",y:120},{n:"APIs",y:180},{n:"IoT",y:240}] },
    { x: 280,  label: "INGESTÃO", items: [{n:"Kafka",y:90,t:"stream"},{n:"Airflow",y:170,t:"batch"},{n:"Lambda",y:240,t:"event"}] },
    { x: 470,  label: "STORAGE", items: [{n:"S3 · ADLS",y:90,t:"raw"},{n:"Iceberg",y:160,t:"lake"},{n:"Redshift · Synapse",y:240,t:"warehouse"}] },
    { x: 700,  label: "PROCESSAMENTO", items: [{n:"Apache Spark",y:90,t:"transform"},{n:"dbt",y:160,t:"models"},{n:"Glue · ADF",y:240,t:"orchestrate"}] },
    { x: 920,  label: "CONSUMO", items: [{n:"Power BI",y:90,t:"BI"},{n:"Agentes IA",y:160,t:"copilot"},{n:"APIs · Apps",y:240,t:"product"}] }
  ];
  const links = [];
  cols.slice(0, -1).forEach((col, ci) => {
    const next = cols[ci + 1];
    col.items.forEach(a => next.items.forEach(b => {
      links.push({ x1: col.x + 80, y1: a.y + 14, x2: next.x, y2: b.y + 14 });
    }));
  });

  return (
    <svg viewBox="0 0 1080 320" width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="arch-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
        </linearGradient>
      </defs>
      {/* connection lines */}
      {links.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="url(#arch-line)" strokeWidth="1" />
      ))}
      {/* animated pulses on key paths */}
      {[ {p:"M 360 104 L 470 104"}, {p:"M 550 104 L 700 104"}, {p:"M 780 104 L 920 104"},
         {p:"M 360 184 L 470 174"}, {p:"M 550 174 L 700 174"}, {p:"M 780 174 L 920 174"} ].map((pp, i) => (
        <circle key={"p"+i} r="2.5" fill="var(--accent)">
          <animateMotion dur="3s" begin={`${i*0.4}s`} repeatCount="indefinite" path={pp.p} />
        </circle>
      ))}
      {/* column labels */}
      {cols.map(c => (
        <text key={c.label} x={c.x + 40} y={28} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" letterSpacing="0.16em" fill="var(--fg-mute)">{c.label}</text>
      ))}
      {/* nodes */}
      {cols.map(col => col.items.map((n, j) => (
        <g key={col.label + j} transform={`translate(${col.x} ${n.y})`}>
          <rect width="80" height="28" rx="6" fill="#0f1219" stroke="var(--line-2)" />
          <text x="40" y="18" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fill="var(--fg)">{n.n}</text>
          {n.t && <text x="40" y="42" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill="var(--fg-faint)">{n.t}</text>}
        </g>
      )))}
    </svg>
  );
};

/* ---------- Products preview ---------- */
const PRODUCTS = [
  { id:"contratos", title:"Gestão de Contratos", tag:"ENTERPRISE", desc:"Ciclo completo do contrato — criação, aprovação, vigência, aditivos e renovação." },
  { id:"rh",        title:"Gestão de RH",        tag:"PEOPLE OPS", desc:"Jornada, folha, férias, treinamentos e onboarding em plataforma unificada." },
  { id:"vistorias", title:"App de Vistorias e Fiscalização de Obras", tag:"FIELD", desc:"Inspeções em campo com checklists, fotos georreferenciadas e relatórios." },
  { id:"helpdesk",  title:"Central de Chamados (Helpdesk)", tag:"OPERATIONS", desc:"Tickets com SLA, escalonamento, base de conhecimento e indicadores em tempo real." }
];

const ProductsPreview = () => (
  <section className="section" id="produtos-preview">
    <div className="container">
      <div className="section-head row reveal">
        <div>
          <span className="eyebrow">PRODUTOS / VERTICAIS PRONTOS</span>
          <h2>Soluções verticais prontas<br />para implantação acelerada.</h2>
          <p className="lead">Aceleradores construídos sobre Power Platform, AWS e open-source moderno. Implantação em semanas, customização sob medida, dados sempre seus.</p>
        </div>
        <a href="produtos.html" className="btn btn-ghost">Catálogo completo <Arrow /></a>
      </div>
      <div className="prod-preview-grid reveal">
        {PRODUCTS.map((p, i) => (
          <a key={p.id} href={`produtos.html#${p.id}`} className="prod-preview">
            <div className="pp-head">
              <span className="pp-num">P/{String(i+1).padStart(2,"0")}</span>
              <span className="tag tag-sm">{p.tag}</span>
            </div>
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
            <div className="pp-foot">ver detalhes <Arrow size={12}/></div>
          </a>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- Stack ---------- */
const STACK_GROUPS = [
  {
    name: "AWS",
    color: "oklch(0.78 0.14 60)",
    items: [
      { n: "S3",       d: "Object storage" },
      { n: "Lambda",   d: "Serverless"     },
      { n: "Glue",     d: "ETL"            },
      { n: "Redshift", d: "Warehouse"      },
      { n: "EKS",      d: "Kubernetes"     },
      { n: "Bedrock",  d: "GenAI"          }
    ]
  },
  {
    name: "Azure",
    color: "oklch(0.74 0.14 240)",
    items: [
      { n: "Synapse",      d: "Analytics" },
      { n: "Functions",    d: "Serverless" },
      { n: "Data Factory", d: "Orquestração" },
      { n: "AKS",          d: "Kubernetes" },
      { n: "OpenAI",       d: "LLMs" },
      { n: "Fabric",       d: "Data plat." }
    ]
  },
  {
    name: "Apache",
    color: "oklch(0.72 0.16 28)",
    items: [
      { n: "Kafka",   d: "Streaming"    },
      { n: "Spark",   d: "Distributed"  },
      { n: "Airflow", d: "Orquestração" },
      { n: "NiFi",    d: "Data flow"    },
      { n: "Iceberg", d: "Table format" },
      { n: "Flink",   d: "Stream proc." }
    ]
  },
  {
    name: "Power Platform & Outros",
    color: "var(--accent)",
    items: [
      { n: "Power Apps",     d: "Low-code" },
      { n: "Power Automate", d: "RPA"      },
      { n: "Power BI",       d: "BI"       },
      { n: "Python",         d: "Backend"  },
      { n: "Supabase",       d: "Backend"  },
      { n: "n8n",            d: "Automation" }
    ]
  }
];

const Stack = () => (
  <section className="section" id="stack" style={{ borderTop: "1px solid var(--line)" }}>
    <div className="container">
      <div className="section-head reveal">
        <span className="eyebrow">STACK / TECNOLOGIA</span>
        <h2>O ferramental que escolhemos<br />para mover sua operação.</h2>
        <p className="lead">Combinamos as principais clouds, o ecossistema Apache e Power Platform com open-source moderno. Tecnologia agnóstica — orientada ao seu contexto.</p>
      </div>

      <div className="stack-groups reveal">
        {STACK_GROUPS.map((g) => (
          <div className="stack-group" key={g.name}>
            <div className="sg-head">
              <span className="sg-bullet" style={{ background: g.color }}></span>
              <span className="sg-name">{g.name}</span>
              <span className="sg-count">{g.items.length} ferramentas</span>
            </div>
            <div className="sg-grid">
              {g.items.map(it => (
                <div className="sg-item" key={it.n}>
                  <div className="sg-n">{it.n}</div>
                  <div className="sg-d">{it.d}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- CTA Final ---------- */
const FinalCTA = () => {
  const [copied, setCopied] = useState(false);
  const email = "contato@egdconsultoria.com.br";
  const copy = (e) => {
    e.preventDefault();
    navigator.clipboard?.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <section className="cta-final" id="contato-cta">
      <div className="container">
        <div className="cta-card reveal">
          <span className="eyebrow">CONTATO / VAMOS COMEÇAR</span>
          <h2 style={{ marginTop: 22 }}>
            Pronto para destravar dados,<br />processos e produtos?
          </h2>
          <p style={{ marginTop: 22, fontSize: 17, maxWidth: 620 }}>
            Conte o seu desafio. Em até 48h respondemos com um diagnóstico inicial e os próximos passos.
          </p>
          <div className="cta-actions">
            <a href="contato.html" className="btn btn-primary">Agendar conversa <Arrow /></a>
            <a href={`mailto:${email}`} onClick={copy} className="cta-mail" title="Clique para copiar">
              {copied ? <span className="copied">e-mail copiado ✓</span> : <>{email}</>}
              {!copied && <ArrowUR size={12} />}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- App ---------- */
const App = () => {
  useReveal();
  return (
    <>
      <Navbar />
      <Hero />
      <ServicesPreview />
      <Architecture />
      <ProductsPreview />
      <Stack />
      <FinalCTA />
      <Footer />
    </>
  );
};

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
