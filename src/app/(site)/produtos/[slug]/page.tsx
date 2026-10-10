import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow } from "@/components/legacy/ui";
import { Visual } from "@/components/legacy/product-visual";
import { Faq } from "@/components/site/faq";
import { JsonLd } from "@/components/site/json-ld";
import { article } from "@/content/artigos";
import { PRODUCT_DETAILS, productBase, productDetail } from "@/content/produtos-detalhe";
import { breadcrumbJsonLd, faqJsonLd, pageMeta, productJsonLd, webPageJsonLd } from "@/content/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return PRODUCT_DETAILS.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/produtos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = productDetail(slug);
  if (!d) return {};
  return pageMeta({ title: d.metaTitle, description: d.metaDescription, path: `/produtos/${d.id}` });
}

export default async function ProdutoPage({ params }: PageProps<"/produtos/[slug]">) {
  const { slug } = await params;
  const d = productDetail(slug);
  const p = productBase(slug);
  if (!d || !p) notFound();
  const path = `/produtos/${p.id}`;
  const related = d.article ? article(d.article) : undefined;
  return (
    <>
      <JsonLd data={[webPageJsonLd({ path, title: d.metaTitle, description: d.metaDescription }), breadcrumbJsonLd([{ name: "Produtos", path: "/produtos" }, { name: p.title, path }]), productJsonLd(p, { standalone: true }), faqJsonLd(d.faq)]} />
      <section className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><Link href="/produtos">PRODUTOS</Link><span className="sep">→</span><span>{p.tag}</span></div>
          <h1 style={{ marginTop: 24 }}>{p.title}</h1>
          <p className="lead">{d.definition}</p>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container brand-detail">
          <div>
            <div className="brand-block" style={{ marginTop: 0 }}>
              <h2>O que o sistema faz</h2>
              <ul className="brand-list">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
            <div className="brand-block">
              <h2>Para quem é</h2>
              <ul className="brand-list">{d.forWhom.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
            <div className="brand-block">
              <h2>Como a implantação acontece</h2>
              <ol className="brand-steps">{d.steps.map((s) => <li key={s.t}><div><h3>{s.t}</h3><p>{s.d}</p></div></li>)}</ol>
            </div>
            {related && (
              <div className="brand-download">
                <div><h2>Leia também</h2><p>{related.title}</p></div>
                <Link href={`/artigos/${related.slug}`} className="btn btn-ghost btn-sm">Ler o artigo <Arrow size={13} /></Link>
              </div>
            )}
          </div>
          <aside className="brand-detail-aside" aria-label="Resumo do produto">
            <h2>Em resumo</h2>
            <div className="row"><span className="k">Implantação</span><span className="v">{p.deploy}</span></div>
            <div className="row"><span className="k">Áreas</span><span className="v">{p.scope}</span></div>
            <div className="row"><span className="k">Stack</span><span className="v">{p.stack.join(" · ")}</span></div>
            <div className="row"><span className="k">Investimento</span><span className="v">Sob proposta</span></div>
            <Link href="/contato" className="btn btn-primary">Solicitar demonstração <Arrow /></Link>
            <div style={{ marginTop: 28 }} aria-hidden="true"><Visual kind={p.visual} /></div>
          </aside>
        </div>
      </section>

      <Faq items={d.faq} title={`Perguntas sobre ${p.title.toLowerCase()}.`} />

      <section className="cta-final">
        <div className="container">
          <div className="cta-card">
            <span className="eyebrow">PRÓXIMO PASSO</span>
            <h2 style={{ marginTop: 22 }}>Veja o sistema com os seus dados.</h2>
            <p style={{ marginTop: 22, fontSize: 17, maxWidth: 620 }}>Em 30 minutos mostramos o produto com um caso parecido com o seu e dizemos o que muda na implantação.</p>
            <div className="cta-actions">
              <Link href="/contato" className="btn btn-primary">Agendar demonstração <Arrow /></Link>
              <Link href="/produtos" className="btn btn-ghost">Ver todos os produtos</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
