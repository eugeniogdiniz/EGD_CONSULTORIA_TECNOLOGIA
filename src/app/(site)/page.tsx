import Image from "next/image";
import Link from "next/link";
import { ArrowUR } from "@/components/legacy/ui";
import { SVC, PRODUCTS } from "@/content/legacy-home";
import { TOTAIS } from "@/content/cases";
import { BrandFilm } from "@/components/site/brand-film";
import { OperationFlow } from "@/components/site/operation-flow";

export default function HomePage() {
  return (
    <>
      <section className="brand-hero container">
        <div className="brand-kicker"><span className="brand-dot" /> Consultoria &amp; tecnologia <span>São Paulo · Brasil</span></div>
        <div className="brand-hero-heading">
          <h1>Entre o desafio<br />e a próxima <em>entrega.</em></h1>
          <div className="brand-hero-intro">
            <p>Conectamos dados, sistemas e pessoas para transformar a operação. Da primeira conversa ao software em produção.</p>
            <Link href="/contato" className="btn btn-primary">Vamos construir juntos <ArrowUR /></Link>
          </div>
        </div>
        <figure className="brand-landscape">
          <Image src="/brand/images/territorio-azul.webp" alt="Maquete conceitual de infraestrutura, edifícios e energia conectados por um percurso azul." width={1536} height={1024} sizes="(max-width: 768px) 100vw, 1180px" priority />
          <figcaption><span>Do campo à decisão.</span><span>Engenharia + dados + sistemas</span></figcaption>
        </figure>
        <div className="brand-proof">
          <p>Experiência que<br /><strong>se traduz em operação.</strong></p>
          <div><strong>{TOTAIS.clientes}</strong><span>clientes no portfólio</span></div>
          <div><strong>{TOTAIS.sistemas}</strong><span>sistemas entregues</span></div>
          <div><strong>{TOTAIS.automacoes}</strong><span>automações entregues</span></div>
          <Link href="/cases">Conheça os cases <ArrowUR /></Link>
        </div>
      </section>

      <section className="brand-section container">
        <div className="brand-section-heading"><span className="brand-label">O que fazemos</span><div><h2>Complexidade na operação.<br />Clareza na solução.</h2><p>Um parceiro para conectar o que hoje está separado: processos, informação e tecnologia.</p></div></div>
        <div className="brand-services">
          {SVC.map((service) => <Link href={`/servicos#${service.id}`} key={service.id} className="brand-service"><h3>{service.title}</h3><p>{service.desc}</p><ArrowUR size={22} /></Link>)}
        </div>
      </section>

      <section className="brand-method">
        <div className="container brand-method-grid">
          <div><span className="brand-label">Como conectamos as pontas</span><h2>Entender o contexto.<br />Construir com método.<br /><em>Entregar o que importa.</em></h2><p>Começamos pelo processo real. Desenhamos a solução com o seu time e acompanhamos cada etapa até a operação.</p><Link className="btn btn-ghost" href="/sobre">Conheça a EGD <ArrowUR /></Link></div>
          <OperationFlow />
        </div>
      </section>

      <section className="brand-section container">
        <div className="brand-section-heading"><span className="brand-label">Produtos EGD</span><div><h2>Seu próximo passo<br />já tem um ponto de partida.</h2><p>Soluções para contratos, pessoas, vistorias e atendimento. Adaptadas ao contexto da sua empresa.</p></div></div>
        <div className="brand-products">
          {PRODUCTS.map((product, i) => <Link href={`/produtos#${product.id}`} key={product.id} className="brand-product"><span className="brand-product-symbol" aria-hidden="true">{["↗", "⊞", "⌖", "≋"][i]}</span><h3>{product.title}</h3><p>{product.desc}</p><span className="brand-product-link">Explorar solução <ArrowUR /></span></Link>)}
        </div>
      </section>

      <section className="brand-section container brand-film-section">
        <div><span className="brand-label">Nossa visão em movimento</span><h2>Tecnologia que aproxima<br />projeto e operação.</h2><p>Uma apresentação visual da EGD: entender, conectar e entregar.</p></div>
        <BrandFilm />
      </section>
      <section className="brand-cta container"><span className="brand-label">Vamos conversar</span><h2>Qual desafio vamos<br />transformar em entrega?</h2><Link className="btn btn-primary" href="/contato">Conte o seu projeto <ArrowUR size={20} /></Link><span className="brand-cta-note">Uma boa solução começa com uma boa conversa.</span></section>
    </>
  );
}
