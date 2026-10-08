import { NextResponse } from "next/server";
import { requirePortal } from "@/modules/auth/context";
import { getPortalProposal } from "@/modules/portal-proposals/queries";
import { getSignedDownloadUrl } from "@/lib/storage";
import { audit } from "@/modules/audit/log";

/** PDF da proposta visível à organização ativa (arquivo interno do admin: o escopo vem da proposta). */
export async function POST(_req: Request, { params }: RouteContext<"/portal/propostas/[id]/baixar">) {
  const ctx = await requirePortal();
  const { id } = await params;
  const p = await getPortalProposal(ctx, id);
  if (!p || !p.fileId || !p.bucketKey || !p.fileName) return new NextResponse("Arquivo não encontrado", { status: 404 });
  await audit({ actorId: ctx.user.id, action: "portal.proposal.downloaded", entityType: "crm_proposal", entityId: id, organizationId: ctx.organization.id, metadata: { fileId: p.fileId } });
  return NextResponse.redirect(await getSignedDownloadUrl(p.bucketKey, p.fileName), 303);
}
