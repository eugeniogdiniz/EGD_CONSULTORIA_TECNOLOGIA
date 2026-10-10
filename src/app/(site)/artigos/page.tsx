import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/site/json-ld";
import { ARTICLES } from "@/content/artigos";
import { articlesJsonLd, breadcrumbJsonLd, pageMeta, webPageJsonLd } from "@/content/seo";

const META = {
  title: "Artigos e modelos para contratos de engenharia",
  description: "Artigos práticos sobre RDO, medição de contrato, vistoria de obra, controle de documentos em consórcio e automação de relatórios, cada um com um modelo em planilha para baixar.",
  path: "/artigos",
};
export const metadata: Metadata = pageMeta(META);

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });

export default function ArtigosPage() {
  return (
    <>
      <JsonLd data={[webPageJsonLd({ kind: "CollectionPage", ...META }), breadcrumbJsonLd([{ name: "Artigos", path: META.path }]), articlesJsonLd(ARTICLES)]} />
      <section className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><span>ARTIGOS</span></div>
          <h1 style={{ marginTop: 24 }}>Artigos e modelos<br />para o dia a dia do contrato.</h1>
          <p className="lead">O que aprendemos em consórcios de engenharia, habitação e energia, em textos curtos e com um modelo em planilha para começar hoje. Uso livre.</p>
        </div>
      </section>
      <section className="section section-tight">
        <div className="container brand-cards">
          {ARTICLES.map((a) => (
            <Link href={`/artigos/${a.slug}`} key={a.slug} className="brand-card">
              <h2>{a.title}</h2>
              <p>{a.description}</p>
              <span className="meta"><time dateTime={a.published}>{fmt.format(new Date(a.published))}</time> · {a.readingMinutes} min · modelo em planilha</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
