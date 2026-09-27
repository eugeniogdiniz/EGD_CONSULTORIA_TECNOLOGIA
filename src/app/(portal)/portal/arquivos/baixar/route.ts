import { NextResponse } from "next/server";
import { requirePortal } from "@/modules/auth/context";
import { getDownloadUrl } from "@/modules/files/actions";

/**
 * Download de arquivo pelo cliente: só da organização ativa. A listagem chega
 * na Fase 4; o endpoint já existe para o teste de isolamento entre organizações.
 */
export async function POST(req: Request) {
  const ctx = await requirePortal();
  const fd = await req.formData();
  const fileId = String(fd.get("fileId") ?? "");
  const r = await getDownloadUrl(ctx, fileId);
  if (!r.ok) return new NextResponse("Arquivo não encontrado", { status: 404 });
  return NextResponse.redirect(r.data.url, 303);
}
