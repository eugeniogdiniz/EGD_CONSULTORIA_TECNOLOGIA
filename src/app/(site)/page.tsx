import Link from "next/link";
import { Arrow, Icon } from "@/components/legacy/ui";
import { Terminal } from "@/components/legacy/home/terminal";
import { Ticker } from "@/components/legacy/home/ticker";
import { DiagMini, ArchDiagram } from "@/components/legacy/home/diagrams";
import { FinalCTA } from "@/components/legacy/home/final-cta";
import { SVC, PRODUCTS, STACK_GROUPS } from "@/content/legacy-home";

export default function HomePage() {
  return (
    <>
      <section className="hero" id="top">
        <div className="hero-bg"></div>
        <div className="hero-grid"></div>
        <div className="container hero-inner">
          <div className="hero-grid-2col">
            <div>
              <div className="hero-status reveal in">
                <span className="status"><span className="dot"></span>Operando · 99.97%</span>
                <span className="eyebrow no-dot"><span style={{ color: "var(--fg-faint)" }}>v5.0</span> <span className="slash">/</span> SP · BR</span>
              </div>

              <h1 className="reveal in" style={{ marginTop: 28 }}>
                Engenharia de <span className="italic-grad">dados</span>,<br />
                sistemas e automação<br />
                que <span className="italic-grad">escalam</span>.
              </h1>

              <p className="hero-sub reveal in">
                Construímos plataformas, pipelines e produtos digitais sobre AWS, Azure e o stack Apache. Da arquitetura à entrega — com squads ágeis, governança e observabilidade desde o primeiro commit.
              </p>

              <div className="hero-cta reveal in">
                <Link href="/contato" className="btn btn-primary">Iniciar um projeto <Arrow /></Link>
                <Link href="/servicos" className="btn btn-ghost">Ver capacidades</Link>
              </div>

              <div className="hero-tickers reveal">
                <Ticker />
              </div>
            </div>

            <div className="hero-right reveal in">
              <Terminal />
              <div className="diag-mini">
                <DiagMini />
              </div>
            </div>
          </div>

          <div className="hero-meta reveal">
            <div className="meta-item"><div className="num">+120<small>%</small></div><div className="lbl">RETORNO MÉDIO EM AUTOMAÇÕES</div></div>
            <div className="meta-item"><div className="num">8<small>+</small></div><div className="lbl">ANOS DE CONSULTORIA</div></div>
            <div className="meta-item"><div className="num">40<small>+</small></div><div className="lbl">PROJETOS ENTREGUES</div></div>
            <div className="meta-item"><div className="num">99,9<small>%</small></div><div className="lbl">SLA MÉDIO DAS SOLUÇÕES</div></div>
          </div>
        </div>
      </section>

      <section className="section" id="servicos-preview">
        <div className="container">
          <div className="section-head row reveal">
            <div>
              <span className="eyebrow">SERVIÇOS · 06 FRENTES</span>
              <h2>Capacidades que cobrem<br />o ciclo completo de tecnologia.</h2>
              <p className="lead">Atuamos do código à arquitetura de decisão. Cada frente entrega valor isolada — ou soma capacidade quando combinada num programa de transformação.</p>
            </div>
            <Link href="/servicos" className="btn btn-ghost">Ver tudo <Arrow /></Link>
          </div>

          <div className="grid-services reveal">
            {SVC.map((s, i) => (
              <Link className="svc" key={s.id} href={`/servicos#${s.id}`}>
                <div className="svc-num">{String(i + 1).padStart(2, "0")} / 06</div>
                <div className="icon-tile"><Icon d={s.icon} /></div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <div className="svc-tags">
                  {s.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
                </div>
                <div className="svc-cta">explorar <Arrow size={12} /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ borderTop: "1px solid var(--line)", background: "var(--bg-2)" }}>
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">ARQUITETURA / FLUXO DE REFERÊNCIA</span>
            <h2>Da fonte ao agente,<br />em uma plataforma observável.</h2>
            <p className="lead">Pipeline padrão que aplicamos em projetos de dados — adaptado ao stack do cliente (AWS, Azure, ou híbrido) e à maturidade do time.</p>
          </div>

          <div className="arch-card reveal">
            <ArchDiagram />
            <div className="arch-legend">
              <div><span className="status"><span className="dot"></span>Stream</span> Apache Kafka, Kinesis, Event Hubs</div>
              <div><span className="status"><span className="dot"></span>Batch</span> Airflow, ADF, AWS Glue</div>
              <div><span className="status warn"><span className="dot"></span>ML/IA</span> Bedrock, Azure OpenAI, modelos próprios</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="produtos-preview">
        <div className="container">
          <div className="section-head row reveal">
            <div>
              <span className="eyebrow">PRODUTOS / VERTICAIS PRONTOS</span>
              <h2>Soluções verticais prontas<br />para implantação acelerada.</h2>
              <p className="lead">Aceleradores construídos sobre Power Platform, AWS e open-source moderno. Implantação em semanas, customização sob medida, dados sempre seus.</p>
            </div>
            <Link href="/produtos" className="btn btn-ghost">Catálogo completo <Arrow /></Link>
          </div>
          <div className="prod-preview-grid reveal">
            {PRODUCTS.map((p, i) => (
              <Link key={p.id} href={`/produtos#${p.id}`} className="prod-preview">
                <div className="pp-head">
                  <span className="pp-num">P/{String(i + 1).padStart(2, "0")}</span>
                  <span className="tag tag-sm">{p.tag}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <div className="pp-foot">ver detalhes <Arrow size={12} /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="stack" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">STACK / TECNOLOGIA</span>
            <h2>O ferramental que escolhemos<br />para mover sua operação.</h2>
            <p className="lead">Combinamos as principais clouds, o ecossistema Apache e Power Platform com open-source moderno. Tecnologia agnóstica — orientada ao seu contexto.</p>
          </div>

          <div className="stack-groups reveal">
            {STACK_GROUPS.map((g) => (
              <div className="stack-group" key={g.name}>
                <div className="sg-head">
                  <span className="sg-bullet" style={{ background: g.color }}></span>
                  <span className="sg-name">{g.name}</span>
                  <span className="sg-count">{g.items.length} ferramentas</span>
                </div>
                <div className="sg-grid">
                  {g.items.map((it) => (
                    <div className="sg-item" key={it.n}>
                      <div className="sg-n">{it.n}</div>
                      <div className="sg-d">{it.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
