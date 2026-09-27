import { NextResponse } from "next/server";
import { requireAdmin } from "@/modules/auth/context";
import { getDownloadUrl } from "@/modules/files/actions";

/** Redireciona para a URL assinada (5 min) após checar a sessão de admin. */
export async function GET(_req: Request, { params }: RouteContext<"/admin/arquivos/[id]/baixar">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const r = await getDownloadUrl(ctx, id);
  if (!r.ok) return new NextResponse("Arquivo não encontrado", { status: 404 });
  return NextResponse.redirect(r.data.url, 302);
}
