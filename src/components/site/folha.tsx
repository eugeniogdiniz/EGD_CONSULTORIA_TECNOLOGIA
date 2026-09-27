import type { ReactNode } from "react";
import { cn } from "cn";

/** Folha de projeto: superfície com grade de 8 mm, título e carimbo no rodapé. */
export function Folha({
  title,
  code,
  children,
  carimbo,
  className,
  label,
}: {
  title: string;
  code: string;
  children: ReactNode;
  carimbo: { k: string; v: ReactNode }[];
  className?: string;
  label?: string;
}) {
  return (
    <figure className={cn("folha", className)} aria-label={label ?? title}>
      <div className="folha-grade" aria-hidden />
      <div className="relative p-5 md:p-7">
        <div className="flex justify-between gap-3 text-sm font-medium text-muted-foreground">
          <span>{title}</span>
          <span className="type-data text-faint">{code}</span>
        </div>
        {children}
      </div>
      <figcaption className="carimbo" style={{ gridTemplateColumns: `repeat(${carimbo.length}, minmax(0, 1fr))` }}>
        {carimbo.map((c) => (
          <div key={c.k}>
            <div className="carimbo-k">{c.k}</div>
            <div className="carimbo-v">{c.v}</div>
          </div>
        ))}
      </figcaption>
    </figure>
  );
}

/** Diagrama de blocos com setas; empilha no mobile. */
export function Fluxo({ nos }: { nos: { titulo: string; texto: string }[] }) {
  return (
    <div className="my-6 grid gap-0 sm:grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr] sm:items-center">
      {nos.map((n, i) => (
        <FluxoNo key={n.titulo} no={n} last={i === nos.length - 1} />
      ))}
    </div>
  );
}

function FluxoNo({ no, last }: { no: { titulo: string; texto: string }; last: boolean }) {
  return (
    <>
      <div className="min-h-0 rounded-sm border border-foreground bg-card p-3 sm:min-h-[76px]">
        <b className="block text-sm font-semibold">{no.titulo}</b>
        <span className="mt-1 block text-[0.8125rem] text-muted-foreground">{no.texto}</span>
      </div>
      {!last && (
        <div
          aria-hidden
          className="relative mx-auto h-5 w-px bg-foreground after:absolute after:-left-[3px] after:bottom-0 after:border-[3.5px] after:border-transparent after:border-t-[6px] after:border-t-foreground sm:mx-[-1px] sm:h-px sm:w-auto sm:after:top-[-3px] sm:after:right-0 sm:after:bottom-auto sm:after:left-auto sm:after:border-[3.5px] sm:after:border-transparent sm:after:border-l-[6px] sm:after:border-l-foreground sm:after:border-t-transparent"
        />
      )}
    </>
  );
}

/** Cota desenhada em SVG (anima uma vez no carregamento). */
export function CotaSvg({ text }: { text: string }) {
  return (
    <svg className="draw block h-[34px] w-full" viewBox="0 0 560 34" preserveAspectRatio="none" aria-hidden>
      <line x1="1" y1="10" x2="1" y2="30" stroke="var(--regua-500)" />
      <line x1="559" y1="10" x2="559" y2="30" stroke="var(--regua-500)" />
      <line x1="1" y1="20" x2="559" y2="20" stroke="var(--regua-500)" />
      <rect x="180" y="12" width="200" height="16" fill="var(--folha)" />
      <text x="280" y="24" textAnchor="middle" fontSize="12" fill="var(--tinta-600)" fontFamily="var(--font-sans)">
        {text}
      </text>
    </svg>
  );
}
