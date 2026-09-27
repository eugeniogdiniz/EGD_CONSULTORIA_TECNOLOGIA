import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container, CtaBand, PageTitle, Status } from "@/components/site/section";
import { Folha } from "@/components/site/folha";
import { PRODUTOS } from "@/content/produtos";

export const metadata: Metadata = {
  title: "Produtos",
  description: "SIGD, sistema de campo, gestão de contratos e central de chamados: sistemas que já rodam em clientes, adaptados ao seu contrato.",
};

export default function ProdutosPage() {
  return (
    <>
      <PageTitle title="Sistemas que já rodam em clientes." lead="Quatro produtos adaptáveis ao seu contrato. Implantação em semanas, dados e código com você." />

      <Container>
        {PRODUTOS.map((p) => (
          <article key={p.slug} id={p.slug} className="grid scroll-mt-20 items-start gap-6 border-t border-border py-12 md:grid-cols-[5fr_7fr] md:gap-12">
            <div>
              <Status tone={p.status.tone}>{p.status.label}</Status>
              <h2 className="type-h2 mt-3">{p.titulo}</h2>
              <p className="type-lead mt-3 text-muted-foreground">{p.lead}</p>
              <ul className="mt-5 grid gap-2">
                {p.funcoes.map((f) => (
                  <li key={f} className="relative pl-4 text-muted-foreground before:absolute before:top-[0.65em] before:left-0 before:h-px before:w-2 before:bg-foreground">
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button render={<Link href="/contato" />}>Pedir uma demonstração</Button>
                {p.caseHref && (
                  <Button variant="outline" render={<Link href={p.caseHref} />}>
                    Ver case do URBHIS
                  </Button>
                )}
              </div>
            </div>
            <Folha
              title={p.demo.titulo}
              code={p.demo.codigo}
              carimbo={[
                { k: "Implantação", v: p.implantacao },
                { k: "Áreas", v: p.areas },
                { k: "Stack", v: p.stack },
              ]}
            >
              <div className="mt-4 overflow-hidden rounded-sm border border-border bg-card">
                <table className="w-full text-[0.8125rem]">
                  <thead>
                    <tr className="bg-subtle text-left text-muted-foreground">
                      {p.demo.colunas.map((c) => (
                        <th key={c} className="h-9 px-3 font-medium">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {p.demo.linhas.map((l, i) => (
                      <tr key={i} className="border-t border-border">
                        {l.cells.map((c, j) => (
                          <td key={j} className={`h-9 px-3 ${typeof c === "string" && /^[\d—R/-]+$|dias$/.test(c) ? "type-data" : ""}`}>
                            {typeof c === "string" ? c : <Status tone={c.status}>{c.label}</Status>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {p.demo.nota && <p className="mt-3 text-[0.8125rem] text-faint">{p.demo.nota}</p>}
            </Folha>
          </article>
        ))}
      </Container>

      <CtaBand
        title="Precisa de algo que não está aqui?"
        text="Construímos sob medida a partir do que já existe. Conte o caso e respondemos em até um dia útil."
        action={{ href: "/contato", label: "Conversar sobre o seu caso" }}
      />
    </>
  );
}
