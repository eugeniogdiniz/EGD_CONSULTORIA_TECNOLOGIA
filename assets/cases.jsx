/* CASES & CLIENTES — cases.jsx */

const fmtBRL = (n) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtBRLk = (n) => {
  if (n >= 1000000) return "R$ " + (n / 1000000).toFixed(2).replace(".", ",") + "M";
  if (n >= 1000)    return "R$ " + (n / 1000).toFixed(1).replace(".", ",") + "k";
  return fmtBRL(n);
};

/* ---------- Dataset (extraído da Planilha de CAPEX) ---------- */
const CLIENTS = [
  { id: "bjmm",      name: "Consórcio BJMM",            sector: "Habitação · Engenharia",   porte: "Médio",   sistemas: 3, automacoes: 15, economia: 459482.80, capex: 26656,  abbr: "BJ", featured: true,
    highlights: ["GED corporativo", "Sistema de vistoria em campo", "15 relatórios automatizados"] },
  { id: "habita-g",  name: "Consórcio HABITA GERENCIAL", sector: "Habitação Social",         porte: "Médio",   sistemas: 3, automacoes: 4,  economia: 228004.00, capex: 95200,  abbr: "HG", featured: true,
    highlights: ["SIGD — gerenciamento", "Controle de recibos", "Sistema de campo"] },
  { id: "urbhis",    name: "Consórcio URBHIS",           sector: "Urbanismo · Habitação",    porte: "Grande",  sistemas: 4, automacoes: 12, economia: 199727.50, capex: 53074,  abbr: "UR", featured: true,
    highlights: ["Power Apps integrados", "Atendimento de plantão", "Power BI · Mapa de Conteúdo"] },
  { id: "macae",     name: "Macaé Petrobrás",            sector: "Petróleo & Gás",           porte: "Médio",   sistemas: 1, automacoes: 12, economia: 48660.00,  capex: 30940,  abbr: "MP",
    highlights: ["Cabiunas — gerenciamento", "Compensação de inquilinos", "12 relatórios automatizados"] },
  { id: "vinci",     name: "Vinci Notificações",         sector: "Notificações · Compliance", porte: "Micro",  sistemas: 2, automacoes: 2,  economia: 28770.00,  capex: 4284,   abbr: "VN",
    highlights: ["App de notificações", "Relatório geral automatizado"] },
  { id: "bggk",      name: "Consórcio BGGK",             sector: "Engenharia · Bonin",       porte: "Pequeno", sistemas: 2, automacoes: 3,  economia: 16686.25,  capex: 1904,   abbr: "BG",
    highlights: ["SIGD dedicado", "Sistema de campo"] },
  { id: "bgpi",      name: "Consórcio BGPI",             sector: "Engenharia · Bonin",       porte: "Médio",   sistemas: 2, automacoes: 2,  economia: 16686.25,  capex: 1904,   abbr: "BP",
    highlights: ["SIGD + Sistema de campo"] },
  { id: "habita-s",  name: "Consórcio HABITA SOCIAL",    sector: "Habitação Social",         porte: "Grande",  sistemas: 3, automacoes: 3,  economia: 16593.75,  capex: 10472,  abbr: "HS",
    highlights: ["Lançamento de KM", "Controle de frotas", "Planejamento"] },
  { id: "cohab",     name: "COHAB SANTOS",               sector: "Habitação Pública",        porte: "Micro",   sistemas: 2, automacoes: 3,  economia: 11487.50,  capex: 714,    abbr: "CS",
    highlights: ["Sistema web dedicado", "App Android de arrolamento"] },
  { id: "cosan",     name: "COSAN",                      sector: "Energia · Logística",      porte: "Micro",   sistemas: 3, automacoes: 2,  economia: 0,         capex: 0,      abbr: "CN",
    highlights: ["SIGD", "Controle de arquivos", "Sistema de campo"], status: "em desenvolvimento" },
  { id: "reurbsp",   name: "Consórcio REURBSP",          sector: "Regularização Fundiária",  porte: "Grande",  sistemas: 0, automacoes: 4,  economia: 0,         capex: 0,      abbr: "RB",
    highlights: ["4 automações em homologação"], status: "em desenvolvimento" },
  { id: "eletro",    name: "ELETROBRAS",                 sector: "Energia",                  porte: "Micro",   sistemas: 1, automacoes: 0,  economia: 0,         capex: 0,      abbr: "EB",
    highlights: ["Gestão de Documentos (GED)"] },
  { id: "habita-r",  name: "Consórcio Habita REURBSP",   sector: "Regularização · Habitação",porte: "Grande",  sistemas: 1, automacoes: 0,  economia: 0,         capex: 0,      abbr: "HR",
    highlights: ["Sistema GED em produção"] }
];

