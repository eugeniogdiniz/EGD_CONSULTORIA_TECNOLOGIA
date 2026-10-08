import { requireOwner } from "@/modules/auth/context";
import { buildContractRenderInput } from "@/modules/contracts/actions";
import { contractBlocks } from "@/modules/contracts/template";
import { renderDocPdf } from "@/modules/crm/doc-pdf";
import { BRAND } from "@/modules/crm/brand";

/** Prévia do contrato com os campos salvos, gerada na hora e sem gravar nada. */
export async function GET(_req: Request, { params }: RouteContext<"/admin/crm/contratos/[id]/pdf">) {
  await requireOwner();
  const { id } = await params;
  const built = await buildContractRenderInput(id);
  if (!built) return new Response("Contrato não encontrado", { status: 404 });
  const pdf = await renderDocPdf({
    headerLabel: `Contrato · ${built.input.number} · prévia`,
    info: { title: `Contrato ${built.input.number} · prévia`, subject: built.row.company.name },
    blocks: contractBlocks(built.input),
    brand: { email: BRAND.email, phone: BRAND.phone, site: BRAND.site },
  });
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${built.input.number}-previa.pdf"`, "cache-control": "no-store" },
  });
}
