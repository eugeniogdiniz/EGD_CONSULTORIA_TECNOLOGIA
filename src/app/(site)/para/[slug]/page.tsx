import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow, ArrowUR } from "@/components/legacy/ui";
import { Faq } from "@/components/site/faq";
import { JsonLd } from "@/components/site/json-ld";
import { ARTICLES } from "@/content/artigos";
import { PUBLICOS, PUBLICOS_LINKS, publico } from "@/content/publicos";
import { breadcrumbJsonLd, faqJsonLd, pageMeta, webPageJsonLd } from "@/content/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return PUBLICOS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/para/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = publico(slug);
  if (!p) return {};
  return pageMeta({ title: p.metaTitle, description: p.metaDescription, path: `/para/${p.slug}` });
}

export default async function PublicoPage({ params }: PageProps<"/para/[slug]">) {
  const { slug } = await params;
  const p = publico(slug);
  if (!p) notFound();
  const path = `/para/${p.slug}`;
  const META = { title: p.metaTitle, description: p.metaDescription, path };
  const artigos = p.articles.map((s) => ARTICLES.find((a) => a.slug === s)).filter((a) => a !== undefined);
  const outros = PUBLICOS_LINKS.filter((l) => l.href !== path);
  return (
    <>
      <JsonLd data={[webPageJsonLd(META), breadcrumbJsonLd([{ name: "Para quem", path: "/para" }, { name: p.rotulo, path }]), faqJsonLd(p.faq)]} />
      <section className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><Link href="/para">PARA QUEM</Link><span className="sep">→</span><span>{p.nome.toUpperCase()}</span></div>
          <h1 style={{ marginTop: 24 }}>{p.h1}</h1>
          <p className="lead">{p.definition}</p>
          <Image className="brand-editorial-image" src="/brand/images/fluxo-azul.webp" alt="Maquete conceitual de três etapas conectadas por um percurso azul, representando o método EGD." width={1536} height={1024} sizes="(max-width: 800px) 100vw, 1180px" />
        </div>
      </section>

      <section className="brand-section container">
        <div className="brand-section-heading"><span className="brand-label">O que trava a operação</span><div><h2>Seis problemas que se repetem<br />em quem faz {p.nome.toLowerCase() === "construtoras" ? "obra" : p.nome.toLowerCase() === "incorporadoras" ? "empreendimento" : "contrato"}.</h2><p>Cada um tem uma solução que já está em operação em outros clientes.</p></div></div>
        <div className="brand-problems">
          {p.problems.map((x) => <div key={x.t}><h3>{x.t}</h3><p>{x.d}</p></div>)}
        </div>
      </section>

      <section className="brand-section container" style={{ paddingTop: 0 }}>
        <div className="brand-section-heading"><span className="brand-label">O que entregamos</span><div><h2>Produtos prontos e automações,<br />ajustados à sua operação.</h2></div></div>
        <div className="brand-cards">
          {p.deliverables.map((d) => <Link href={d.href} key={d.href} className="brand-card"><h3>{d.t}</h3><p>{d.d}</p><span className="meta">Ver página <ArrowUR size={12} /></span></Link>)}
        </div>
      </section>

      <section className="brand-section container" style={{ paddingTop: 0 }}>
        <div className="brand-section-heading"><span className="brand-label">Para ler e usar</span><div><h2>Artigos e modelos<br />para o dia a dia.</h2></div></div>
        <div className="brand-cards">
          {artigos.map((a) => <Link href={`/artigos/${a.slug}`} key={a.slug} className="brand-card"><h3>{a.title}</h3><p>{a.description}</p><span className="meta">{a.readingMinutes} min de leitura · modelo em planilha</span></Link>)}
        </div>
      </section>

      <Faq items={p.faq} title={`Perguntas de quem toca ${p.nome.toLowerCase()}.`} />

      <section className="brand-section container" style={{ paddingTop: 0 }}>
        <div className="brand-section-heading"><span className="brand-label">Outros públicos</span><div><h2>Também trabalhamos com</h2></div></div>
        <div className="brand-cards">
          {outros.map((l) => <Link href={l.href} key={l.href} className="brand-card"><h3>{l.nome}</h3><p>{l.resumo}</p><span className="meta">{l.rotulo} <ArrowUR size={12} /></span></Link>)}
        </div>
      </section>

      <section className="cta-final">
        <div className="container">
          <div className="cta-card">
            <span className="eyebrow">VAMOS CONVERSAR</span>
            <h2 style={{ marginTop: 22 }}>{p.cta.title[0]}<br />{p.cta.title[1]}</h2>
            <p style={{ marginTop: 22, fontSize: 17, maxWidth: 620 }}>{p.cta.text}</p>
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
