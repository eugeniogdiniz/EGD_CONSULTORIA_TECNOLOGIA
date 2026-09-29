import Link from "next/link";
import { cn } from "cn";
import { requirePortal } from "@/modules/auth/context";
import { listPortalProjects } from "@/modules/portal-projects/queries";
import { PROJECT_STATUS_LABEL, STATUS_STYLE } from "@/modules/portal-projects/scope";
import { PageHeader } from "@/components/shell/page-header";
import { SITE } from "@/content/site";
import { formatIsoDate } from "@/lib/format";

export const metadata = { title: "Portal" };

export default async function PortalHome() {
  const ctx = await requirePortal();
  const primeiroNome = ctx.user.name.split(/\s+/)[0];
  const projects = await listPortalProjects(ctx);
  const shown = projects.slice(0, 4);

  return (
    <>
      <PageHeader title={`Olá, ${primeiroNome}.`} meta={`Você está no portal do ${ctx.organization.name}.`} />
      <div className="grid items-start gap-6 md:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">Seus projetos</h2>
            {projects.length > 0 && (
              <Link href="/portal/projetos" className="text-sm text-link hover:underline">Ver todos ({projects.length})</Link>
            )}
          </div>
          {shown.length === 0 ? (
            <p className="mt-2 text-muted-foreground">
              Ainda não há projetos vinculados à sua organização. Quando a equipe da EGD compartilhar um, ele aparece aqui.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {shown.map((p) => (
                <li key={p.id}>
                  <Link href={`/portal/projetos/${p.id}`} className="grid gap-2 rounded-md border border-border p-3.5 hover:border-strong">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium">{p.title}</span>
                      <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap", STATUS_STYLE[p.status])}>
                        {PROJECT_STATUS_LABEL[p.status]}
                      </span>
                    </div>
                    {p.status !== "cancelled" && (
                      <div>
                        <div
                          role="progressbar"
                          aria-valuenow={p.summary.percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progresso de ${p.title}`}
                          className="h-1.5 overflow-hidden rounded-sm border border-border bg-subtle"
                        >
                          <div className="h-full bg-link" style={{ width: `${p.summary.percent}%` }} />
                        </div>
                        <div className="type-micro mt-1.5 flex justify-between text-muted-foreground">
                          <span>{p.summary.done} de {p.summary.total} entregas concluídas</span>
                          {p.summary.nextDeliverableDueAt && (
                            <span>próxima entrega <span className="type-data">{formatIsoDate(p.summary.nextDeliverableDueAt)}</span></span>
                          )}
                        </div>
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Precisa de algo agora?</h2>
          <p className="mt-2 text-muted-foreground">
            Escreva para{" "}
            <a href={`mailto:${SITE.email}`} className="font-medium text-link underline decoration-1 underline-offset-[3px] hover:text-signal-strong">
              {SITE.email}
            </a>
            . Respondemos em até um dia útil.
          </p>
        </section>
      </div>
    </>
  );
}