const TOTALS = {
  clientes: CLIENTS.length,
  sistemas: CLIENTS.reduce((a, c) => a + c.sistemas, 0),
  automacoes: CLIENTS.reduce((a, c) => a + c.automacoes, 0),
  economia: CLIENTS.reduce((a, c) => a + c.economia, 0)
};

/* ---------- Page Hero ---------- */
const CasesHero = () => (
  <section className="page-head">
    <div className="grid-bg"></div>
    <div className="container">
      <div className="crumbs reveal in">
        <a href="index.html">EGD</a>
        <span className="sep">/</span>
        <span>Cases</span>
      </div>
      <h1 className="reveal in">
        13 clientes. 35 sistemas.<br />
        <span className="italic-grad">87 automações em produção.</span>
      </h1>
      <p className="lead reveal">
        Cada projeto entregue está consolidado num ledger técnico — porte, escopo, CAPEX e ROI mensurado. O retrato fiel do que já rodou em produção sob nossa engenharia.
      </p>

      <div className="cases-kpis reveal" style={{ marginTop: 48 }}>
        <KpiCell label="CLIENTES ATENDIDOS"   value={TOTALS.clientes}   suffix="" />
        <KpiCell label="SISTEMAS / ERPS"      value={TOTALS.sistemas}   suffix="+" />
        <KpiCell label="AUTOMAÇÕES EM PROD."  value={TOTALS.automacoes} suffix="+" />
        <KpiCell label="ECONOMIA ANUAL TOTAL" value={fmtBRLk(TOTALS.economia).replace("R$ ","")} prefix="R$" suffix="" />
      </div>
    </div>
  </section>
);

const KpiCell = ({ label, value, prefix, suffix }) => (
  <div className="kpi-cell">
    <div className="num">
      {prefix && <small style={{ marginRight: 4 }}>{prefix}</small>}
      {value}{suffix && <small>{suffix}</small>}
    </div>
    <div className="lbl">{label}</div>
  </div>
);

