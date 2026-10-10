import type { Metadata } from "next";
import { breadcrumbJsonLd, faqJsonLd, pageMeta, webPageJsonLd } from "@/content/seo";
import { FAQ } from "@/content/faq";
import { JsonLd } from "@/components/site/json-ld";
import { Faq } from "@/components/site/faq";
import Link from "next/link";
import Image from "next/image";
import { getSiteCases } from "@/modules/cases/site";
import { SHOW_CASES } from "@/content/site";
import { Arrow, ArrowUR } from "@/components/legacy/ui";
import { PRINCIPLES, TIMELINE, SECTORS } from "@/content/legacy-pages";
import { BrandFilm } from "@/components/site/brand-film";

const META = {
  title: "Sobre a EGD: engenharia que entrega código em produção",
  description: "A EGD nasceu dentro de consórcios de engenharia e habitação, resolvendo controle de documentos, vistorias e relatórios. Hoje também com dados, painéis e IA.",
  path: "/sobre",
};
export const metadata: Metadata = pageMeta(META);

export const dynamic = "force-dynamic";

export default async function SobrePage() {
  const TOTAIS = SHOW_CASES ? (await getSiteCases()).totals : null;
  return (
    <>
      <JsonLd data={[webPageJsonLd({ kind: "AboutPage", ...META }), breadcrumbJsonLd([{ name: "Sobre", path: META.path }]), faqJsonLd(FAQ.sobre)]} />
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
          <Image className="brand-editorial-image" src="/brand/images/fluxo-azul.webp" alt="Maquete conceitual de três etapas conectadas por um percurso azul, representando o método EGD." width={1536} height={1024} sizes="(max-width: 800px) 100vw, 1180px" />
          {TOTAIS && (
          <div className="hero-meta" style={{ marginTop: 40 }}>
            <div className="meta-item"><div className="num">{TOTAIS.clientes}</div><div className="lbl">Clientes no portfólio</div></div>
            <div className="meta-item"><div className="num">{TOTAIS.sistemas}</div><div className="lbl">Sistemas entregues</div></div>
            <div className="meta-item"><div className="num">{TOTAIS.automacoes}</div><div className="lbl">Automações entregues</div></div>
            <div className="meta-item"><Link href="/cases" className="btn btn-ghost">Conheça os cases</Link></div>
          </div>
          )}
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
              <span className="eyebrow">TRAJETÓRIA</span>
              <h2 style={{ marginTop: 18 }}>Da primeira automação<br />ao stack moderno.</h2>
              <p className="lead" style={{ marginTop: 22 }}>Crescemos no ritmo dos contratos que atendemos. Cada frente surgiu para resolver um problema real de campo, de contrato ou de decisão — não como aposta de mercado.</p>
            </div>
            <div className="timeline reveal">
              {TIMELINE.map((t, i) => (
                <div className="tl-item" key={i}>
                  <div className="tl-year">{t.y}</div>
                  <div className="tl-dot" style={{ position: "relative" }}><i></i></div>
                  <div className="tl-content">
                    <h4 aria-level={3}>{t.t}</h4>
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
            <span className="eyebrow">PARA QUEM</span>
            <h2>Públicos e setores onde entregamos.</h2>
          </div>
          <div className="brand-sectors">
            {SECTORS.map((s, i) => {
              const inner = (
                <>
                  <div style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 500, marginBottom: 6 }}>{s.n}{s.href && <ArrowUR size={14} />}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--fg-mute)" }}>{s.d}</div>
                </>
              );
              const style = { background: "var(--bg)", padding: "32px 28px", display: "block", color: "inherit" } as const;
              return s.href ? <Link key={i} href={s.href} style={style}>{inner}</Link> : <div key={i} style={style}>{inner}</div>;
            })}
          </div>
        </div>
      </section>

      <section className="brand-section container brand-film-section">
        <div><span className="brand-label">A marca em movimento</span><h2>Do projeto<br />à operação.</h2><p>Dados, sistemas e pessoas conectados por uma mesma direção.</p></div>
        <BrandFilm variant="signature" />
      </section>

      <Faq items={FAQ.sobre} title="Perguntas frequentes sobre a EGD." />
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
