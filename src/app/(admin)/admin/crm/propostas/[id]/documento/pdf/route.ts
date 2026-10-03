import { requireOwner } from "@/modules/auth/context";
import { buildProposalPdfInput } from "@/modules/crm/actions";
import { renderProposalPdf } from "@/modules/crm/proposal-pdf";

/** Prévia do PDF com o conteúdo atual, gerada na hora e sem gravar nada. */
export async function GET(_req: Request, { params }: RouteContext<"/admin/crm/propostas/[id]/documento/pdf">) {
  const ctx = await requireOwner();
  const { id } = await params;
  const built = await buildProposalPdfInput(id, { signerName: ctx.user.name });
  if (!built) return new Response("Proposta não encontrada", { status: 404 });
  const pdf = await renderProposalPdf(built.input);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${built.row.proposal.number}-previa.pdf"`,
      "cache-control": "no-store",
    },
  });
}
