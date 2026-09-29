import type { ReactNode } from "react";

export function PageHeader({ title, meta, actions }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {meta && <div className="mt-1.5 text-sm text-muted-foreground">{meta}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Bloco com cabeçalho, usado nas páginas dos portais. */
export function Block({ title, aside, children, padded = true }: { title: ReactNode; aside?: ReactNode; children: ReactNode; padded?: boolean }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-5 py-3.5">
        <h2 className="text-base font-semibold">{title}</h2>
        {aside && <div className="text-sm text-muted-foreground">{aside}</div>}
      </div>
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="grid max-w-[32rem] gap-2 px-6 py-12">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
