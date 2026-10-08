import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requirePortal } from "@/modules/auth/context";
import { getPortalProposal } from "@/modules/portal-proposals/queries";
import { canDecide, PORTAL_PROPOSAL_STATUS_LABEL } from "@/modules/portal-proposals/rules";
import { ProposalDecisionForm } from "@/modules/portal-proposals/components/decision-form";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatBrlCents, formatBytes, formatDate, formatDateTime, formatIsoDate } from "@/lib/format";

export const metadata = { title: "Proposta" };

const STYLE: Record<string, string> = {
  sent: "border-signal-strong bg-signal-soft text-signal-strong",
  accepted: "border-success bg-success-soft text-success",
  rejected: "border-danger bg-danger-soft text-danger",
  expired: "border-warning bg-warning-soft text-warning",
};

export default async function PortalPropostaPage({ params }: PageProps<"/portal/propostas/[id]">) {
  const ctx = await requirePortal();
  const { id } = await params;
  const p = await getPortalProposal(ctx, id);
  if (!p) notFound();
  const label = PORTAL_PROPOSAL_STATUS_LABEL[p.status as keyof typeof PORTAL_PROPOSAL_STATUS_LABEL];
  return (
    <>
      <PageHeader
        title={p.title}
        meta={
          <span className="flex flex-wrap items-center gap-x-2">
            <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium", STYLE[p.status])}>{label}</span>
            <span className="text-faint">·</span>
            <Link href="/portal/propostas" className="text-link hover:underline">Propostas</Link>
            <span className="text-faint">·</span>
            <span className="type-data">{p.number}</span>
            {p.documentVersion > 0 && <span className="text-faint">· v{p.documentVersion}</span>}
          </span>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Block title="Documento">
            {p.fileName ? (
              <div className="flex items-center gap-3.5 rounded-md border border-border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.fileName}</div>
                  <div className="type-micro text-muted-foreground">{p.fileSize != null && formatBytes(p.fileSize)}{p.sentAt && ` · enviada em ${formatDate(p.sentAt)}`}</div>
                </div>
                <form method="post" action={`/portal/propostas/${p.id}/baixar`}>
                  <Button type="submit" variant="outline" size="sm">Baixar PDF</Button>
                </form>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem arquivo.</p>
            )}
          </Block>
          {p.decision ? (
            <Block title={p.decision === "accepted" ? "Aceite registrado" : "Recusa registrada"}>
              <p className="text-sm">
                {p.decision === "accepted" ? "Aceita" : "Recusada"} por <strong>{p.decisionName}</strong>
                {p.decisionBy && p.decisionBy !== p.decisionName ? ` (${p.decisionBy})` : ""} em {p.decisionAt ? formatDateTime(p.decisionAt) : "—"}.
                {p.decisionNotes && <span className="mt-2 block whitespace-pre-wrap text-muted-foreground">{p.decisionNotes}</span>}
              </p>
            </Block>
          ) : canDecide(p.status) ? (
            <Block title="Sua decisão" aside={p.validUntil ? `válida até ${formatIsoDate(p.validUntil)}` : undefined}>
              <ProposalDecisionForm proposalId={p.id} defaultName={ctx.user.name} />
            </Block>
          ) : (
            <Block title="Sua decisão">
              <p className="text-sm text-muted-foreground">
                {p.status === "expired" ? "Esta proposta expirou. Se ainda tiver interesse, peça à EGD uma versão renovada." : `Esta proposta está como "${label}".`}
              </p>
            </Block>
          )}
        </div>
        <Block title="Dados">
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Número</dt><dd className="type-data">{p.number}</dd>
            <dt className="text-muted-foreground">Valor</dt><dd className="type-data">{formatBrlCents(p.valueCents)}</dd>
            <dt className="text-muted-foreground">Oportunidade</dt><dd>{p.opportunityTitle}</dd>
            <dt className="text-muted-foreground">Enviada em</dt><dd className="type-data">{p.sentAt ? formatDate(p.sentAt) : "—"}</dd>
            <dt className="text-muted-foreground">Válida até</dt><dd className="type-data">{formatIsoDate(p.validUntil)}</dd>
            <dt className="text-muted-foreground">Decidida em</dt><dd className="type-data">{p.decidedAt ? formatDate(p.decidedAt) : "—"}</dd>
          </dl>
        </Block>
      </div>
    </>
  );
}
