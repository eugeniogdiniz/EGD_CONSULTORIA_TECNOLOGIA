import Link from "next/link";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { listOpportunitiesGroupedByStage } from "@/modules/crm/queries";
import { PageHeader } from "@/components/shell/page-header";
import { formatBrlCents, formatIsoDate } from "@/lib/format";

export const metadata = { title: "Funil" };

const STAGE_LABEL: Record<string, string> = {
  new: "Novo",
  qualified: "Qualificado",
  meeting: "Reunião",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};

const STAGE_PIP: Record<string, string> = {
  new: "bg-faint",
  qualified: "bg-link opacity-60",
  meeting: "bg-link",
  proposal: "bg-signal",
  won: "bg-success",
  lost: "bg-danger",
};

const OPEN = new Set(["new", "qualified", "meeting", "proposal"]);

export default async function FunilPage({ searchParams }: PageProps<"/admin/crm/funil">) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q : "";
  const hideClosed = sp.closed !== "1"; // default: esconde ganhas/perdidas

  const columns = await listOpportunitiesGroupedByStage(ctx, {
    search: search || undefined,
    includeClosed: true,
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Funil"
        meta="Cada coluna é um estágio. Marcar como ganha/perdida acontece no detalhe da oportunidade."
      />

      <form className="flex flex-wrap items-center gap-3" action="/admin/crm/funil">
        <div className="grow max-w-md">
          <label htmlFor="q" className="sr-only">Buscar</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Buscar por título ou empresa"
            className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
          />
        </div>
        <label className="inline-flex h-10 items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="closed" value="1" defaultChecked={!hideClosed} />
          Mostrar ganhas e perdidas
        </label>
        <button type="submit" className="h-10 rounded-sm border border-input px-3 text-sm hover:bg-muted">Filtrar</button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 overflow-x-auto">
        {columns.map((col) => {
          const isClosed = col.stage === "won" || col.stage === "lost";
          const collapsed = isClosed && hideClosed;
          return (
            <section
              key={col.stage}
              className="flex min-h-40 flex-col rounded-lg border border-border bg-subtle"
            >
              <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                <span className={cn("h-2 w-2 rounded-full", STAGE_PIP[col.stage])} />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{STAGE_LABEL[col.stage]}</h3>
                  <div className="type-data text-[0.75rem] text-faint">
                    {formatBrlCents(col.totalValueCents)}
                  </div>
                </div>
                <span className="type-data ml-auto text-[0.75rem] text-muted-foreground">
                  {col.count}
                </span>
              </header>
              {collapsed ? (
                <div className="p-3 text-xs text-faint italic">Coluna colapsada.</div>
              ) : (
                <div className="grid gap-2 p-2">
                  {col.opportunities.length === 0 ? (
                    <div className="rounded border border-dashed border-border p-4 text-center text-xs text-faint">
                      Vazio.
                    </div>
                  ) : (
                    col.opportunities.map((o) => (
                      <Link
                        key={o.id}
                        href={`/admin/crm/oportunidades/${o.id}`}
                        className="block rounded border border-border bg-card p-3 hover:border-strong"
                      >
                        <div className="text-sm font-medium leading-snug">{o.title}</div>
                        <div className="type-micro mt-0.5 text-muted-foreground">
                          {o.companyName}
                          {o.companyArchivedAt && (
                            <span className="ml-1.5 rounded-sm border border-border px-1 text-[0.6875rem]">
                              arquivada
                            </span>
                          )}
                        </div>
                        <div className="type-data mt-2">{formatBrlCents(o.valueCents)}</div>
                        {o.nextStep && OPEN.has(o.stage) && (
                          <div
                            className={cn(
                              "mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground",
                              o.nextStepAt && o.nextStepAt <= today && "text-warning",
                            )}
                          >
                            <span className="truncate">{o.nextStep}</span>
                            {o.nextStepAt && (
                              <span className="type-data ml-auto shrink-0">{formatIsoDate(o.nextStepAt)}</span>
                            )}
                          </div>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
