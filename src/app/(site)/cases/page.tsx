import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/legacy/ui";
import { getPublishedTotals, listPublishedCases } from "@/modules/cases/queries";

export const metadata: Metadata = { title: "Cases", description: "Clientes, sistemas e automações em produção, com CAPEX e economia medida." };

const fmtBRL = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtBRLk = (n: number) => (n >= 1_000_000 ? "R$ " + (n / 1_000_000).toFixed(2).replace(".", ",") + "M" : n >= 1000 ? "R$ " + (n / 1000).toFixed(1).replace(".", ",") + "k" : fmtBRL(n));
const abbr = (nome: string) =>
  nome
    .replace(/^Consórcio\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

function KpiCell({ label, value, prefix, suffix }: { label: string; value: string | number; prefix?: string; suffix?: string }) {
  return (
    <div className="kpi-cell">
      <div className="num">
        {prefix && <small style={{ marginRight: 4 }}>{prefix}</small>}
        {value}
        {suffix && <small>{suffix}</small>}
      </div>
      <div className="lbl">{label}</div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const [CLIENTES, TOTAIS] = await Promise.all([listPublishedCases(), getPublishedTotals()]);
  const featured = CLIENTES.filter((c) => c.destaque);
  const sorted = [...CLIENTES].sort((a, b) => b.economia - a.economia);
  const sectors = [...new Set(CLIENTES.map((c) => c.setor.split(" e ")[0]))];
  const featuredTotal = featured.reduce((a, c) => a + c.economia, 0);

  return (
    <>
      <section className="page-head">
        <div className="grid-bg"></div>
        <div className="container">
          <div className="crumbs reveal in"><Link href="/">EGD</Link><span className="sep">/</span><span>Cases</span></div>
          <h1 className="reveal in">
            {TOTAIS.clientes} clientes. {TOTAIS.sistemas} sistemas.<br />
            <span className="italic-grad">{TOTAIS.automacoes} automações em produção.</span>
          </h1>
          <p className="lead reveal">Cada projeto entregue está consolidado num ledger técnico — porte, escopo, CAPEX e ROI mensurado. O retrato fiel do que já rodou em produção sob nossa engenharia.</p>
          <div className="cases-kpis reveal" style={{ marginTop: 48 }}>
            <KpiCell label="CLIENTES ATENDIDOS" value={TOTAIS.clientes} />
            <KpiCell label="SISTEMAS / ERPS" value={TOTAIS.sistemas} suffix="+" />
            <KpiCell label="AUTOMAÇÕES EM PROD." value={TOTAIS.automacoes} suffix="+" />
            <KpiCell label="ECONOMIA ANUAL TOTAL" value={fmtBRLk(TOTAIS.economia).replace("R$ ", "")} prefix="R$" />
          </div>
        </div>
      </section>

      <section className="section-tight" style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="container">
          <div className="sectors-wrap reveal">
            <div className="sectors-label">SETORES ATENDIDOS</div>
            <div className="sectors-list">{sectors.map((s) => <span key={s} className="sector-chip">{s}</span>)}</div>
          </div>
        </div>
      </section>

      <section className="section" id="destaques">
        <div className="container">
          <div className="section-head row reveal">
            <div>
              <span className="eyebrow">CASES EM DESTAQUE · TOP 3 EM ROI</span>
              <h2>Três programas. {fmtBRLk(featuredTotal)}<br />em economia anual proposta.</h2>
              <p className="lead">Os projetos com maior densidade de entregas e retorno mensurado — combinando sistemas dedicados e portfólio amplo de automações de relatório, vistoria e gestão.</p>
            </div>
            <a href="#ledger" className="btn btn-ghost">Ver todos <Arrow /></a>
          </div>
          <div className="featured-grid reveal">
            {featured.map((c, idx) => (
              <article className="feat-card" key={c.id}>
                <div className="fc-head">
                  <div className="fc-num">CASE / 0{idx + 1}</div>
                  <span className="status"><span className="dot"></span>EM PRODUÇÃO</span>
                </div>
                <div className="fc-mark"><span>{abbr(c.nome)}</span></div>
                <h3 className="fc-name">{c.nome}</h3>
                <div className="fc-sector">{c.setor}</div>
                <div className="fc-eco">
                  <div className="fc-eco-lbl">ECONOMIA ANUAL PROPOSTA</div>
                  <div className="fc-eco-val">{fmtBRL(c.economia)}</div>
                </div>
                <div className="fc-stats">
                  <div><span className="n">{c.sistemas}</span><span className="l">SISTEMAS</span></div>
                  <div><span className="n">{c.automacoes}</span><span className="l">AUTOMAÇÕES</span></div>
                  <div><span className="n">{c.porte}</span><span className="l">PORTE</span></div>
                </div>
                <ul className="fc-bullets">{c.entregas.map((h, i) => <li key={i}>{h}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="clientes" style={{ borderTop: "1px solid var(--line)", background: "var(--bg-2)" }}>
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">CLIENTES / PORTFÓLIO COMPLETO</span>
            <h2>Quem confiou na operação.</h2>
            <p className="lead">De pequenos consórcios a grandes operadores de habitação, energia e infraestrutura — cada cliente tem uma trilha técnica documentada e mensurável.</p>
          </div>
          <div className="client-grid reveal">
            {CLIENTES.map((c) => (
              <a key={c.id} href={`#${c.id}`} className="client-card">
                <div className="cc-mark"><span>{abbr(c.nome)}</span></div>
                <div className="cc-body">
                  <div className="cc-name">{c.nome}</div>
                  <div className="cc-sector">{c.setor}</div>
                  <div className="cc-meta">
                    <span className="tag tag-sm">{c.porte}</span>
                    {c.status && <span className="tag tag-sm" style={{ color: "var(--warn)", borderColor: "color-mix(in oklab, var(--warn) 30%, transparent)" }}>{c.status.toLowerCase()}</span>}
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
              <span className="ld-meta">{CLIENTES.length} registros · atualizado mensalmente</span>
            </div>
            <table className="ledger-table">
              <thead>
                <tr><th>#</th><th>CLIENTE</th><th>SETOR</th><th>PORTE</th><th className="num">SIST.</th><th className="num">AUTOM.</th><th className="num">CAPEX (R$)</th><th className="num">ECONOMIA ANUAL</th><th className="num">ROI 12M</th></tr>
              </thead>
              <tbody>
                {sorted.map((c, i) => {
                  const roi = c.capex > 0 ? (c.economia / c.capex) * 100 : 0;
                  return (
                    <tr key={c.id} id={c.id}>
                      <td className="lo-idx">{String(i + 1).padStart(2, "0")}</td>
                      <td className="lo-name"><span className="lo-mark">{abbr(c.nome)}</span><span>{c.nome}</span></td>
                      <td className="lo-sector">{c.setor}</td>
                      <td><span className="tag tag-sm">{c.porte}</span></td>
                      <td className="num">{c.sistemas}</td>
                      <td className="num">{c.automacoes}</td>
                      <td className="num lo-mute">{c.capex > 0 ? fmtBRL(c.capex) : "—"}</td>
                      <td className="num lo-eco">{c.economia > 0 ? fmtBRL(c.economia) : <span className="lo-pending">— em curso</span>}</td>
                      <td className="num">{roi > 0 ? <span className="lo-roi">{roi.toFixed(0)}%</span> : <span className="lo-mute">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>TOTAIS</td>
                  <td className="num">{TOTAIS.sistemas}</td>
                  <td className="num">{TOTAIS.automacoes}</td>
                  <td className="num lo-mute">—</td>
                  <td className="num lo-eco">{fmtBRL(TOTAIS.economia)}</td>
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

      <section className="cta-final">
        <div className="container">
          <div className="cta-card reveal">
            <span className="eyebrow">SEU PROJETO É O PRÓXIMO?</span>
            <h2 style={{ marginTop: 22 }}>Construímos o seu case<br />com o mesmo método.</h2>
            <p style={{ marginTop: 22, fontSize: 17, maxWidth: 620 }}>Diagnóstico, escopo e proposta em até 48h. Cada projeto entra no ledger com CAPEX claro e ROI mensurado.</p>
            <div className="cta-actions">
              <Link href="/contato" className="btn btn-primary">Iniciar diagnóstico <Arrow /></Link>
              <Link href="/servicos" className="btn btn-ghost">Ver capacidades</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
