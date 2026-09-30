import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * O relatório é uma folha de projeto: cabeçalho com o tipo do relatório,
 * seções numeradas e o carimbo no fim. Na impressão vira A4 (ver globals.css).
 */
export function ReportSheet({
  kind,
  title,
  subtitle,
  figure,
  figureLabel,
  figureTone,
  stamp,
  children,
}: {
  kind: string;
  title: string;
  subtitle?: ReactNode;
  figure?: ReactNode;
  figureLabel?: string;
  figureTone?: "danger";
  stamp: { k: string; v: string }[];
  children: ReactNode;
}) {
  return (
    <article aria-labelledby="relatorio-titulo" className="report-sheet flex flex-col rounded-sm border border-strong bg-card">
      <header className="report-head grid gap-6 border-b border-strong px-5 pt-7 pb-5 sm:grid-cols-[1fr_auto] md:px-8">
        <div className="min-w-0">
          <p className="font-mono text-[0.8125rem] tracking-wide text-signal-strong">{kind}</p>
          <h1 id="relatorio-titulo" className="mt-1.5 text-[1.75rem] leading-tight font-semibold tracking-tight [font-variation-settings:'wdth'_108]">
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {figure !== undefined && (
          <div className="sm:text-right">
            <div
              className={cn(
                "text-5xl leading-none font-semibold tracking-tighter tabular-nums [font-variation-settings:'wdth'_112]",
                figureTone === "danger" && "text-danger",
              )}
            >
              {figure}
            </div>
            {figureLabel && <p className="mt-1 text-[0.8125rem] text-faint">{figureLabel}</p>}
          </div>
        )}
      </header>
      {children}
      <Stamp cells={stamp} />
    </article>
  );
}

export function ReportSection({ n, title, aside, children }: { n: number; title: string; aside?: ReactNode; children: ReactNode }) {
  const id = `secao-${n}`;
  return (
    <section aria-labelledby={id} className="border-b border-border px-5 py-6 md:px-8">
      <h2 id={id} className="mb-3.5 flex flex-wrap items-baseline gap-x-2.5 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
        <span className="font-mono font-normal tracking-normal text-signal-strong">{String(n).padStart(2, "0")}</span>
        {title}
        {aside && <span className="ml-auto text-[0.8125rem] font-normal tracking-normal text-faint normal-case">{aside}</span>}
      </h2>
      {children}
    </section>
  );
}

/** Carimbo da prancha: quem, o quê e quando. */
export function Stamp({ cells }: { cells: { k: string; v: string }[] }) {
  return (
    <footer className="report-stamp mt-auto grid grid-cols-2 border-t border-strong sm:grid-cols-[1.6fr_1.6fr_1fr_0.8fr_1.4fr]">
      {cells.map((c) => (
        <div key={c.k} className="min-w-0 border-r border-b border-border px-3 py-2.5 last:col-span-2 last:border-r-0 sm:border-b-0 sm:last:col-span-1">
          <div className="text-[0.8125rem] font-medium text-faint">{c.k}</div>
          <div className="mt-0.5 font-mono text-[0.8125rem] leading-snug">{c.v}</div>
        </div>
      ))}
    </footer>
  );
}

/** Números em linha, separados por réguas. */
export function Figures({ items }: { items: { k: string; v: ReactNode; d?: ReactNode; tone?: "danger" | "warning"; small?: boolean }[] }) {
  return (
    <div className="report-figures grid grid-cols-2 border border-border md:grid-cols-4">
      {items.map((it) => (
        <div key={it.k} className="min-w-0 border-r border-b border-border px-4 py-3 last:border-r-0 md:border-b-0 [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r">
          <div className="text-[0.8125rem] font-medium text-muted-foreground">{it.k}</div>
          <div
            className={cn(
              "mt-1 font-semibold tracking-tight tabular-nums",
              it.small ? "mt-2 text-lg" : "text-2xl",
              it.tone === "danger" && "text-danger",
              it.tone === "warning" && "text-warning",
            )}
          >
            {it.v}
          </div>
          {it.d && <div className="mt-0.5 text-[0.8125rem] text-faint">{it.d}</div>}
        </div>
      ))}
    </div>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="py-1 text-sm text-muted-foreground">{children}</p>;
}
