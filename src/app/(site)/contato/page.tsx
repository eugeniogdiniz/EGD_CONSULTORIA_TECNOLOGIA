import type { Metadata } from "next";
import { pageMeta } from "@/content/seo";
import Link from "next/link";
import { ContactForm } from "@/components/legacy/contact-form";
import { SITE } from "@/content/site";

export const metadata: Metadata = pageMeta({
  title: "Fale com a EGD",
  description: "Conte o seu desafio e respondemos em até 48h úteis. Atendimento de segunda a sexta, das 9h às 18h (horário de Brasília), com trabalho remoto em todo o Brasil.",
  path: "/contato",
});

export default function ContatoPage() {
  return (
    <>
      <section className="page-head">
        <div className="grid-bg"></div>
        <div className="container">
          <div className="reveal in">
            <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><span>CONTATO</span></div>
            <h1 style={{ marginTop: 24 }}>
              Conta o seu desafio —<br />
              <span className="italic-grad">respondemos em 48h</span>.
            </h1>
            <p className="lead">Quanto mais contexto você der, mais útil será nosso retorno. Se preferir, escreva direto: {SITE.email}</p>
          </div>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container">
          <div className="contact-grid">
            <ContactForm />

            <div className="contact-info reveal">
              <div className="ci-block">
                <h4 aria-level={2}>E-mail</h4>
                <div className="v">{SITE.email}</div>
                <div className="d">Resposta em até 48h úteis.</div>
              </div>
              <div className="ci-block">
                <h4 aria-level={2}>Atendimento</h4>
                <div className="v">Seg–Sex · 9h às 18h</div>
                <div className="d">Horário de Brasília (BRT).</div>
              </div>
              <div className="ci-block">
                <h4 aria-level={2}>Endereço</h4>
                <div className="v">São Paulo · BR</div>
                <div className="d">Atuamos remoto em todo o Brasil. Presencial sob demanda.</div>
              </div>
              <div className="ci-block">
                <h4 aria-level={2}>Portal do cliente</h4>
                <div className="v">egdsystem.com.br/portal</div>
                <div className="d">Acompanhamento de projetos e documentos para clientes com acesso.</div>
                <Link href="/entrar" className="btn btn-ghost btn-sm" style={{ marginTop: 14 }}>Entrar no portal</Link>
              </div>

              <div className="terminal" style={{ marginTop: 8 }}>
                <div className="term-head">
                  <div className="term-dots"><i></i><i></i><i></i></div>
                  <div className="term-title">~ /egd/status</div>
                  <div className="term-meta">live</div>
                </div>
                <div className="term-body" style={{ minHeight: 0 }}>
                  <div className="ln"><span className="lno">01</span><div><span className="prompt">$ </span><span>curl status.egdsystem.com.br</span></div></div>
                  <div className="ln"><span className="lno">02</span><div><span className="out">→ all systems </span><span className="ok">[ OK ]</span></div></div>
                  <div className="ln"><span className="lno">03</span><div><span className="out">→ avg response: </span><span className="num">31h</span></div></div>
                  <div className="ln"><span className="lno">04</span><div><span className="out">→ booking slots open: </span><span className="num">7</span><span className="out"> / próx. 14d</span></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
