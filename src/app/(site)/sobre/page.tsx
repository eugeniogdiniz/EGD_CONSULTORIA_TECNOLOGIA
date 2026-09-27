import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/legacy/ui";
import { PRINCIPLES, TIMELINE, SECTORS } from "@/content/legacy-pages";

export const metadata: Metadata = { title: "Sobre", description: "A EGD Consultoria: consultoria de tecnologia que entrega código em produção." };

export default function SobrePage() {
  return (
    <>
      <section className="page-head">
        <div className="grid-bg"></div>
        <div className="container">
          <div className="reveal in">
            <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><span>SOBRE</span></div>
            <h1 style={{ marginTop: 24 }}>
              Tecnologia com método —<br />
              <span className="italic-grad">e sem teatro</span>.
            </h1>
            <p className="lead">A EGD Consultoria nasceu para preencher um espaço pouco ocupado: consultoria de tecnologia que entrega código em produção, não apenas diagnóstico. Somos engenheiros que viram consultores — não o contrário.</p>
          </div>
          <div className="hero-meta reveal" style={{ marginTop: 56 }}>
            <div className="meta-item"><div className="num">8<small>+</small></div><div className="lbl">ANOS DE OPERAÇÃO</div></div>
            <div className="meta-item"><div className="num">40<small>+</small></div><div className="lbl">PROJETOS ENTREGUES</div></div>
            <div className="meta-item"><div className="num">22</div><div className="lbl">PESSOAS NO TIME</div></div>
            <div className="meta-item"><div className="num">6</div><div className="lbl">SETORES ATENDIDOS</div></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="about-grid">
            <div className="reveal">
              <span className="eyebrow">PRINCÍPIOS</span>
              <h2 style={{ marginTop: 18 }}>Como pensamos<br />o trabalho diário.</h2>
              <p className="lead" style={{ marginTop: 22 }}>Princípios que mantemos mesmo quando dão trabalho — porque é exatamente quando dão trabalho que importam.</p>
            </div>
            <div className="principle-list reveal">
              {PRINCIPLES.map((p, i) => (
                <div className="principle" key={i}>
                  <div className="pn">P/{String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <h3>{p.t}</h3>
                    <p>{p.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ borderTop: "1px solid var(--line)", background: "var(--bg-2)" }}>
        <div className="container">
          <div className="about-grid">
            <div className="reveal">
              <span className="eyebrow">LINHA DO TEMPO</span>
              <h2 style={{ marginTop: 18 }}>Da primeira automação<br />ao stack moderno.</h2>
              <p className="lead" style={{ marginTop: 22 }}>Crescemos no ritmo dos clientes. Cada vertical surgiu para resolver um problema real — não como aposta de mercado.</p>
            </div>
            <div className="timeline reveal">
              {TIMELINE.map((t, i) => (
                <div className="tl-item" key={i}>
                  <div className="tl-year">{t.y}</div>
                  <div className="tl-dot" style={{ position: "relative" }}><i></i></div>
                  <div className="tl-content">
                    <h4>{t.t}</h4>
                    <p>{t.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">SETORES ATENDIDOS</span>
            <h2>Verticais onde já entregamos.</h2>
          </div>
          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
            {SECTORS.map((s, i) => (
              <div key={i} style={{ background: "var(--bg)", padding: "32px 28px" }}>
                <div style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 500, marginBottom: 6 }}>{s.n}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--fg-mute)" }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-final">
        <div className="container">
          <div className="cta-card reveal">
            <span className="eyebrow">VAMOS CONVERSAR</span>
            <h2 style={{ marginTop: 22 }}>Acreditamos que o melhor briefing<br />acontece numa conversa de 30 minutos.</h2>
            <div className="cta-actions">
              <Link href="/contato" className="btn btn-primary">Agendar conversa <Arrow /></Link>
              <Link href="/servicos" className="btn btn-ghost">Ver serviços</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
