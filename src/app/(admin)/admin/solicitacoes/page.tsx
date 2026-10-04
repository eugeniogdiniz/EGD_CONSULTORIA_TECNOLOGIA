import Link from "next/link";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { listAllRequests, type AdminRequestFilters } from "@/modules/requests/queries";
import { SlaBadge } from "@/modules/requests/components/sla-badge";
import { PRIORITY_LABEL, PRIORITY_STYLE } from "@/modules/projects/priority";
import { isRequestStatus, STATUS_LABEL, STATUS_STYLE } from "@/modules/requests/status";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Solicitações" };

const FILTERS: { key: string; label: string; href: string }[] = [
  { key: "all", label: "Todas", href: "/admin/solicitacoes" },
  { key: "open", label: "Abertas", href: "/admin/solicitacoes?status=open" },
  { key: "in_progress", label: "Em andamento", href: "/admin/solicitacoes?status=in_progress" },
  { key: "resolved", label: "Resolvidas", href: "/admin/solicitacoes?status=resolved" },
  { key: "mine", label: "Minhas", href: "/admin/solicitacoes?responsavel=eu" },
  { key: "sla", label: "SLA estourado", href: "/admin/solicitacoes?sla=estourado" },
];

export default async function AdminSolicitacoesPage({ searchParams }: PageProps<"/admin/solicitacoes">) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const raw = typeof sp.status === "string" ? sp.status : "all";
  const status = isRequestStatus(raw) ? raw : undefined;
  const mine = sp.responsavel === "eu";
  const breached = sp.sla === "estourado";
  const filters: AdminRequestFilters = { status, assigneeId: mine ? ctx.user.id : undefined, sla: breached ? "breached" : undefined };
  const active = breached ? "sla" : mine ? "mine" : (status ?? "all");
  const now = new Date();
  const requests = await listAllRequests(ctx, filters, now);

  return (
    <>
      <PageHeader title="Solicitações" meta="Pedidos e dúvidas abertos pelos clientes no portal." />
      <nav className="flex gap-1 border-b border-border" aria-label="Filtro por status">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.href}
            aria-current={active === f.key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
              active === f.key && "border-foreground text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {requests.length === 0 ? (
          <EmptyState title="Nenhuma solicitação aqui." text={breached ? "Nenhuma solicitação com o prazo de primeira resposta vencido." : "Quando um cliente abrir uma pelo portal, ela aparece nesta lista."} />
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/solicitacoes/${r.id}`} className="grid gap-1 px-5 py-3.5 hover:bg-subtle md:grid-cols-[1fr_auto] md:items-center md:gap-4">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="type-micro block text-muted-foreground">
                      {r.organizationName} · {r.authorName}
                      {r.projectTitle && ` · ${r.projectTitle}`}
                      {` · ${r.messages} resposta${r.messages === 1 ? "" : "s"}`}
                      {r.assigneeName && ` · ${r.assigneeName}`}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="type-data text-xs text-faint">{formatDateTime(r.updatedAt)}</span>
                    {r.status !== "resolved" && <SlaBadge request={r} now={now} compact />}
                    {r.priority !== "medium" && (
                      <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap", PRIORITY_STYLE[r.priority])}>
                        {PRIORITY_LABEL[r.priority]}
                      </span>
                    )}
                    <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap", STATUS_STYLE[r.status])}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
