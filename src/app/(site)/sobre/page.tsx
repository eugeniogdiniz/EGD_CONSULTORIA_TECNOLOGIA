import type { Metadata } from "next";
import { Cota, CtaBand, PageTitle, SheetSection } from "@/components/site/section";
import { LINHA_DO_TEMPO, PRINCIPIOS, SETORES } from "@/content/sobre";

export const metadata: Metadata = {
  title: "Sobre",
  description: "A EGD nasceu dentro de consórcios de engenharia e habitação, resolvendo controle de documentos, vistorias e relatórios.",
};

export default function SobrePage() {
  return (
    <>
      <PageTitle
        title="Engenharia que entrega código em produção."
        lead="A EGD nasceu dentro de consórcios de engenharia e habitação, resolvendo controle de documentos, vistorias e relatórios que consumiam a equipe. Continuamos fazendo isso, agora também com dados, painéis e IA."
      >
        <div className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-8 md:grid-cols-4">
          <Cota value="13" label="clientes" />
          <Cota value="27" label="sistemas em produção" />
          <Cota value="62" label="automações" />
          <Cota value="7" label="setores atendidos" />
        </div>
      </PageTitle>

      <SheetSection title="Como trabalhamos" lead="Princípios que mantemos mesmo quando dão trabalho, porque é aí que importam.">
        <div className="grid border-t border-border md:grid-cols-2">
          {PRINCIPIOS.map((p, i) => (
            <div key={p.titulo} className={`border-b border-border py-6 ${i % 2 === 0 ? "md:border-r md:pr-8" : "md:pl-8"}`}>
              <h3 className="type-h3">{p.titulo}</h3>
              <p className="mt-2 max-w-[30rem] text-muted-foreground">{p.texto}</p>
            </div>
          ))}
        </div>
      </SheetSection>

      <SheetSection title="Linha do tempo" lead="Cada frente surgiu para resolver um problema de um cliente que já existia." className="pt-0 md:pt-0">
        <ol className="ml-1.5 border-l border-strong">
          {LINHA_DO_TEMPO.map((ev, i) => (
            <li key={ev.ano} className="relative grid grid-cols-[80px_1fr] gap-4 pb-7 pl-6 last:pb-0">
              <span
                aria-hidden
                className={`absolute top-2 -left-[5px] size-[9px] rounded-full border ${i === LINHA_DO_TEMPO.length - 1 ? "border-signal bg-signal" : "border-foreground bg-card"}`}
              />
              <span className="type-data pt-[3px] text-muted-foreground">{ev.ano}</span>
              <div>
                <h3 className="text-base font-semibold">{ev.titulo}</h3>
                <p className="mt-1 max-w-[34rem] text-sm text-muted-foreground">{ev.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </SheetSection>

      <SheetSection title="Setores" lead="Onde os sistemas já estão em uso." className="pt-0 md:pt-0">
        <ul className="flex flex-wrap gap-2">
          {SETORES.map((s) => (
            <li key={s} className="rounded-sm border border-strong bg-card px-3 py-2 text-sm">
              {s}
            </li>
          ))}
        </ul>
      </SheetSection>

      <CtaBand title="Em 30 minutos de conversa dá para saber se faz sentido trabalharmos juntos." action={{ href: "/contato", label: "Falar com a EGD" }} />
    </>
  );
}
