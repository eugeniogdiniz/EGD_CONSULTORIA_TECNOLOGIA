import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireOwner } from "@/modules/auth/context";
import { buildContractRenderInput } from "@/modules/contracts/actions";
import { CONTRACT_STATUS_LABEL } from "@/modules/contracts/queries";
import { AttachSignedContractForm } from "@/modules/contracts/components/attach-signed-form";
import { generateContractPdfForm, issueContractForm, reopenContractForm } from "@/modules/contracts/form-actions";
import { ContractForm } from "@/modules/contracts/components/contract-form";
import { SignContractForm } from "@/modules/contracts/components/sign-form";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { getDownloadUrl } from "@/modules/files/actions";
import { formatDate, formatBytes } from "@/lib/format";

export const metadata = { title: "Contrato" };

const STYLE: Record<string, string> = {
  draft: "border-border bg-subtle text-muted-foreground",
  issued: "border-signal-strong bg-signal-soft text-signal-strong",
  signed: "border-success bg-success-soft text-success",
};

export default async function ContratoPage({ params }: PageProps<"/admin/crm/contratos/[id]">) {
  const ctx = await requireOwner();
  const { id } = await params;
  const built = await buildContractRenderInput(id);
  if (!built) notFound();
  const { row, input, missing } = built;
  const c = row.contract;
  const p = row.proposal;
  const draft = c.status === "draft";
  let downloadUrl: string | null = null;
  if (c.fileId) {
    const r = await getDownloadUrl(ctx, c.fileId);
    if (r.ok) downloadUrl = r.data.url;
  }
  let signedUrl: string | null = null;
  if (c.signedFileId) {
    const r = await getDownloadUrl(ctx, c.signedFileId);
    if (r.ok) signedUrl = r.data.url;
  }
  return (
    <>
      <PageHeader
        title={`Contrato ${c.number}`}
        meta={
          <>
            <Link href={`/admin/crm/propostas/${p.id}`} className="text-link hover:underline">{p.title}</Link>
            <span className="text-faint"> · </span>
            <Link href={`/admin/crm/empresas/${row.company.id}`} className="text-link hover:underline">{row.company.name}</Link>
            <span className="text-faint"> · </span>
            <span className="type-data">proposta {p.number}</span>
          </>
        }
        actions={
          <span className={cn("inline-flex h-6 items-center rounded-sm border px-2 text-[0.75rem] font-medium", STYLE[c.status])} data-testid="status-contrato">
            {CONTRACT_STATUS_LABEL[c.status]}
          </span>
        }
      />

      <Block title="Documento" aside={c.documentVersion > 0 ? `PDF v${c.documentVersion}` : "nenhum PDF gerado"}>
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            {c.status === "signed"
              ? c.signedFileId
                ? `Assinado em ${c.signedAt ? formatDate(c.signedAt) : "—"}, com o PDF assinado anexado abaixo: ele é o contrato final. Os campos continuam editáveis para registrar aqui o que consta no documento assinado (partes, prazos, parcelas e pagamento).`
                : `Assinado em ${c.signedAt ? formatDate(c.signedAt) : "—"}. A versão ${c.documentVersion} é o contrato final.`
              : c.status === "issued"
                ? `Emitido em ${c.issuedAt ? formatDate(c.issuedAt) : "—"}: o cliente baixa a versão ${c.documentVersion} no portal, em Propostas. Para corrigir algo, volte para rascunho.`
                : "Revise os campos abaixo, gere versões de PDF quantas vezes precisar e emita quando estiver pronto. Emitir gera a versão final, bloqueia a edição e libera o download para o cliente no portal."}
          </p>
          <div className="flex flex-wrap gap-2">
            {draft && (
              <>
                <ConfirmAction
                  trigger={<Button variant="outline" size="sm" type="button">Gerar PDF</Button>}
                  title={c.documentVersion > 0 ? `Gerar a versão ${c.documentVersion + 1} do PDF?` : "Gerar o PDF do contrato?"}
                  description="O PDF é gerado com os campos salvos e fica guardado em Arquivos. Salve o formulário antes."
                  confirmLabel="Gerar PDF"
                  destructive={false}
                  action={generateContractPdfForm}
                  fields={{ id: c.id }}
                />
                <ConfirmAction
                  trigger={<Button size="sm" type="button">Emitir contrato</Button>}
                  title="Emitir o contrato?"
                  description={missing.length ? `Ainda faltam: ${missing.join(", ")}. O PDF sairá com esses campos entre colchetes. Emitir gera a versão final, bloqueia a edição e libera o download no portal.` : "Gera a versão final do PDF, bloqueia a edição e libera o download para o cliente no portal."}
                  confirmLabel="Emitir"
                  destructive={false}
                  action={issueContractForm}
                  fields={{ id: c.id, proposalId: p.id }}
                />
              </>
            )}
            {c.status === "issued" && (
              <form action={reopenContractForm} className="contents">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="proposalId" value={p.id} />
                <Button type="submit" variant="outline" size="sm">Voltar para rascunho</Button>
              </form>
            )}
            {downloadUrl && row.file && (
              <Button variant="secondary" size="sm" render={<a href={downloadUrl} download={row.file.originalName} />}>
                Baixar PDF v{c.documentVersion}
              </Button>
            )}
          </div>
          {c.status === "issued" && <SignContractForm contractId={c.id} proposalId={p.id} />}
        </div>
      </Block>

      <Block title="Contrato assinado" aside={row.signedFile ? `assinado em ${c.signedAt ? formatDate(c.signedAt) : "—"}` : "PDF assinado fora do sistema"}>
        <div className="grid gap-4">
          {row.signedFile ? (
            <div className="flex items-center gap-3.5 rounded-md border border-border bg-card p-3" data-testid="contrato-assinado-arquivo">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{row.signedFile.originalName}</div>
                <div className="type-micro text-muted-foreground">{formatBytes(row.signedFile.sizeBytes)} · anexado em {formatDate(row.signedFile.createdAt)} · é o documento que o cliente baixa no portal</div>
              </div>
              {signedUrl ? (
                <Button variant="secondary" size="sm" render={<a href={signedUrl} download={row.signedFile.originalName} />}>
                  Baixar assinado
                </Button>
              ) : (
                <span className="text-xs text-danger">Sem acesso</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Se o contrato foi assinado no papel ou por assinatura eletrônica, anexe o PDF aqui: ele vira o documento final e o cliente passa a baixar esta versão no portal.</p>
          )}
          <AttachSignedContractForm contractId={c.id} proposalId={p.id} replace={Boolean(row.signedFile)} />
        </div>
      </Block>

      <ContractForm
        contractId={c.id}
        initial={input.document}
        valueCents={p.valueCents}
        readOnly={!draft && !c.signedFileId}
        missing={missing}
        pdfHref={`/admin/crm/contratos/${c.id}/pdf`}
        proposalHref={`/admin/crm/propostas/${p.id}`}
      />
    </>
  );
}
