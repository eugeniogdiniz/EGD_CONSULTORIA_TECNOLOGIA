import type { Metadata } from "next";
import Link from "next/link";
import { Container, CtaBand, PageTitle } from "@/components/site/section";
import { SERVICOS } from "@/content/servicos";

export const metadata: Metadata = {
  title: "Serviços",
  description: "Desenvolvimento de sistemas, automação, dados e painéis, agentes de IA, governança e gestão de projetos de tecnologia.",
};

export default function ServicosPage() {
  return (
    <>
      <PageTitle title="Do sistema ao painel, com a mesma equipe." lead="Seis frentes de trabalho. Cada uma tem escopo, prazo típico e a stack que usamos de fato.">
        <nav aria-label="Serviços nesta página" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {SERVICOS.map((s) => (
            <a key={s.slug} href={`#${s.slug}`} className="font-medium text-link underline decoration-1 underline-offset-[3px] hover:text-signal-strong">
              {s.titulo}
            </a>
          ))}
        </nav>
      </PageTitle>

      <Container>
        {SERVICOS.map((s) => (
          <article key={s.slug} id={s.slug} className="grid scroll-mt-20 gap-6 border-t border-border py-10 md:grid-cols-[3fr_6fr_3fr] md:pb-12">
            <div>
              <h2 className="type-h2">{s.titulo}</h2>
              <p className="type-lead mt-3 text-muted-foreground">{s.lead}</p>
            </div>
            <ul className="grid content-start gap-2">
              {s.entregas.map((e) => (
                <li key={e} className="relative pl-4 text-muted-foreground before:absolute before:top-[0.65em] before:left-0 before:h-px before:w-2 before:bg-foreground">
                  {e}
                </li>
              ))}
            </ul>
            <dl className="h-fit rounded-lg border border-border bg-card text-sm">
              <div className="border-b border-border px-4 py-3">
                <dt className="type-micro text-faint">Stack</dt>
                <dd className="mt-0.5">{s.stack}</dd>
              </div>
              <div className="px-4 py-3">
                <dt className="type-micro text-faint">Prazo típico</dt>
                <dd className="mt-0.5">{s.prazo}</dd>
              </div>
            </dl>
          </article>
        ))}
      </Container>

      <CtaBand
        title="Qual dessas frentes resolve o problema de hoje?"
        text="Respondemos em até um dia útil com uma leitura inicial e os próximos passos."
        action={{ href: "/contato", label: "Falar com a EGD" }}
        secondary={
          <Link href="/produtos" className="font-medium text-card underline decoration-1 underline-offset-[3px] hover:text-card/80">
            Ver produtos prontos
          </Link>
        }
      />
    </>
  );
}
