import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/modules/auth/context";
import { getProposal, listServices } from "@/modules/crm/queries";
import { parseStoredDocument } from "@/modules/crm/document";
import { ProposalDocumentForm } from "@/modules/crm/components/proposal-document-form";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Documento da proposta" };

export default async function PropostaDocumentoPage({ params }: PageProps<"/admin/crm/propostas/[id]/documento">) {
  const ctx = await requireOwner();
  const { id } = await params;
  const [row, services] = await Promise.all([getProposal(ctx, id), listServices(ctx, { activeOnly: true })]);
  if (!row) notFound();
  const p = row.proposal;
  return (
    <>
      <PageHeader
        title="Documento da proposta"
        meta={
          <>
            <span className="type-data">{p.number}</span>
            <span className="text-faint"> · </span>
            <Link href={`/admin/crm/propostas/${p.id}`} className="text-link hover:underline">{p.title}</Link>
            <span className="text-faint"> · </span>
            {row.company.name}
            {p.documentVersion > 0 && (
              <>
                <span className="text-faint"> · </span>
                PDF v{p.documentVersion} gerado
              </>
            )}
          </>
        }
      />
      <p className="max-w-3xl text-sm text-muted-foreground">
        As seções seguem o modelo de proposta do kit comercial. Seções vazias saem do PDF. Depois de salvar, gere o PDF na página da proposta; ele passa a ser o anexo enviado ao cliente.
      </p>
      <ProposalDocumentForm
        proposalId={p.id}
        initial={parseStoredDocument(p.document)}
        valueCents={p.valueCents}
        readOnly={p.status !== "draft"}
        pdfHref={`/admin/crm/propostas/${p.id}/documento/pdf`}
        services={services.map((s) => ({ id: s.id, name: s.name, unit: s.unit, defaultPriceCents: s.defaultPriceCents }))}
      />
    </>
  );
}
