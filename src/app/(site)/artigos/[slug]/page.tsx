import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/legacy/ui";
import { JsonLd } from "@/components/site/json-ld";
import { ARTICLES, article, type ArticleBlock } from "@/content/artigos";
import { articleJsonLd, breadcrumbJsonLd, pageMeta, webPageJsonLd } from "@/content/seo";
import { SITE } from "@/content/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/artigos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = article(slug);
  if (!a) return {};
  const m = pageMeta({ title: a.title, description: a.description, path: `/artigos/${a.slug}` });
  return { ...m, openGraph: { ...m.openGraph, type: "article", publishedTime: a.published, modifiedTime: a.updated ?? a.published, authors: [SITE.founder.name] } };
}

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });

function Block({ b }: { b: ArticleBlock }) {
  if ("h2" in b) return <h2>{b.h2}</h2>;
  if ("p" in b) return <p>{b.p}</p>;
  if ("ul" in b) return <ul>{b.ul.map((i) => <li key={i}>{i}</li>)}</ul>;
  return <ol>{b.ol.map((i) => <li key={i}>{i}</li>)}</ol>;
}

export default async function ArtigoPage({ params }: PageProps<"/artigos/[slug]">) {
  const { slug } = await params;
  const a = article(slug);
  if (!a) notFound();
  const path = `/artigos/${a.slug}`;
  const others = ARTICLES.filter((o) => o.slug !== a.slug).slice(0, 2);
  return (
    <>
      <JsonLd data={[webPageJsonLd({ path, title: a.title, description: a.description }), breadcrumbJsonLd([{ name: "Artigos", path: "/artigos" }, { name: a.title, path }]), articleJsonLd(a)]} />
      <article>
        <section className="page-head">
          <div className="container">
            <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><Link href="/artigos">ARTIGOS</Link></div>
            <h1 style={{ marginTop: 24, maxWidth: 900 }}>{a.title}</h1>
            <div className="brand-article-meta">
              <span>Por <Link href={SITE.founder.path} rel="author">{SITE.founder.name}</Link>, EGD</span>
              <time dateTime={a.published}>{fmt.format(new Date(a.published))}</time>
              {a.updated && <span>Atualizado em <time dateTime={a.updated}>{fmt.format(new Date(a.updated))}</time></span>}
              <span>{a.readingMinutes} min de leitura</span>
            </div>
          </div>
        </section>
        <section className="section section-tight">
          <div className="container">
            <div className="brand-article">
              <p className="lead">{a.lead}</p>
              <div className="brand-download">
                <div><h2 style={{ margin: "0 0 6px" }}>{a.model.label.replace(/^Baixar modelo de /, "Modelo de ").replace(" (planilha)", "")}</h2><p>{a.model.what} Planilha .xlsx, sem cadastro.</p></div>
                <a href={a.model.file} download className="btn btn-primary btn-sm">{a.model.label} <Arrow size={13} /></a>
              </div>
              {a.blocks.map((b, i) => <Block key={i} b={b} />)}
              <div className="brand-download">
                <div><h2 style={{ margin: "0 0 6px" }}>Como a EGD ajuda</h2><p>{a.related.label}: o que fazemos quando a planilha deixa de bastar.</p></div>
                <Link href={a.related.href} className="btn btn-ghost btn-sm">Ver página <Arrow size={13} /></Link>
              </div>
              <div className="brand-download" style={{ background: "var(--bg-2)", borderColor: "var(--line)" }}>
                <div><h2 style={{ margin: "0 0 6px" }}>Sobre o autor</h2><p><strong>{SITE.founder.name}</strong>, {SITE.founder.jobTitle.toLowerCase()}. {SITE.founder.bio.replace(/^Fundador/, "Fundador")}</p></div>
                <Link href={SITE.founder.path} rel="author" className="btn btn-ghost btn-sm">Página do autor <Arrow size={13} /></Link>
              </div>
            </div>
          </div>
        </section>
      </article>
      <section className="brand-section container" style={{ paddingTop: 0 }}>
        <div className="brand-section-heading"><span className="brand-label">Continue lendo</span><div><h2>Outros artigos.</h2></div></div>
        <div className="brand-cards">
          {others.map((o) => <Link href={`/artigos/${o.slug}`} key={o.slug} className="brand-card"><h3>{o.title}</h3><p>{o.description}</p><span className="meta">{o.readingMinutes} min de leitura · modelo em planilha</span></Link>)}
        </div>
      </section>
    </>
  );
}
