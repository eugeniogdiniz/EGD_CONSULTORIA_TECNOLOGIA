import type { Metadata } from "next";
import { breadcrumbJsonLd, faqJsonLd, pageMeta, servicesJsonLd, webPageJsonLd } from "@/content/seo";
import { FAQ } from "@/content/faq";
import { JsonLd } from "@/components/site/json-ld";
import { Faq } from "@/components/site/faq";
import Link from "next/link";
import Image from "next/image";
import { Arrow, Icon } from "@/components/legacy/ui";
import { SERVICES } from "@/content/legacy-pages";

const META = {
  title: "Serviços de desenvolvimento, automação, dados e IA",
  description: "Desenvolvimento de sistemas, automação de processos, dados e painéis, agentes de IA, governança de dados e gestão de projetos para consórcios de engenharia, habitação e energia.",
  path: "/servicos",
};
export const metadata: Metadata = pageMeta(META);

export default function ServicosPage() {
  return (
    <>
      <JsonLd data={[webPageJsonLd({ kind: "CollectionPage", ...META }), breadcrumbJsonLd([{ name: "Serviços", path: META.path }]), servicesJsonLd(), faqJsonLd(FAQ.servicos)]} />
      <section className="page-head">
        <div className="grid-bg"></div>
        <div className="container">
          <div className="reveal in">
            <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><span>SERVIÇOS</span></div>
            <h1 style={{ marginTop: 24 }}>
              Tecnologia ponta-a-ponta —<br />
              do <span className="italic-grad">código</span> à decisão.
            </h1>
            <p className="lead">Seis frentes especializadas que somam capacidade de delivery sobre as principais clouds (AWS, Azure) e o ecossistema open-source moderno (Apache, Power Platform, Python).</p>
          </div>
          <div className="reveal" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 32 }}>
            {SERVICES.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="tag accent" style={{ padding: "8px 14px" }}>
                <span style={{ color: "var(--fg-faint)" }}>{s.num}</span> {s.title.split(" ")[0]}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="container"><Image className="brand-editorial-image" src="/brand/images/fluxo-azul.webp" alt="Representação conceitual de dados e sistemas conectados em um fluxo contínuo." width={1536} height={1024} sizes="(max-width: 800px) 100vw, 1180px" /></div>
      <section className="section">
        <div className="container">
          {SERVICES.map((s) => (
            <article className="svc-deep" id={s.id} key={s.id}>
              <div className="svc-deep-head">
                <div className="svc-deep-num">SERVIÇO {s.num}/06</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div className="icon-tile lg accent"><Icon d={s.icon} size={26} /></div>
                    <h2>{s.title}</h2>
                  </div>
                  <p className="lead">{s.lead}</p>
                </div>
              </div>
              <div className="svc-deep-body">
                <ul className="cap-list">
                  {s.capabilities.map((c, i) => (
                    <li key={i}>
                      <span className="cn">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <div className="ct">{c.t}</div>
                        <div className="cd">{c.d}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="svc-stack-card">
                  <div className="h">Stack &amp; delivery</div>
                  {s.stack.aws.length > 0 && <div className="row"><span className="k">AWS</span><span className="v">{s.stack.aws.join(" · ")}</span></div>}
                  {s.stack.azure.length > 0 && <div className="row"><span className="k">Azure</span><span className="v">{s.stack.azure.join(" · ")}</span></div>}
                  {s.stack.apache.length > 0 && <div className="row"><span className="k">Apache</span><span className="v">{s.stack.apache.join(" · ")}</span></div>}
                  {s.stack.outros.length > 0 && <div className="row"><span className="k">Outros</span><span className="v">{s.stack.outros.join(" · ")}</span></div>}
                  <div className="row" style={{ marginTop: 14 }}><span className="k">delivery</span><span className="v accent">{s.delivery}</span></div>
                  <div className="row"><span className="k">squad</span><span className="v">{s.squad}</span></div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Faq items={FAQ.servicos} title="Perguntas frequentes sobre os serviços." />
      <section className="cta-final">
        <div className="container">
          <div className="cta-card reveal">
            <span className="eyebrow">CONTATO</span>
            <h2 style={{ marginTop: 22 }}>Qual frente faz<br />sentido para o seu momento?</h2>
            <p style={{ marginTop: 22, fontSize: 17, maxWidth: 620 }}>Em 30 minutos podemos mapear gargalos e oportunidades. Sem compromisso.</p>
            <div className="cta-actions">
              <Link href="/contato" className="btn btn-primary">Agendar conversa <Arrow /></Link>
              <Link href="/produtos" className="btn btn-ghost">Ver produtos prontos</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