/* ---------- Featured Cases ---------- */
const FeaturedCases = () => {
  const featured = CLIENTS.filter(c => c.featured);
  return (
    <section className="section" id="destaques">
      <div className="container">
        <div className="section-head row reveal">
          <div>
            <span className="eyebrow">CASES EM DESTAQUE · TOP 3 EM ROI</span>
            <h2>Três programas. R$ 887k<br />em economia anual proposta.</h2>
            <p className="lead">Os projetos com maior densidade de entregas e retorno mensurado — combinando sistemas dedicados e portfólio amplo de automações de relatório, vistoria e gestão.</p>
          </div>
          <a href="#ledger" className="btn btn-ghost">Ver todos <Arrow /></a>
        </div>

        <div className="featured-grid reveal">
          {featured.map((c, i) => (
            <FeaturedCard key={c.id} c={c} idx={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeaturedCard = ({ c, idx }) => (
  <article className="feat-card">
    <div className="fc-head">
      <div className="fc-num">CASE / 0{idx + 1}</div>
      <span className="status"><span className="dot"></span>EM PRODUÇÃO</span>
    </div>
    <div className="fc-mark"><span>{c.abbr}</span></div>
    <h3 className="fc-name">{c.name}</h3>
    <div className="fc-sector">{c.sector}</div>

    <div className="fc-eco">
      <div className="fc-eco-lbl">ECONOMIA ANUAL PROPOSTA</div>
      <div className="fc-eco-val">{fmtBRL(c.economia)}</div>
    </div>

    <div className="fc-stats">
      <div><span className="n">{c.sistemas}</span><span className="l">SISTEMAS</span></div>
      <div><span className="n">{c.automacoes}</span><span className="l">AUTOMAÇÕES</span></div>
      <div><span className="n">{c.porte}</span><span className="l">PORTE</span></div>
    </div>

    <ul className="fc-bullets">
      {c.highlights.map((h, i) => <li key={i}>{h}</li>)}
    </ul>
  </article>
);

/* ---------- All Clients Grid ---------- */
const AllClients = () => (
  <section className="section" id="clientes" style={{ borderTop: "1px solid var(--line)", background: "var(--bg-2)" }}>
    <div className="container">
      <div className="section-head reveal">
        <span className="eyebrow">CLIENTES / PORTFÓLIO COMPLETO</span>
        <h2>Quem confiou na operação.</h2>
        <p className="lead">De pequenos consórcios a grandes operadores de habitação, energia e infraestrutura — cada cliente tem uma trilha técnica documentada e mensurável.</p>
      </div>

      <div className="client-grid reveal">
        {CLIENTS.map(c => (
          <a key={c.id} href={`#${c.id}`} className="client-card">
            <div className="cc-mark"><span>{c.abbr}</span></div>
            <div className="cc-body">
              <div className="cc-name">{c.name}</div>
              <div className="cc-sector">{c.sector}</div>
              <div className="cc-meta">
                <span className="tag tag-sm">{c.porte}</span>
                {c.status && <span className="tag tag-sm" style={{ color: "var(--warn)", borderColor: "color-mix(in oklab, var(--warn) 30%, transparent)" }}>{c.status}</span>}
              </div>
            </div>
            <div className="cc-stats">
              <div><span className="n">{c.sistemas}</span><span className="l">SIST.</span></div>
              <div><span className="n">{c.automacoes}</span><span className="l">AUT.</span></div>
            </div>
          </a>
        ))}
      </div>
    </div>
  </section>
);

/* ---------- Full Ledger Table ---------- */
const Ledger = () => {
  const sorted = [...CLIENTS].sort((a, b) => b.economia - a.economia);
  return (
    <section className="section" id="ledger">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">LEDGER TÉCNICO · DADOS REAIS</span>
          <h2>O retrato completo,<br />ordenado por retorno.</h2>
          <p className="lead">Todas as entregas em uma única tabela. Ordenado por economia anual proposta — extraído da planilha mestra de CAPEX.</p>
        </div>

        <div className="ledger-wrap reveal">
          <div className="ledger-head">
            <span>cases.ledger</span>
            <span className="ld-meta">13 registros · atualizado mensalmente</span>
          </div>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>#</th>
                <th>CLIENTE</th>
                <th>SETOR</th>
                <th>PORTE</th>
                <th className="num">SIST.</th>
                <th className="num">AUTOM.</th>
                <th className="num">CAPEX (R$)</th>
                <th className="num">ECONOMIA ANUAL</th>
                <th className="num">ROI 12M</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => {
                const roi = c.capex > 0 ? ((c.economia / c.capex) * 100) : 0;
                return (
                  <tr key={c.id} id={c.id}>
                    <td className="lo-idx">{String(i + 1).padStart(2, "0")}</td>
                    <td className="lo-name">
                      <span className="lo-mark">{c.abbr}</span>
                      <span>{c.name}</span>
                    </td>
                    <td className="lo-sector">{c.sector}</td>
                    <td><span className="tag tag-sm">{c.porte}</span></td>
                    <td className="num">{c.sistemas}</td>
                    <td className="num">{c.automacoes}</td>
                    <td className="num lo-mute">{c.capex > 0 ? fmtBRL(c.capex) : "—"}</td>
                    <td className="num lo-eco">{c.economia > 0 ? fmtBRL(c.economia) : <span className="lo-pending">— em curso</span>}</td>
                    <td className="num">
                      {roi > 0 ? <span className="lo-roi">{roi.toFixed(0)}%</span> : <span className="lo-mute">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4">TOTAIS</td>
                <td className="num">{TOTALS.sistemas}</td>
                <td className="num">{TOTALS.automacoes}</td>
                <td className="num lo-mute">—</td>
                <td className="num lo-eco">{fmtBRL(TOTALS.economia)}</td>
                <td className="num">—</td>
              </tr>
            </tfoot>
          </table>
          <div className="ledger-foot">
            <span>* CAPEX = parcela de desenvolvimento (à vista ou diluído em 12–24 meses)</span>
            <span>* Economia = horas/mês × custo do responsável manual × 12, conforme planilha</span>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- Sectors Strip ---------- */
const SectorsStrip = () => {
  const sectors = [...new Set(CLIENTS.map(c => c.sector.split(" · ")[0]))];
  return (
    <section className="section-tight" style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
      <div className="container">
        <div className="sectors-wrap reveal">
          <div className="sectors-label">SETORES ATENDIDOS</div>
          <div className="sectors-list">
            {sectors.map(s => <span key={s} className="sector-chip">{s}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- CTA ---------- */
const CTA = () => (
  <section className="cta-final">
    <div className="container">
      <div className="cta-card reveal">
        <span className="eyebrow">SEU PROJETO É O PRÓXIMO?</span>
        <h2 style={{ marginTop: 22 }}>
          Construímos o seu case<br />com o mesmo método.
        </h2>
        <p style={{ marginTop: 22, fontSize: 17, maxWidth: 620 }}>
          Diagnóstico, escopo e proposta em até 48h. Cada projeto entra no ledger com CAPEX claro e ROI mensurado.
        </p>
        <div className="cta-actions">
          <a href="contato.html" className="btn btn-primary">Iniciar diagnóstico <Arrow /></a>
          <a href="servicos.html" className="btn btn-ghost">Ver capacidades</a>
        </div>
      </div>
    </div>
  </section>
);

/* ---------- App ---------- */
const App = () => {
  useReveal();
  return (
    <>
      <Navbar />
      <CasesHero />
      <SectorsStrip />
      <FeaturedCases />
      <AllClients />
      <Ledger />
      <CTA />
      <Footer />
    </>
  );
};

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
