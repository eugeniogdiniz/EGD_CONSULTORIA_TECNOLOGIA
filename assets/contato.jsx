/* CONTATO page */

const ContactPage = () => {
  useReveal();
  const [budget, setBudget] = useState("50-200k");
  const [interest, setInterest] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleInterest = (v) => {
    setInterest(arr => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const reset = () => {
    setSubmitted(false);
    setInterest([]);
    setBudget("50-200k");
  };

  return (
    <>
      <Navbar />
      <section className="page-head">
        <div className="grid-bg"></div>
        <div className="container">
          <div className="reveal in">
            <div className="crumbs">
              <a href="index.html">/</a><span className="sep">→</span><span>CONTATO</span>
            </div>
            <h1 style={{ marginTop: 24 }}>
              Conta o seu desafio —<br />
              <span className="italic-grad">respondemos em 48h</span>.
            </h1>
            <p className="lead">Quanto mais contexto você der, mais útil será nosso retorno. Se preferir, escreva direto: contato@egdconsultoria.com.br</p>
          </div>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container">
          <div className="contact-grid">
            <div className="form-card reveal">
              <form onSubmit={onSubmit}>
                <div className="form-row split">
                  <div>
                    <label>Nome</label>
                    <input type="text" placeholder="Seu nome completo" required />
                  </div>
                  <div>
                    <label>Empresa</label>
                    <input type="text" placeholder="Nome da empresa" />
                  </div>
                </div>
                <div className="form-row split">
                  <div>
                    <label>E-mail</label>
                    <input type="email" placeholder="voce@empresa.com" required />
                  </div>
                  <div>
                    <label>Telefone</label>
                    <input type="tel" placeholder="(11) 99999-0000" />
                  </div>
                </div>

                <div className="form-row">
                  <label>Áreas de interesse</label>
                  <div className="budget-pills">
                    {[
                      "Desenvolvimento", "Automação", "Data & BI",
                      "Agentes de IA", "Governança", "Projetos Ágeis"
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt}
                        className={`budget-pill ${interest.includes(opt) ? "active" : ""}`}
                        onClick={() => toggleInterest(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <label>Investimento previsto (R$)</label>
                  <div className="budget-pills">
                    {[
                      ["<50k", "até 50 mil"],
                      ["50-200k", "50–200 mil"],
                      ["200-500k", "200–500 mil"],
                      [">500k", "acima de 500 mil"],
                      ["?", "ainda não sei"]
                    ].map(([k, v]) => (
                      <button
                        type="button"
                        key={k}
                        className={`budget-pill ${budget === k ? "active" : ""}`}
                        onClick={() => setBudget(k)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <label>Conta o desafio</label>
                  <textarea placeholder="Contexto, problema atual, resultado esperado, prazo aproximado..."></textarea>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 12 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-mute)", letterSpacing: "0.05em" }}>
                    🔒 SEUS DADOS SOMENTE PARA O CONTATO INICIAL
                  </span>
                  <button type="submit" className="btn btn-primary">Enviar mensagem <Arrow /></button>
                </div>
              </form>

              <div className={`form-success ${submitted ? "show" : ""}`}>
                <div>
                  <div className="check">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-12" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 24, marginBottom: 10 }}>Mensagem recebida.</h3>
                  <p style={{ maxWidth: 360 }}>Em até 48h um de nós retorna. Enquanto isso, você pode dar uma olhada nos nossos serviços ou produtos.</p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
                    <a href="servicos.html" className="btn btn-ghost btn-sm">Ver serviços</a>
                    <button onClick={reset} className="btn btn-sm">Enviar outra</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="contact-info reveal">
              <div className="ci-block">
                <h4>E-mail</h4>
                <div className="v">contato@egdconsultoria.com.br</div>
                <div className="d">Resposta em até 48h úteis.</div>
              </div>
              <div className="ci-block">
                <h4>Telefone</h4>
                <div className="v">+55 (11) 99999-0000</div>
                <div className="d">Seg–Sex · 9h às 18h (BRT).</div>
              </div>
              <div className="ci-block">
                <h4>Endereço</h4>
                <div className="v">São Paulo · BR</div>
                <div className="d">Atuamos remoto em todo o Brasil. Presencial sob demanda.</div>
              </div>
              <div className="ci-block" id="trabalhe">
                <h4>Trabalhe conosco</h4>
                <div className="v">Vagas abertas: 4</div>
                <div className="d">Eng. de dados · Full-stack · ML eng · Agile coach</div>
                <a href="mailto:rh@egdconsultoria.com.br" className="btn btn-ghost btn-sm" style={{ marginTop: 14 }}>Enviar currículo <ArrowUR size={12}/></a>
              </div>

              <div className="terminal" style={{ marginTop: 8 }}>
                <div className="term-head">
                  <div className="term-dots"><i></i><i></i><i></i></div>
                  <div className="term-title">~ /egd/status</div>
                  <div className="term-meta">live</div>
                </div>
                <div className="term-body" style={{ minHeight: 0 }}>
                  <div className="ln"><span className="lno">01</span><div><span className="prompt">$ </span><span>curl status.egd.com</span></div></div>
                  <div className="ln"><span className="lno">02</span><div><span className="out">→ all systems </span><span className="ok">[ OK ]</span></div></div>
                  <div className="ln"><span className="lno">03</span><div><span className="out">→ avg response: </span><span className="num">31h</span></div></div>
                  <div className="ln"><span className="lno">04</span><div><span className="out">→ booking slots open: </span><span className="num">7</span><span className="out"> / próx. 14d</span></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

ReactDOM.createRoot(document.getElementById("app")).render(<ContactPage />);
