import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireOwner } from "@/modules/auth/context";
import { getProposal, listContactsByCompany } from "@/modules/crm/queries";
import { generateProposalPdfForm } from "@/modules/crm/form-actions";
import { SendProposalDialog } from "@/modules/crm/components/send-proposal-dialog";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { DEFAULT_PROPOSAL_MESSAGE } from "@/modules/crm/brand";
import { getProposalDecision } from "@/modules/portal-proposals/queries";
import { getContractByProposal, CONTRACT_STATUS_LABEL } from "@/modules/contracts/queries";
import { createContractForm } from "@/modules/contracts/form-actions";
import { formatDateTime } from "@/lib/format";
import { getDownloadUrl } from "@/modules/files/actions";
import { changeProposalStatusForm } from "@/modules/crm/form-actions";
import { AttachProposalFileForm } from "@/modules/crm/components/attach-proposal-file-form";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ProposalFormDialog } from "@/modules/crm/components/proposal-form";
import { formatBrlCents, formatBytes, formatDate, formatIsoDate } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  accepted: "Aceita",
  rejected: "Rejeitada",
  expired: "Expirada",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "border-border bg-subtle text-muted-foreground",
  sent: "border-signal-strong bg-signal-soft text-signal-strong",
  accepted: "border-success bg-success-soft text-success",
  rejected: "border-danger bg-danger-soft text-danger",
  expired: "border-warning bg-warning-soft text-warning",
};

