import type { Metadata } from "next";
import { Container, Cota, CtaBand, PageTitle, SheetSection, Status } from "@/components/site/section";
import { CLIENTES, TOTAIS, brl, brlCurto } from "@/content/cases";

export const metadata: Metadata = {
  title: "Cases",
  description: "13 clientes, 27 sistemas, 62 automações. Porte, escopo, investimento e economia anual de cada projeto.",
};

export default function CasesPage() {
  const destaques = CLIENTES.filter((c) => c.destaque);
  const ordenados = [...CLIENTES].sort((a, b) => b.economia - a.economia);
  return (
    <>
      <PageTitle
        title={`${TOTAIS.clientes} clientes, ${TOTAIS.sistemas} sistemas, ${TOTAIS.automacoes} automações.`}
        lead="Cada projeto entregue tem porte, escopo, investimento e economia anual registrados. A tabela abaixo reproduz a planilha de CAPEX de cada cliente."
      >
        <div className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-8 md:grid-cols-4">
          <Cota value={String(TOTAIS.clientes)} label="clientes atendidos" />
          <Cota value={String(TOTAIS.sistemas)} label="sistemas em produção" />
          <Cota value={String(TOTAIS.automacoes)} label="automações entregues" />
          <Cota value={brlCurto(TOTAIS.economia)} suffix="/ano" label="em economia medida" />
        </div>
      </PageTitle>

      <SheetSection title="Destaques" lead="Os três projetos com maior economia anual medida.">
        <div className="grid gap-6 md:grid-cols-3">
          {destaques.map((c) => (
            <article key={c.id} id={c.id} className="scroll-mt-20 overflow-hidden rounded-lg border border-border bg-card">
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
                <div><div className="carimbo-k">Porte</div><div className="carimbo-v">{c.porte}</div></div>
              </div>
            </article>
          ))}
        </div>
      </SheetSection>

      <Container className="pb-4">
        <div className="sheet-head">
          <h2 className="type-h2">Todos os projetos</h2>
          <p className="type-lead max-w-[38rem] text-muted-foreground">Ordenados por economia anual. Investimento é a parcela de desenvolvimento.</p>
        </div>
        <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">Clientes, sistemas, automações, investimento e economia anual</caption>
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th scope="col" className="h-10 px-4 font-medium">Cliente</th>
                <th scope="col" className="h-10 px-4 font-medium">Setor</th>
                <th scope="col" className="h-10 px-4 font-medium">Porte</th>
                <th scope="col" className="h-10 px-4 text-right font-medium">Sist.</th>
                <th scope="col" className="h-10 px-4 text-right font-medium">Autom.</th>
                <th scope="col" className="h-10 px-4 text-right font-medium">Investimento</th>
                <th scope="col" className="h-10 px-4 text-right font-medium">Economia/ano</th>
                <th scope="col" className="h-10 px-4 text-right font-medium">Retorno 12 m</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((c) => {
                const roi = c.capex > 0 ? Math.round((c.economia / c.capex) * 100) : 0;
                return (
                  <tr key={c.id} id={c.destaque ? undefined : c.id} className="border-t border-border hover:bg-subtle">
                    <td className="h-12 px-4 font-medium whitespace-nowrap">{c.nome}</td>
                    <td className="h-12 px-4 text-muted-foreground">{c.setor}</td>
                    <td className="h-12 px-4">{c.status ? <Status tone="warn">{c.status}</Status> : c.porte}</td>
                    <td className="type-data h-12 px-4 text-right">{c.sistemas}</td>
                    <td className="type-data h-12 px-4 text-right">{c.automacoes}</td>
                    <td className="type-data h-12 px-4 text-right text-muted-foreground">{c.capex > 0 ? brl(c.capex) : "—"}</td>
                    <td className="type-data h-12 px-4 text-right">{c.economia > 0 ? brl(c.economia) : <span className="text-faint">em curso</span>}</td>
                    <td className="type-data h-12 px-4 text-right">{roi > 0 ? `${roi}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-strong bg-subtle font-medium">
                <td className="h-12 px-4" colSpan={3}>Totais</td>
                <td className="type-data h-12 px-4 text-right">{TOTAIS.sistemas}</td>
                <td className="type-data h-12 px-4 text-right">{TOTAIS.automacoes}</td>
                <td className="h-12 px-4" />
                <td className="type-data h-12 px-4 text-right">{brl(TOTAIS.economia)}</td>
                <td className="h-12 px-4" />
              </tr>
            </tfoot>
          </table>
          <div className="flex flex-wrap gap-6 border-t border-border px-4 py-3 text-[0.8125rem] text-faint">
            <span>Investimento = parcela de desenvolvimento, à vista ou diluída em 12 a 24 meses.</span>
            <span>Economia = horas por mês eliminadas × custo do responsável × 12.</span>
          </div>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Publicamos novos cases aqui conforme concluímos projetos.</p>
      </Container>

      <CtaBand title="Seu projeto entra na próxima linha desta tabela." text="Diagnóstico, escopo e proposta em até um dia útil, com investimento e economia estimada por escrito." action={{ href: "/contato", label: "Falar com a EGD" }} />
    </>
  );
}
