import type { ProductVisual } from "@/content/legacy-pages";

/* Mocks visuais dos produtos (portado de legacy/assets/produtos.jsx). */
export function Visual({ kind }: { kind: ProductVisual }) {
  if (kind === "contratos") {
    return (
      <>
        <div className="kpi-grid">
          <div className="kpi"><div className="lbl">Vigentes</div><div className="val">428</div></div>
          <div className="kpi"><div className="lbl">A vencer (30d)</div><div className="val" style={{ color: "var(--warn)" }}>17</div></div>
          <div className="kpi"><div className="lbl">Valor anual</div><div className="val">R$ 84<small>M</small></div></div>
        </div>
        <div className="mock-window" style={{ marginTop: 14 }}>
          <div className="mw-head"><i></i><i></i><i></i><span className="url">/contratos/dashboard</span></div>
          <div className="mw-body">
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-mute)", marginBottom: 10 }}>VENCIMENTOS / 12 MESES</div>
            <div className="bar-chart">
              {[40, 55, 30, 72, 45, 60, 38, 82, 50, 65, 42, 90].map((h, i) => (
                <div key={i} className="bar" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }
  if (kind === "rh") {
    return (
      <>
        <div className="kpi-grid">
          <div className="kpi"><div className="lbl">Headcount</div><div className="val">1.247</div></div>
          <div className="kpi"><div className="lbl">Turnover 12m</div><div className="val">8,4<small>%</small></div></div>
          <div className="kpi"><div className="lbl">Onboardings</div><div className="val">23</div></div>
        </div>
        <div className="list-rows">
          <div className="list-row"><span style={{ color: "var(--fg)" }}>M. Andrade</span><span>Solicitação de férias</span><span className="pill">15 dias</span><span className="pill warn">pendente</span></div>
          <div className="list-row"><span style={{ color: "var(--fg)" }}>R. Silva</span><span>Banco de horas</span><span>+12h</span><span className="pill ok">aprovado</span></div>
          <div className="list-row"><span style={{ color: "var(--fg)" }}>L. Costa</span><span>Onboarding D+3</span><span>72%</span><span className="pill accent">no prazo</span></div>
          <div className="list-row"><span style={{ color: "var(--fg)" }}>P. Oliveira</span><span>Reembolso</span><span>R$ 1.240</span><span className="pill warn">análise</span></div>
        </div>
      </>
    );
  }
  if (kind === "vistorias") {
    return (
      <>
        <div className="mock-window">
          <div className="mw-head"><i></i><i></i><i></i><span className="url">vistoria #4821 · obra Vila Olímpia</span></div>
          <div className="mw-body" style={{ padding: 0 }}>
            <div style={{ background: "linear-gradient(135deg, #14192a, #0a0e16)", height: 140, position: "relative", overflow: "hidden" }}>
              <svg viewBox="0 0 400 140" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                {[...Array(8)].map((_, i) => <line key={i} x1={i * 50} y1="0" x2={i * 50} y2="140" stroke="rgba(255,255,255,0.05)" />)}
                {[...Array(5)].map((_, i) => <line key={"h" + i} x1="0" y1={i * 30} x2="400" y2={i * 30} stroke="rgba(255,255,255,0.05)" />)}
                <circle cx="120" cy="50" r="6" fill="oklch(0.78 0.16 152)" />
                <circle cx="240" cy="80" r="6" fill="oklch(0.80 0.15 80)" />
                <circle cx="320" cy="40" r="6" fill="oklch(0.72 0.18 28)" />
                <text x="120" y="40" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ok)">OK</text>
                <text x="240" y="70" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--warn)">!</text>
                <text x="320" y="30" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--err)">NC</text>
              </svg>
            </div>
            <div style={{ padding: "14px 16px", borderTop: "1px solid var(--line)" }}>
              <div className="list-rows" style={{ border: "none", marginTop: 0 }}>
                <div className="list-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}><span>CHK-001</span><span style={{ color: "var(--fg)" }}>Estrutura armadura</span><span></span><span className="pill ok">conforme</span></div>
                <div className="list-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}><span>CHK-014</span><span style={{ color: "var(--fg)" }}>Concreto pilares</span><span></span><span className="pill warn">observação</span></div>
                <div className="list-row" style={{ padding: "8px 0", borderBottom: "none" }}><span>CHK-022</span><span style={{ color: "var(--fg)" }}>EPI obrigatório</span><span></span><span className="pill" style={{ color: "var(--err)", borderColor: "color-mix(in oklab, var(--err) 30%, transparent)" }}>não-conforme</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className="kpi-grid" style={{ marginTop: 14 }}>
          <div className="kpi"><div className="lbl">Vistorias/mês</div><div className="val">340</div></div>
          <div className="kpi"><div className="lbl">Não-conf.</div><div className="val">12<small>%</small></div></div>
          <div className="kpi"><div className="lbl">Tempo médio</div><div className="val">38<small>min</small></div></div>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><div className="lbl">Abertos</div><div className="val">142</div></div>
        <div className="kpi"><div className="lbl">SLA 30d</div><div className="val">96,4<small>%</small></div></div>
        <div className="kpi"><div className="lbl">CSAT</div><div className="val">4,7<small>/5</small></div></div>
      </div>
      <div className="list-rows">
        <div className="list-row"><span>#9847</span><span style={{ color: "var(--fg)" }}>VPN não conecta</span><span>P2</span><span className="pill ok">2h restantes</span></div>
        <div className="list-row"><span>#9846</span><span style={{ color: "var(--fg)" }}>Acesso a SharePoint</span><span>P3</span><span className="pill accent">auto-resolvido</span></div>
        <div className="list-row"><span>#9845</span><span style={{ color: "var(--fg)" }}>Trocar teclado</span><span>P4</span><span className="pill">aguardando</span></div>
        <div className="list-row"><span>#9844</span><span style={{ color: "var(--fg)" }}>Erro Power BI</span><span>P2</span><span className="pill warn">SLA 30min</span></div>
        <div className="list-row"><span>#9843</span><span style={{ color: "var(--fg)" }}>Reset MFA</span><span>P3</span><span className="pill ok">resolvido</span></div>
      </div>
    </>
  );
}
