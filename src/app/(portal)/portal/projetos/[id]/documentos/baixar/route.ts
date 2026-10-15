import { NextResponse } from "next/server";
import { requirePortal } from "@/modules/auth/context";
import { getPortalProjectDocumentFile } from "@/modules/project-documents/queries";
import { getSignedDownloadUrl } from "@/lib/storage";
import { audit } from "@/modules/audit/log";

/**
 * Download pelo GED do projeto. Os arquivos não têm organização dona: o
 * escopo vem de projeto → empresa → organização ativa, e o arquivo precisa
 * estar entre os documentos que o cliente enxerga (pasta compartilhada).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePortal();
  const { id } = await params;
  const fd = await req.formData();
  const file = await getPortalProjectDocumentFile(ctx, id, String(fd.get("fileId") ?? ""));
  if (!file) return new NextResponse("Arquivo não encontrado", { status: 404 });

  await audit({
    actorId: ctx.user.id,
    action: "portal.file.downloaded",
    entityType: "file",
    entityId: file.id,
    organizationId: ctx.organization.id,
    metadata: { projectId: id, via: "documentos", source: file.source },
  });
  return NextResponse.redirect(await getSignedDownloadUrl(file.bucketKey, file.originalName), 303);
}
