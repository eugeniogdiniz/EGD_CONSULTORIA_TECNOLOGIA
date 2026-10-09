import type { Metadata } from "next";
import { SHOW_CASES } from "@/content/site";
import { breadcrumbJsonLd, faqJsonLd, pageMeta, productsJsonLd, webPageJsonLd } from "@/content/seo";
import { FAQ } from "@/content/faq";
import { JsonLd } from "@/components/site/json-ld";
import { Faq } from "@/components/site/faq";
import Link from "next/link";
import { Arrow } from "@/components/legacy/ui";
import { Visual } from "@/components/legacy/product-visual";
import { PRODUCTS_FULL } from "@/content/legacy-pages";

const META = {
  title: "Produtos: contratos, RH, vistorias e central de chamados",
  description: "Produtos prontos para a sua operação, implantados em semanas: gestão de contratos, gestão de RH, app de vistorias e fiscalização de obras e central de chamados.",
  path: "/produtos",
};
export const metadata: Metadata = pageMeta(META);

export default function ProdutosPage() {
  return (
    <>
      <JsonLd data={[webPageJsonLd({ kind: "CollectionPage", ...META }), breadcrumbJsonLd([{ name: "Produtos", path: META.path }]), productsJsonLd(), faqJsonLd(FAQ.produtos)]} />
      <section className="page-head">
        <div className="grid-bg"></div>
        <div className="container">
          <div className="reveal in">
            <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><span>PRODUTOS</span></div>
            <h1 style={{ marginTop: 24 }}>
              Produtos verticais —<br />
              <span className="italic-grad">implantação acelerada</span>.
            </h1>
            <p className="lead">Aceleradores construídos sobre Power Platform, AWS e open-source moderno. Implantação em semanas, customização sob medida, propriedade e dados sempre seus.</p>
          </div>
        </div>
      </section>

      <div className="product-page-list">
        {PRODUCTS_FULL.map((p) => (
          <article className="product-row reveal" key={p.id} id={p.id}>
            <div className="product-info">
              <div className="pidx">PRODUTO {p.num}/04 · <span className="tag tag-sm">{p.tag}</span></div>
              <h2>{p.title}</h2>
              <p className="lead">{p.lead}</p>
              <ul className="features">
                {p.features.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              <div className="svc-stack-card" style={{ marginTop: 12 }}>
                <div className="row"><span className="k">deploy</span><span className="v accent">{p.deploy}</span></div>
                <div className="row"><span className="k">áreas</span><span className="v">{p.scope}</span></div>
                <div className="row"><span className="k">stack</span><span className="v">{p.stack.join(" · ")}</span></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <Link href="/contato" className="btn btn-primary btn-sm">Solicitar demo <Arrow size={13} /></Link>
                {SHOW_CASES && <Link href="/cases" className="btn btn-ghost btn-sm">Ver caso real</Link>}
              </div>
            </div>
            <div className="product-visual">
              <Visual kind={p.visual} />
            </div>
          </article>
        ))}
      </div>

      <Faq items={FAQ.produtos} title="Perguntas frequentes sobre os produtos." />
      <section className="cta-final">
        <div className="container">
          <div className="cta-card reveal">
            <span className="eyebrow">PRECISA DE ALGO ESPECÍFICO?</span>
            <h2 style={{ marginTop: 22 }}>Construímos novos verticais<br />sob medida para sua operação.</h2>
            <div className="cta-actions">
              <Link href="/contato" className="btn btn-primary">Conversar sobre seu caso <Arrow /></Link>
              <Link href="/servicos" className="btn btn-ghost">Ver capacidades</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
