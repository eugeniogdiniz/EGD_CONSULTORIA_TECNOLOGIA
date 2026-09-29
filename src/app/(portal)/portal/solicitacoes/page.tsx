import Link from "next/link";
import { cn } from "cn";
import { requirePortal } from "@/modules/auth/context";
import { listPortalRequests } from "@/modules/requests/queries";
import { STATUS_LABEL, STATUS_STYLE } from "@/modules/requests/status";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Solicitações" };

export default async function PortalSolicitacoesPage() {
  const ctx = await requirePortal();
  const requests = await listPortalRequests(ctx);
  return (
    <>
      <PageHeader
        title="Solicitações"
        meta={`Pedidos e dúvidas do ${ctx.organization.name}, com o histórico da conversa com a equipe da EGD.`}
        actions={<Button size="sm" render={<Link href="/portal/solicitacoes/nova" />}>Nova solicitação</Button>}
      />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {requests.length === 0 ? (
          <EmptyState
            title="Nenhuma solicitação ainda."
            text="Precisa de algo? Abra uma solicitação e a equipe responde por aqui e por e-mail."
            action={<Button size="sm" render={<Link href="/portal/solicitacoes/nova" />}>Abrir a primeira</Button>}
          />
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((r) => (
              <li key={r.id}>
                <Link href={`/portal/solicitacoes/${r.id}`} className="grid gap-1 px-5 py-3.5 hover:bg-subtle md:grid-cols-[1fr_auto] md:items-center md:gap-4">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="type-micro block text-muted-foreground">
                      {r.authorName}
                      {r.projectTitle && ` · ${r.projectTitle}`}
                      {` · ${r.messages} resposta${r.messages === 1 ? "" : "s"}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="type-data text-xs text-faint">{formatDateTime(r.updatedAt)}</span>
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
