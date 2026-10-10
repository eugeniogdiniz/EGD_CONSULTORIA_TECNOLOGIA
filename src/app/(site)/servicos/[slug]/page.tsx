import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow, Icon } from "@/components/legacy/ui";
import { Faq } from "@/components/site/faq";
import { JsonLd } from "@/components/site/json-ld";
import { article } from "@/content/artigos";
import { SERVICE_DETAILS, serviceBase, serviceDetail } from "@/content/servicos-detalhe";
import { breadcrumbJsonLd, faqJsonLd, pageMeta, serviceJsonLd, webPageJsonLd } from "@/content/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return SERVICE_DETAILS.map((s) => ({ slug: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/servicos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = serviceDetail(slug);
  if (!d) return {};
  return pageMeta({ title: d.metaTitle, description: d.metaDescription, path: `/servicos/${d.id}` });
}

export default async function ServicoPage({ params }: PageProps<"/servicos/[slug]">) {
  const { slug } = await params;
  const d = serviceDetail(slug);
  const s = serviceBase(slug);
  if (!d || !s) notFound();
  const path = `/servicos/${s.id}`;
  const related = d.article ? article(d.article) : undefined;
  const stack = [["AWS", s.stack.aws], ["Azure", s.stack.azure], ["Apache", s.stack.apache], ["Outros", s.stack.outros]].filter(([, v]) => v.length > 0) as [string, string[]][];
  return (
    <>
      <JsonLd data={[webPageJsonLd({ path, title: d.metaTitle, description: d.metaDescription }), breadcrumbJsonLd([{ name: "Serviços", path: "/servicos" }, { name: s.title, path }]), serviceJsonLd(s, { standalone: true }), faqJsonLd(d.faq)]} />
      <section className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><Link href="/servicos">SERVIÇOS</Link><span className="sep">→</span><span>{s.num}/06</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24 }}>
            <div className="icon-tile lg accent"><Icon d={s.icon} size={26} /></div>
            <h1>{s.title}</h1>
          </div>
          <p className="lead">{d.definition}</p>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container brand-detail">
          <div>
            <div className="brand-block" style={{ marginTop: 0 }}>
              <h2>Problemas que esta frente resolve</h2>
              <ul className="brand-list">{d.problems.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
            <div className="brand-block">
              <h2>O que entregamos</h2>
              <ol className="brand-steps">{s.capabilities.map((c) => <li key={c.t}><div><h3>{c.t}</h3><p>{c.d}</p></div></li>)}</ol>
            </div>
            {related && (
              <div className="brand-download">
                <div><h2>Leia também</h2><p>{related.title}</p></div>
                <Link href={`/artigos/${related.slug}`} className="btn btn-ghost btn-sm">Ler o artigo <Arrow size={13} /></Link>
              </div>
            )}
          </div>
          <aside className="brand-detail-aside" aria-label="Resumo do serviço">
            <h2>Em resumo</h2>
            <div className="row"><span className="k">Primeira entrega</span><span className="v">{s.delivery}</span></div>
            <div className="row"><span className="k">Equipe</span><span className="v">{s.squad}</span></div>
            {stack.map(([k, v]) => <div className="row" key={k}><span className="k">{k}</span><span className="v">{v.join(" · ")}</span></div>)}
            <Link href="/contato" className="btn btn-primary">Agendar conversa <Arrow /></Link>
          </aside>
        </div>
      </section>

      <Faq items={d.faq} title={`Perguntas sobre ${s.title.toLowerCase()}.`} />

      <section className="cta-final">
        <div className="container">
          <div className="cta-card">
            <span className="eyebrow">PRÓXIMO PASSO</span>
            <h2 style={{ marginTop: 22 }}>Conte o problema. A gente diz por onde começar.</h2>
            <p style={{ marginTop: 22, fontSize: 17, maxWidth: 620 }}>Em 30 minutos mapeamos gargalos e oportunidades. Sem compromisso.</p>
            <div className="cta-actions">
              <Link href="/contato" className="btn btn-primary">Agendar conversa <Arrow /></Link>
              <Link href="/servicos" className="btn btn-ghost">Ver todas as frentes</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
