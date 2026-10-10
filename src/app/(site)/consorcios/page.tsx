import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Arrow, ArrowUR } from "@/components/legacy/ui";
import { Faq } from "@/components/site/faq";
import { JsonLd } from "@/components/site/json-ld";
import { ARTICLES } from "@/content/artigos";
import { CONSORCIOS } from "@/content/consorcios";
import { breadcrumbJsonLd, faqJsonLd, pageMeta, webPageJsonLd } from "@/content/seo";

const META = { title: CONSORCIOS.metaTitle, description: CONSORCIOS.metaDescription, path: "/consorcios" };
export const metadata: Metadata = pageMeta(META);

export default function ConsorciosPage() {
  const artigos = ARTICLES.filter((a) => ["controle-de-documentos-em-consorcio", "medicao-de-contrato-de-obra", "rdo-relatorio-diario-de-obra"].includes(a.slug));
  return (
    <>
      <JsonLd data={[webPageJsonLd(META), breadcrumbJsonLd([{ name: "Para consórcios", path: META.path }]), faqJsonLd(CONSORCIOS.faq)]} />
      <section className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><span>PARA CONSÓRCIOS</span></div>
          <h1 style={{ marginTop: 24 }}>{CONSORCIOS.h1}</h1>
          <p className="lead">{CONSORCIOS.definition}</p>
          <Image className="brand-editorial-image" src="/brand/images/territorio-azul.webp" alt="Maquete conceitual de infraestrutura, edifícios e energia conectados por um percurso azul." width={1536} height={1024} sizes="(max-width: 800px) 100vw, 1180px" />
        </div>
      </section>

      <section className="brand-section container">
        <div className="brand-section-heading"><span className="brand-label">O que trava um consórcio</span><div><h2>Seis problemas que se repetem<br />em todo contrato.</h2><p>Nascemos resolvendo exatamente estes. Cada um tem uma solução que já está em operação.</p></div></div>
        <div className="brand-problems">
          {CONSORCIOS.problems.map((p) => <div key={p.t}><h3>{p.t}</h3><p>{p.d}</p></div>)}
        </div>
      </section>

      <section className="brand-section container" style={{ paddingTop: 0 }}>
        <div className="brand-section-heading"><span className="brand-label">O que entregamos</span><div><h2>Produtos prontos e automações,<br />ajustados à estrutura do consórcio.</h2></div></div>
        <div className="brand-cards">
          {CONSORCIOS.deliverables.map((d) => <Link href={d.href} key={d.href} className="brand-card"><h3>{d.t}</h3><p>{d.d}</p><span className="meta">Ver página <ArrowUR size={12} /></span></Link>)}
        </div>
      </section>

      <section className="brand-section container" style={{ paddingTop: 0 }}>
        <div className="brand-section-heading"><span className="brand-label">Para ler e usar</span><div><h2>Artigos e modelos<br />para o dia a dia do contrato.</h2></div></div>
        <div className="brand-cards">
          {artigos.map((a) => <Link href={`/artigos/${a.slug}`} key={a.slug} className="brand-card"><h3>{a.title}</h3><p>{a.description}</p><span className="meta">{a.readingMinutes} min de leitura · modelo em planilha</span></Link>)}
        </div>
      </section>

      <Faq items={CONSORCIOS.faq} title="Perguntas de quem toca consórcio." />

      <section className="cta-final">
        <div className="container">
          <div className="cta-card">
            <span className="eyebrow">VAMOS CONVERSAR</span>
            <h2 style={{ marginTop: 22 }}>Qual contrato está<br />começando ou travando?</h2>
            <p style={{ marginTop: 22, fontSize: 17, maxWidth: 620 }}>Em 30 minutos dizemos por onde começar: documentos, vistorias, medições ou relatórios.</p>
            <div className="cta-actions">
              <Link href="/contato" className="btn btn-primary">Agendar conversa <Arrow /></Link>
              <Link href="/produtos" className="btn btn-ghost">Ver produtos</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
