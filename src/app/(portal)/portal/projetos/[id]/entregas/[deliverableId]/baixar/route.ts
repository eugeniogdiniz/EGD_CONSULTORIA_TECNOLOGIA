import { NextResponse } from "next/server";
import { requirePortal } from "@/modules/auth/context";
import { getPortalDeliverableFile } from "@/modules/portal-projects/queries";
import { getSignedDownloadUrl } from "@/lib/storage";
import { audit } from "@/modules/audit/log";

/**
 * Download do arquivo de uma entrega compartilhada. Não usa
 * /portal/arquivos/baixar: arquivos de entrega não têm organização dona, o
 * escopo vem da cadeia entrega → projeto → empresa → organização.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; deliverableId: string }> },
) {
  const ctx = await requirePortal();
  const { id, deliverableId } = await params;
  const file = await getPortalDeliverableFile(ctx, id, deliverableId);
  if (!file) return new NextResponse("Arquivo não encontrado", { status: 404 });

  await audit({
    actorId: ctx.user.id,
    action: "portal.file.downloaded",
    entityType: "file",
    entityId: file.id,
    organizationId: ctx.organization.id,
    metadata: { deliverableId },
  });
  return NextResponse.redirect(await getSignedDownloadUrl(file.bucketKey, file.originalName), 303);
}