export default async function PropostaDetalhePage({ params }: PageProps<"/admin/crm/propostas/[id]">) {
  const ctx = await requireOwner();
  const { id } = await params;
  const row = await getProposal(ctx, id);
  if (!row) notFound();
  const p = row.proposal;
  const opp = row.opportunity;
  const company = row.company;
  const file = row.file;

  const decision = await getProposalDecision(ctx, p.id);
  const contract = p.status === "accepted" ? await getContractByProposal(ctx, p.id) : null;
  const contacts = (await listContactsByCompany(ctx, company.id)).filter((c) => c.email).map((c) => ({ id: c.id, name: c.name, email: c.email as string }));
  const canSend = (p.status === "draft" || p.status === "sent") && Boolean(file) && contacts.length > 0;
  const sendDisabledReason = !file ? "Gere o PDF ou anexe o arquivo antes de enviar." : contacts.length === 0 ? "A empresa não tem contato com e-mail." : p.status !== "draft" && p.status !== "sent" ? "Proposta decidida." : null;

  // Assina o download só quando há anexo. URL vale 5 min — o usuário está na tela agora.
  let downloadUrl: string | null = null;
  if (file) {
    const r = await getDownloadUrl(ctx, file.id);
    if (r.ok) downloadUrl = r.data.url;
  }

  const isExpiringSoon =
    p.status === "sent" && p.validUntil && p.validUntil <= new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title={p.title}
        meta={
          <>
            <span className="type-data">{p.number}</span>
            <span className="text-faint"> · </span>
            <Link href={`/admin/crm/empresas/${company.id}`} className="text-link hover:underline">
              {company.name}
            </Link>
            <span className="text-faint"> · </span>
            <Link href={`/admin/crm/oportunidades/${opp.id}`} className="text-link hover:underline">
              {opp.title}
            </Link>
          </>
        }
        actions={
          <>
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-sm border px-2 text-[0.75rem] font-medium",
                STATUS_STYLE[p.status],
              )}
            >
              {STATUS_LABEL[p.status]}
            </span>
            {p.status === "draft" && (
              <ProposalFormDialog
                opportunityId={opp.id}
                proposal={{ id: p.id, title: p.title, valueCents: p.valueCents, validUntil: p.validUntil }}
                trigger={<Button variant="secondary" size="sm" type="button">Editar</Button>}
              />
            )}
          </>
        }
      />

      {p.status === "draft" && !file && (
        <div className="rounded-sm border-l-3 border-warning bg-warning-soft px-4 py-3 text-sm">
          <span className="font-medium text-warning">Rascunho sem anexo.</span>{" "}
          <span className="text-foreground">Para marcar como enviada, anexe o arquivo da proposta primeiro.</span>
        </div>
      )}

      {isExpiringSoon && (
        <div className="rounded-sm border-l-3 border-warning bg-warning-soft px-4 py-3 text-sm">
          <span className="font-medium text-warning">Vencida ou vencendo hoje.</span>{" "}
          <span className="text-foreground">Marque como Expirada, ou renove pra continuar enviada.</span>
        </div>
      )}

      <Block title="Documento" aside={p.documentVersion > 0 ? `PDF v${p.documentVersion}` : "nenhum PDF gerado"}>
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            {p.documentVersion > 0
              ? `A versão ${p.documentVersion} do PDF é o anexo atual da proposta.${p.emailedAt ? ` Enviada por e-mail em ${formatDate(p.emailedAt)}.` : ""}`
              : "Escreva as seções do modelo do kit comercial e gere o PDF; ele vira o anexo da proposta."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" render={<Link href={`/admin/crm/propostas/${p.id}/documento`} />}>
              {p.status === "draft" ? "Editar documento" : "Ver documento"}
            </Button>
            {(p.status === "draft" || p.status === "sent") && (
              <ConfirmAction
                trigger={<Button variant="outline" size="sm" type="button">Gerar PDF</Button>}
                title={p.documentVersion > 0 ? `Gerar a versão ${p.documentVersion + 1} do PDF?` : "Gerar o PDF da proposta?"}
                description="O PDF é gerado com o conteúdo atual do documento e passa a ser o anexo da proposta (o anterior fica guardado em Arquivos)."
                confirmLabel="Gerar PDF"
                destructive={false}
                action={generateProposalPdfForm}
                fields={{ id: p.id }}
              />
            )}
            <Button variant="outline" size="sm" render={<a href={`/admin/crm/propostas/${p.id}/documento/pdf`} target="_blank" rel="noopener" />}>
              Ver PDF
            </Button>
            <SendProposalDialog
              proposalId={p.id}
              contacts={contacts}
              defaultContactId={p.contactId}
              defaultMessage={DEFAULT_PROPOSAL_MESSAGE({ title: p.title, number: p.number })}
              filename={file?.originalName ?? null}
              disabledReason={canSend ? null : sendDisabledReason}
            />
          </div>
        </div>
      </Block>

      {decision && (
        <Block title={decision.decision === "accepted" ? "Aceite do cliente" : "Recusa do cliente"} aside="registrado no portal">
          <dl className="grid grid-cols-[160px_1fr] gap-y-1.5 text-sm" data-testid="evidencia-aceite">
            <dt className="text-muted-foreground">Nome informado</dt><dd>{decision.name}</dd>
            <dt className="text-muted-foreground">Usuário</dt><dd>{decision.userName} <span className="type-data text-muted-foreground">({decision.userEmail})</span></dd>
            <dt className="text-muted-foreground">Quando</dt><dd className="type-data">{formatDateTime(decision.decidedAt)}</dd>
            <dt className="text-muted-foreground">Arquivo</dt><dd>{decision.fileName ?? "—"}{decision.documentVersion ? ` · v${decision.documentVersion}` : ""}</dd>
            <dt className="text-muted-foreground">Origem</dt><dd className="type-data text-xs">{decision.ipHash ? `ip ${decision.ipHash.slice(0, 12)}…` : "ip —"} · {decision.userAgent ?? "—"}</dd>
            {decision.notes && <><dt className="text-muted-foreground">Observações</dt><dd className="whitespace-pre-wrap">{decision.notes}</dd></>}
          </dl>
        </Block>
      )}

      {p.status === "accepted" && (
        <Block title="Contrato" aside={contract ? CONTRACT_STATUS_LABEL[contract.contract.status] : "a partir do aceite"}>
          <div className="flex flex-wrap items-center gap-3" data-testid="bloco-contrato">
            {contract ? (
              <>
                <p className="text-sm text-muted-foreground">
                  <span className="type-data text-foreground">{contract.contract.number}</span>
                  {contract.contract.documentVersion > 0 ? ` · PDF v${contract.contract.documentVersion}` : " · sem PDF"}
                  {contract.contract.issuedAt ? ` · emitido em ${formatDate(contract.contract.issuedAt)}` : ""}
                  {contract.contract.signedAt ? ` · assinado em ${formatDate(contract.contract.signedAt)}` : ""}
                </p>
                <Button variant="secondary" size="sm" render={<Link href={`/admin/crm/contratos/${contract.contract.id}`} />}>
                  Abrir contrato
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Gera o contrato de prestação de serviços pré-preenchido com o documento da proposta, o contato e as parcelas do projeto. Você revisa antes de emitir.</p>
                <form action={createContractForm}>
                  <input type="hidden" name="proposalId" value={p.id} />
                  <Button type="submit" size="sm">Criar contrato</Button>
                </form>
              </>
            )}
          </div>
        </Block>
      )}

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <Block title="Dados">
          <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Número</dt>
            <dd className="type-data">{p.number}</dd>
            <dt className="text-muted-foreground">Valor</dt>
            <dd className="type-data">{formatBrlCents(p.valueCents)}</dd>
            <dt className="text-muted-foreground">Criada em</dt>
            <dd className="type-data">{formatDate(p.createdAt)}</dd>
            <dt className="text-muted-foreground">Enviada em</dt>
            <dd className="type-data">{p.sentAt ? formatDate(p.sentAt) : <span className="text-faint">—</span>}</dd>
            <dt className="text-muted-foreground">Válida até</dt>
            <dd className="type-data">{formatIsoDate(p.validUntil)}</dd>
            <dt className="text-muted-foreground">Decidida em</dt>
            <dd className="type-data">{p.decidedAt ? formatDate(p.decidedAt) : <span className="text-faint">—</span>}</dd>
          </dl>
          {p.decisionNotes && (
            <div className="type-micro mt-4 max-w-lg leading-relaxed text-muted-foreground">
              <div className="mb-1 font-medium text-foreground">Notas de decisão</div>
              {p.decisionNotes}
            </div>
          )}
        </Block>

        <Block title="Arquivo">
          {file ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-sm border border-border bg-subtle p-3">
                <div className="flex h-12 w-11 items-end justify-center rounded-sm border border-strong bg-card pb-1 type-data text-[0.6875rem] text-muted-foreground">
                  {(file.mimeType.split("/")[1] || "FILE").slice(0, 4).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{file.originalName}</div>
                  <div className="type-data text-xs text-muted-foreground">
                    {formatBytes(file.sizeBytes)} · anexado em {formatDate(file.createdAt)}
                  </div>
                </div>
                {downloadUrl ? (
                  <Button variant="secondary" size="sm" render={<a href={downloadUrl} download={file.originalName} />}>
                    Baixar
                  </Button>
                ) : (
                  <span className="text-xs text-danger">Sem acesso</span>
                )}
              </div>
              {p.status === "draft" && <AttachProposalFileForm proposalId={p.id} replace />}
            </div>
          ) : (
            <AttachProposalFileForm proposalId={p.id} />
          )}
        </Block>
      </div>

      {p.status !== "accepted" && p.status !== "rejected" && (
        <Block title="Transições">
          <div className="flex flex-wrap gap-2">
            {p.status === "draft" && (
              <form action={changeProposalStatusForm} className="contents">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="to" value="sent" />
                <input type="hidden" name="sentAt" value={new Date().toISOString().slice(0, 10)} />
                <Button type="submit" size="sm" disabled={!file}>
                  Marcar como enviada
                </Button>
              </form>
            )}
            {(p.status === "sent" || p.status === "expired") && (
              <>
                <form action={changeProposalStatusForm} className="contents">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="to" value="accepted" />
                  <Button type="submit" size="sm">Marcar como aceita</Button>
                </form>
                <form action={changeProposalStatusForm} className="contents">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="to" value="rejected" />
                  <Button type="submit" variant="destructive" size="sm">Marcar como rejeitada</Button>
                </form>
                {p.status === "sent" && (
                  <form action={changeProposalStatusForm} className="contents">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="to" value="expired" />
                    <Button type="submit" variant="outline" size="sm">Marcar como expirada</Button>
                  </form>
                )}
              </>
            )}
            {p.status === "sent" && (
              <form action={changeProposalStatusForm} className="contents">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="to" value="draft" />
                <Button type="submit" variant="outline" size="sm">Voltar para rascunho</Button>
              </form>
            )}
          </div>
          <p className="type-micro mt-3 text-muted-foreground">
            Só rascunho pode ser editado. Uma proposta sem anexo não pode ser marcada como enviada.
          </p>
        </Block>
      )}
    </>
  );
}
