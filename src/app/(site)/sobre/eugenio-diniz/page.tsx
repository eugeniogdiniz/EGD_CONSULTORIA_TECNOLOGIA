import type { Metadata } from "next";
import Link from "next/link";
import { Arrow, ArrowUR } from "@/components/legacy/ui";
import { JsonLd } from "@/components/site/json-ld";
import { ARTICLES } from "@/content/artigos";
import { breadcrumbJsonLd, KNOWS_ABOUT, pageMeta, personJsonLd, webPageJsonLd } from "@/content/seo";
import { SITE } from "@/content/site";

const META = {
  title: `${SITE.founder.name}, consultor em tecnologia e fundador da EGD`,
  description: "Quem responde pela EGD Consultoria em Tecnologia: fundador, áreas de atuação, artigos publicados e perfis públicos no LinkedIn e no GitHub.",
  path: SITE.founder.path,
};
export const metadata: Metadata = pageMeta(META);

/** Página do autor: a ProfilePage do schema.org tem a Person como entidade principal. */
export default function AutorPage() {
  const profile = { ...webPageJsonLd({ kind: "ProfilePage", ...META }), mainEntity: personJsonLd({ standalone: false }) };
  return (
    <>
      <JsonLd data={[profile, breadcrumbJsonLd([{ name: "Sobre", path: "/sobre" }, { name: SITE.founder.name, path: META.path }])]} />
      <section className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><Link href="/sobre">SOBRE</Link><span className="sep">→</span><span>AUTOR</span></div>
          <h1 style={{ marginTop: 24 }}>{SITE.founder.name}</h1>
          <p className="lead" style={{ marginTop: 12, fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--fg-mute)" }}>{SITE.founder.jobTitle} · {SITE.city}</p>
          <p className="lead">{SITE.founder.bio}</p>
          <div className="cta-actions" style={{ marginTop: 24 }}>
            <a href={SITE.founder.linkedin} rel="me noopener" target="_blank" className="btn btn-ghost btn-sm">LinkedIn <ArrowUR size={12} /></a>
            <a href={SITE.founder.github} rel="me noopener" target="_blank" className="btn btn-ghost btn-sm">GitHub <ArrowUR size={12} /></a>
            <a href={`mailto:${SITE.email}`} className="btn btn-ghost btn-sm">{SITE.email}</a>
          </div>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container brand-detail">
          <div>
            <div className="brand-block" style={{ marginTop: 0 }}>
              <h2>Áreas em que atua</h2>
              <ul className="brand-list">{KNOWS_ABOUT.map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
            <div className="brand-block">
              <h2>Como trabalha</h2>
              <p>Começa pelo processo real da operação, desenha a solução com o time do cliente e acompanha cada etapa até o software em produção, com testes, monitoramento e manual de operação. Código, modelos e dados ficam com o cliente.</p>
            </div>
          </div>
          <aside className="brand-detail-aside" aria-label="Resumo do autor">
            <h2>Em resumo</h2>
            <div className="row"><span className="k">Empresa</span><span className="v">{SITE.name}</span></div>
            <div className="row"><span className="k">Desde</span><span className="v">{SITE.foundingYear}</span></div>
            <div className="row"><span className="k">Onde</span><span className="v">{SITE.city}; remoto em todo o país</span></div>
            <div className="row"><span className="k">Artigos</span><span className="v">{ARTICLES.length} publicados</span></div>
            <Link href="/contato" className="btn btn-primary">Agendar conversa <Arrow /></Link>
          </aside>
        </div>
      </section>

      <section className="brand-section container" style={{ paddingTop: 0 }}>
        <div className="brand-section-heading"><span className="brand-label">Artigos</span><div><h2>O que {SITE.founder.name.split(" ")[0]} escreveu.</h2><p>Textos práticos sobre RDO, medição, vistoria, documentos e automação, cada um com um modelo em planilha para baixar.</p></div></div>
        <div className="brand-cards">
          {ARTICLES.map((a) => <Link href={`/artigos/${a.slug}`} key={a.slug} className="brand-card"><h3>{a.title}</h3><p>{a.description}</p><span className="meta">{a.readingMinutes} min de leitura · modelo em planilha</span></Link>)}
        </div>
      </section>

      <section className="cta-final">
        <div className="container">
          <div className="cta-card">
            <span className="eyebrow">VAMOS CONVERSAR</span>
            <h2 style={{ marginTop: 22 }}>Conte o problema.<br />A resposta vem de quem vai resolver.</h2>
            <div className="cta-actions">
              <Link href="/contato" className="btn btn-primary">Agendar conversa <Arrow /></Link>
              <Link href="/sobre" className="btn btn-ghost">Sobre a EGD</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
