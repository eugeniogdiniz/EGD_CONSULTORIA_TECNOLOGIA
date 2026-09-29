import Link from "next/link";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { countNewLeads, listLeads } from "@/modules/leads/queries";
import { countOrganizations } from "@/modules/tenancy/queries";
import { getAdminOverview, listDeadlines, listRecentClientComments } from "@/modules/dashboard/queries";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { formatBrlCents, formatDateTime, formatIsoDate } from "@/lib/format";

export const metadata = { title: "Painel" };

function Kpi({ href, label, value, hint, tone }: { href: string; label: string; value: string | number; hint?: string; tone?: "danger" }) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-card px-5 py-4 text-foreground hover:border-strong">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-3xl font-semibold tracking-tight tabular-nums", tone === "danger" && "text-danger")}>{value}</div>
      {hint && <div className="type-micro mt-1 text-faint">{hint}</div>}
    </Link>
  );
}

export default async function AdminHome() {
  const ctx = await requireAdmin();
  const [novos, orgs, ultimos, overview, deadlines, comments] = await Promise.all([
    countNewLeads(),
    countOrganizations(),
    listLeads(ctx),
    getAdminOverview(ctx),
    listDeadlines(ctx),
    listRecentClientComments(ctx),
  ]);

  return (
    <>
      <PageHeader title="Painel" meta={`Olá, ${ctx.user.name}.`} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Kpi href="/admin/leads" label="Leads novos" value={novos} />
        <Kpi
          href="/admin/crm/funil"
          label="Funil aberto"
          value={overview.openOpportunities}
          hint={overview.pipelineCents ? formatBrlCents(overview.pipelineCents) : undefined}
        />
        <Kpi href="/admin/projetos" label="Projetos ativos" value={overview.activeProjects} />
        <Kpi
          href="/admin/projetos"
          label="Entregas atrasadas"
          value={overview.overdueDeliverables}
          hint={`${overview.dueThisWeek} vencem em 7 dias`}
          tone={overview.overdueDeliverables > 0 ? "danger" : undefined}
        />
        <Kpi href="/admin/organizacoes" label="Organizações" value={orgs} hint={`${overview.publishedCases} cases no site`} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Block title="Prazos" aside="atrasadas e próximos 7 dias" padded={false}>
          {deadlines.length === 0 ? (
            <EmptyState title="Nada vencendo." text="Entregas em aberto com prazo nos próximos 7 dias, ou atrasadas, aparecem aqui." />
          ) : (
            <ul className="divide-y divide-border">
              {deadlines.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/admin/projetos/${d.projectId}/entregas/${d.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 text-sm hover:bg-subtle"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{d.title}</span>
                      <span className="type-micro block truncate text-muted-foreground">{d.projectTitle}</span>
                    </span>
                    <span className={cn("type-data text-xs", d.overdue ? "font-medium text-danger" : "text-muted-foreground")}>
                      {d.overdue && "atrasada · "}
                      {formatIsoDate(d.dueAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Comentários de clientes" aside="últimos 14 dias" padded={false}>
          {comments.length === 0 ? (
            <EmptyState title="Nenhum comentário novo." text="Quando um cliente comentar numa entrega pelo portal, o aviso aparece aqui." />
          ) : (
            <ul className="divide-y divide-border">
              {comments.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/projetos/${c.projectId}/entregas/${c.deliverableId}`}
                    className="grid gap-1 px-5 py-3 text-sm hover:bg-subtle"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{c.authorName}</span>
                      <span className="type-data text-xs text-faint">{formatDateTime(c.createdAt)}</span>
                    </span>
                    <span className="line-clamp-2 text-muted-foreground">{c.body}</span>
                    <span className="type-micro text-faint">
                      {c.deliverableTitle} · {c.projectTitle}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </div>

      <Block title="Últimos leads" aside={<Link href="/admin/leads" className="text-link hover:text-signal-strong">Ver todos</Link>} padded={false}>
        {ultimos.length === 0 ? (
          <EmptyState title="Nenhum lead recebido ainda." text="Formulário do site e a API (POST /api/v1/leads) alimentam esta lista." />
        ) : (
          <ul className="divide-y divide-border">
            {ultimos.slice(0, 5).map((l) => (
              <li key={l.id} className="grid gap-1 px-5 py-3 text-sm md:grid-cols-[1fr_2fr_auto] md:items-center md:gap-4">
                <div className="font-medium">
                  {l.name}
                  {l.status === "new" && <span className="ml-2 inline-flex h-5 items-center rounded-sm bg-signal-soft px-1.5 text-[0.75rem] text-signal-strong">Novo</span>}
                </div>
                <div className="truncate text-muted-foreground">{l.message}</div>
                <div className="type-data text-faint">{formatDateTime(l.createdAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}
