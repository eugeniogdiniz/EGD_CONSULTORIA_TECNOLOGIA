import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "cn";

/** Container do site: 1180 px, padding lateral 20/24. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1180px] px-5 sm:px-6", className)}>{children}</div>;
}

/**
 * Seção em registro de folha: régua acima, título na coluna esquerda (3/12),
 * lead e conteúdo à direita (9/12). Substitui cabeçalho centralizado e eyebrow.
 */
export function SheetSection({
  id,
  title,
  lead,
  aside,
  children,
  className,
}: {
  id?: string;
  title: string;
  lead?: string;
  aside?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("py-16 md:py-24", className)}>
      <Container>
        <div className="sheet-head">
          <h2 className="type-h2">{title}</h2>
          {lead && <p className="type-lead max-w-[38rem] text-muted-foreground">{lead}</p>}
        </div>
        <div className="sheet-body">
          <div className="text-sm">
            {aside && (
              <Link href={aside.href} className="font-medium text-link underline decoration-1 underline-offset-[3px] hover:text-signal-strong">
                {aside.label}
              </Link>
            )}
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      </Container>
    </section>
  );
}

/** Título de página interna do site. */
export function PageTitle({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <Container className="pt-12 pb-10 md:pt-16 md:pb-12">
      <h1 className="type-h1 max-w-[22ch]">{title}</h1>
      {lead && <p className="type-lead mt-5 max-w-[44rem] text-muted-foreground">{lead}</p>}
      {children}
    </Container>
  );
}

/** Cota: número medido com linha de dimensão. */
export function Cota({ value, suffix, label }: { value: string; suffix?: string; label: string }) {
  return (
    <div className="cota">
      <div className="cota-valor">
        {value}
        {suffix && <small className="ml-1 text-base font-medium text-muted-foreground [font-variation-settings:'wdth'_100]">{suffix}</small>}
      </div>
      <div className="cota-linha" aria-hidden />
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

/** Ponto de status colorido + texto. */
export function Status({ tone = "none", children }: { tone?: "ok" | "warn" | "err" | "info" | "none"; children: ReactNode }) {
  return <span className={cn("status", tone !== "none" && `status-${tone}`)}>{children}</span>;
}

/** Chamada final escura. */
export function CtaBand({ title, text, action, secondary }: { title: string; text?: string; action: { href: string; label: string }; secondary?: ReactNode }) {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="grid items-end gap-6 rounded-lg bg-foreground p-8 text-card md:grid-cols-[7fr_5fr] md:p-14">
          <div>
            <h2 className="type-h2 max-w-[20ch] [font-variation-settings:'wdth'_106]">{title}</h2>
            {text && <p className="mt-4 max-w-[34rem] text-card/70">{text}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-6 md:justify-end">
            {secondary}
            <Link
              href={action.href}
              className="inline-flex h-12 items-center rounded-md bg-card px-5 text-base font-medium text-foreground hover:bg-paper"
            >
              {action.label}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
