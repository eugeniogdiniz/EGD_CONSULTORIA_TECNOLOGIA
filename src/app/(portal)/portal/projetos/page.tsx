import Link from "next/link";
import { cn } from "cn";
import { requirePortal } from "@/modules/auth/context";
import { listPortalProjects } from "@/modules/portal-projects/queries";
import { PROJECT_STATUS_LABEL, STATUS_STYLE } from "@/modules/portal-projects/scope";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { SITE } from "@/content/site";
import { formatIsoDate } from "@/lib/format";

export const metadata = { title: "Projetos" };

export default async function PortalProjetosPage() {
  const ctx = await requirePortal();
  const projects = await listPortalProjects(ctx);

  return (
    <>
      <PageHeader
        title="Meus projetos"
        meta={
          projects.length === 0
            ? `Projetos do ${ctx.organization.name}.`
            : `${projects.length} projeto${projects.length === 1 ? "" : "s"} do ${ctx.organization.name}. Somente leitura — para mudar algo, fale com a equipe da EGD.`
        }
      />

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            title="Nenhum projeto por aqui ainda."
            text="Se você espera ver algo aqui, avise a equipe da EGD — talvez o projeto ainda não esteja vinculado à sua organização."
            action={
              <Button variant="outline" size="sm" render={<a href={`mailto:${SITE.email}`} />}>
                Escrever para a EGD
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const cancelled = p.status === "cancelled";
            return (
              <Link
                key={p.id}
                href={`/portal/projetos/${p.id}`}
                className="grid gap-3.5 rounded-md border border-border bg-card p-5 hover:border-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">{p.title}</h2>
                    <div className="type-micro mt-0.5 text-muted-foreground">{p.companyName}</div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap",
                      STATUS_STYLE[p.status],
                    )}
                  >
                    {PROJECT_STATUS_LABEL[p.status]}
                  </span>
                </div>

                {!cancelled && (
                  <div>
                    <div
                      role="progressbar"
                      aria-valuenow={p.summary.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Progresso das entregas"
                      className="h-1.5 overflow-hidden rounded-sm border border-border bg-subtle"
                    >
                      <div className="h-full bg-link" style={{ width: `${p.summary.percent}%` }} />
                    </div>
                    <div className="type-micro mt-1.5 flex justify-between text-muted-foreground">
                      <span>
                        {p.summary.done} de {p.summary.total} entregas concluídas
                      </span>
                      <span className="type-data">{p.summary.percent}%</span>
                    </div>
                  </div>
                )}

                <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 border-t border-border pt-3 text-sm">
                  <dt className="font-medium text-muted-foreground">Próximo marco</dt>
                  <dd>
                    {p.summary.nextMilestoneDueAt ? (
                      <span className="type-data">{formatIsoDate(p.summary.nextMilestoneDueAt)}</span>
                    ) : (
                      <span className="text-faint">Nenhum pendente</span>
                    )}
                  </dd>
                  <dt className="font-medium text-muted-foreground">Próx. entrega</dt>
                  <dd>
                    {p.summary.nextDeliverableDueAt ? (
                      <span className="type-data">{formatIsoDate(p.summary.nextDeliverableDueAt)}</span>
                    ) : (
                      <span className="text-faint">Nenhuma com prazo definido</span>
                    )}
                  </dd>
                </dl>

                <div className="type-micro flex items-center justify-between text-faint">
                  <span>{p.startedAt ? `Iniciado em ${formatIsoDate(p.startedAt)}` : "Ainda não iniciado"}</span>
                  <span className="text-link underline decoration-1 underline-offset-[3px]">Abrir projeto →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
