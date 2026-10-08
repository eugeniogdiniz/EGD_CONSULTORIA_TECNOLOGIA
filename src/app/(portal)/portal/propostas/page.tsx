import Link from "next/link";
import { cn } from "cn";
import { requirePortal } from "@/modules/auth/context";
import { listPortalProposals } from "@/modules/portal-proposals/queries";
import { PORTAL_PROPOSAL_STATUS_LABEL } from "@/modules/portal-proposals/rules";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { formatBrlCents, formatDate, formatIsoDate } from "@/lib/format";

export const metadata = { title: "Propostas" };

const STYLE: Record<string, string> = {
  sent: "border-signal-strong bg-signal-soft text-signal-strong",
  accepted: "border-success bg-success-soft text-success",
  rejected: "border-danger bg-danger-soft text-danger",
  expired: "border-warning bg-warning-soft text-warning",
};

export default async function PortalPropostasPage() {
  const ctx = await requirePortal();
  const rows = await listPortalProposals(ctx);
  return (
    <>
      <PageHeader title="Propostas" meta={`Propostas comerciais da EGD para o ${ctx.organization.name}. Baixe o PDF e registre o aceite por aqui.`} />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {rows.length === 0 ? (
          <EmptyState title="Nenhuma proposta ainda." text="Quando a EGD enviar uma proposta para a sua organização, ela aparece aqui para você baixar e aceitar." />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <li key={p.id}>
                <Link href={`/portal/propostas/${p.id}`} className="grid gap-1 px-5 py-3.5 hover:bg-subtle md:grid-cols-[1fr_auto] md:items-center md:gap-4">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.title}</span>
                    <span className="type-micro block text-muted-foreground">
                      <span className="type-data">{p.number}</span> · {p.opportunityTitle}
                      {p.sentAt && ` · enviada em ${formatDate(p.sentAt)}`}
                      {p.validUntil && p.status === "sent" && ` · válida até ${formatIsoDate(p.validUntil)}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="type-data text-sm">{formatBrlCents(p.valueCents)}</span>
                    <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap", STYLE[p.status])}>
                      {PORTAL_PROPOSAL_STATUS_LABEL[p.status as keyof typeof PORTAL_PROPOSAL_STATUS_LABEL]}
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
