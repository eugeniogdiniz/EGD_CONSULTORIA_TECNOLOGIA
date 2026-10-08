import { NextResponse } from "next/server";
import { requirePortal } from "@/modules/auth/context";
import { getPortalContract } from "@/modules/contracts/queries";
import { getSignedDownloadUrl } from "@/lib/storage";
import { audit } from "@/modules/audit/log";

/** PDF do contrato emitido da proposta, para a organização ativa. */
export async function POST(_req: Request, { params }: RouteContext<"/portal/propostas/[id]/contrato">) {
  const ctx = await requirePortal();
  const { id } = await params;
  const c = await getPortalContract(ctx, id);
  if (!c) return new NextResponse("Arquivo não encontrado", { status: 404 });
  await audit({ actorId: ctx.user.id, action: "portal.contract.downloaded", entityType: "crm_contract", entityId: c.id, organizationId: ctx.organization.id, metadata: { fileId: c.fileId } });
  return NextResponse.redirect(await getSignedDownloadUrl(c.bucketKey, c.fileName), 303);
}
