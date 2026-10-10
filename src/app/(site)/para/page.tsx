import type { Metadata } from "next";
import Link from "next/link";
import { Arrow, ArrowUR } from "@/components/legacy/ui";
import { JsonLd } from "@/components/site/json-ld";
import { PUBLICOS_LINKS } from "@/content/publicos";
import { breadcrumbJsonLd, pageMeta, webPageJsonLd } from "@/content/seo";
import { SITE } from "@/content/site";

const META = {
  title: "Para quem: consórcios, construtoras, incorporadoras e engenharia",
  description: "A EGD atende consórcios de engenharia, construtoras, incorporadoras e empresas de engenharia consultiva com sistemas de gestão, apps de campo e automação de relatórios.",
  path: "/para",
};
export const metadata: Metadata = pageMeta(META);

export default function ParaQuemPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Públicos atendidos pela EGD",
    itemListElement: PUBLICOS_LINKS.map((l, i) => ({ "@type": "ListItem", position: i + 1, name: l.nome, url: `${SITE.url}${l.href}` })),
  };
  return (
    <>
      <JsonLd data={[webPageJsonLd({ kind: "CollectionPage", ...META }), breadcrumbJsonLd([{ name: "Para quem", path: META.path }]), itemList]} />
      <section className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><span>PARA QUEM</span></div>
          <h1 style={{ marginTop: 24 }}>Para quem a EGD trabalha.</h1>
          <p className="lead">Quatro públicos que executam contratos de engenharia e precisam controlar documentos, vistorias, medições e relatórios sem planilhas espalhadas. Cada página fala dos problemas de quem toca aquela operação e do que a EGD entrega para cada um.</p>
        </div>
      </section>

      <section className="brand-section container">
        <div className="brand-cards">
          {PUBLICOS_LINKS.map((l) => <Link href={l.href} key={l.href} className="brand-card"><h2>{l.nome}</h2><p>{l.resumo}</p><span className="meta">{l.rotulo} <ArrowUR size={12} /></span></Link>)}
        </div>
      </section>

      <section className="cta-final">
        <div className="container">
          <div className="cta-card">
            <span className="eyebrow">NÃO SE ENCAIXA EM NENHUM?</span>
            <h2 style={{ marginTop: 22 }}>Conte a sua operação.<br />A gente diz se faz sentido.</h2>
            <p style={{ marginTop: 22, fontSize: 17, maxWidth: 620 }}>A mesma base de produtos e automações atende áreas de operação em outros setores, como energia e infraestrutura.</p>
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
