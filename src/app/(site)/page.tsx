import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container, Cota, CtaBand, SheetSection, Status } from "@/components/site/section";
import { Folha, Fluxo, CotaSvg } from "@/components/site/folha";
import { METRICS, METRICS_NOTE, SITE } from "@/content/site";
import { SERVICOS } from "@/content/servicos";
import { PRODUTOS } from "@/content/produtos";
import { CLIENTES, brlCurto } from "@/content/cases";

const FLUXO = [
  { titulo: "Campo", texto: "App de vistoria, fotos com localização" },
  { titulo: "SIGD", texto: "Documentos, revisões, aprovações" },
  { titulo: "Relatórios", texto: "Gerados e enviados por rotina" },
  { titulo: "Painel", texto: "Power BI por contrato e região" },
];

export default function HomePage() {
  const destaques = CLIENTES.filter((c) => c.destaque);
  return (
    <>
      <Container className="pt-10 pb-14 md:pt-18 md:pb-14">
        <div className="grid items-start gap-10 md:grid-cols-2 md:gap-12">
          <div>
            <h1 className="type-display max-w-[14ch]">Sistemas e automação para quem gerencia obras, contratos e habitação.</h1>
            <p className="type-lead mt-6 max-w-[38rem] text-muted-foreground">
              Construímos sistemas de gestão documental, aplicativos de campo e relatórios automáticos para consórcios de
              engenharia, habitação e energia. Cada projeto entra em produção com custo e economia registrados em planilha.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" render={<Link href="/contato" />}>
                Conversar sobre um projeto
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/cases" />}>
                Ver os cases
              </Button>
            </div>
          </div>
          <Folha
            title="Fluxo de dados de um consórcio de habitação"
            code="FL-01"
            label="Folha de projeto: fluxo de dados de um consórcio de habitação"
            carimbo={[
              { k: "Projeto", v: "SIGD + sistema de campo" },
              { k: "Cliente", v: "Consórcio URBHIS" },
              { k: "Folha", v: "1/1" },
              { k: "Rev.", v: "03" },
              { k: "Status", v: <Status tone="ok">Em produção</Status> },
            ]}
          >
            <Fluxo nos={FLUXO} />
            <CotaSvg text="12 automações, 4 sistemas, 1 consórcio" />
          </Folha>
        </div>

        <div className="mt-14 border-t border-border pt-8 md:mt-16">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {METRICS.map((m) => (
              <Cota key={m.label} value={m.value} suffix={"suffix" in m ? m.suffix : undefined} label={m.label} />
            ))}
          </div>
          <p className="mt-5 max-w-[60ch] text-[0.8125rem] text-faint">{METRICS_NOTE}</p>
        </div>
      </Container>

      <SheetSection
        title="O que entregamos"
        lead="Seis frentes que funcionam sozinhas ou combinadas. Em todas, o código, os dados e os acessos ficam com você."
        aside={{ href: "/servicos", label: "Ver todos os serviços" }}
      >
        <div className="grid border-t border-border md:grid-cols-2">
          {SERVICOS.map((s, i) => (
            <Link
              key={s.slug}
              href={`/servicos#${s.slug}`}
              className={`group block border-b border-border py-6 text-foreground hover:text-foreground ${i % 2 === 0 ? "md:border-r md:pr-8" : "md:pl-8"}`}
            >
              <h3 className="type-h3 group-hover:text-signal-strong">{s.titulo}</h3>
              <p className="mt-2 max-w-[30rem] text-muted-foreground">{s.resumo}</p>
            </Link>
          ))}
        </div>
      </SheetSection>

      <SheetSection
        title="Produtos prontos para implantar"
        lead="Sistemas que já rodam em clientes. Adaptamos ao seu contrato em semanas."
        aside={{ href: "/produtos", label: "Ver os produtos" }}
        className="pt-0 md:pt-0"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {PRODUTOS.map((p) => (
            <Link key={p.slug} href={`/produtos#${p.slug}`} className="group flex flex-col gap-2.5 rounded-lg border border-border bg-card p-6 text-foreground hover:border-strong hover:text-foreground">
              <h3 className="type-h3 group-hover:text-signal-strong">{p.titulo}</h3>
              <p className="text-muted-foreground">{p.resumo}</p>
              <div className="mt-auto pt-3">
                <Status tone={p.status.tone}>{p.status.label}</Status>
              </div>
            </Link>
          ))}
        </div>
      </SheetSection>

      <SheetSection
        title="Onde já está rodando"
        lead="Consórcios de habitação e engenharia, operações de energia e regularização fundiária. Detalhes, custos e economia de cada projeto na página de cases."
        aside={{ href: "/cases", label: "Ver todos os cases" }}
        className="pt-0 md:pt-0"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {destaques.map((c) => (
            <article key={c.id} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="p-5 pb-4">
                <h3 className="type-h3">{c.nome}</h3>
                <p className="text-sm text-muted-foreground">{c.setor}</p>
                <div className="mt-3 text-[1.75rem] font-semibold tracking-[-0.02em] tabular-nums [font-variation-settings:'wdth'_106]"><span className="whitespace-nowrap">
                  {brlCurto(c.economia)}</span>
                  <small className="ml-1.5 text-sm font-normal text-muted-foreground [font-variation-settings:'wdth'_100]">por ano</small>
                </div>
                <ul className="mt-3 list-disc pl-4 text-sm text-muted-foreground">
                  {c.entregas.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
              <div className="carimbo grid-cols-[1fr_1fr_1.5fr]">
                <div><div className="carimbo-k">Sistemas</div><div className="carimbo-v">{c.sistemas}</div></div>
                <div><div className="carimbo-k">Automações</div><div className="carimbo-v">{c.automacoes}</div></div>
                <div><div className="carimbo-k">Status</div><div className="carimbo-v"><Status tone="ok">Produção</Status></div></div>
              </div>
            </article>
          ))}
        </div>
      </SheetSection>

      <CtaBand
        title="Conte qual processo hoje toma mais tempo da sua equipe."
        text="Respondemos em até um dia útil com uma leitura inicial e os próximos passos."
        action={{ href: "/contato", label: "Falar com a EGD" }}
        secondary={
          <a href={`mailto:${SITE.email}`} className="type-data text-card hover:text-card/80">
            {SITE.email}
          </a>
        }
      />
    </>
  );
}
