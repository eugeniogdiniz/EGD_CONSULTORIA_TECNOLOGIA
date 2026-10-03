import { NextResponse } from "next/server";
import { requirePortal } from "@/modules/auth/context";
import { openNotification } from "@/modules/notifications/actions";

/** Marca a notificação como lida e segue para o item. Só a própria pessoa. */
export async function GET(req: Request, { params }: RouteContext<"/portal/notificacoes/[id]/abrir">) {
  const ctx = await requirePortal();
  const { id } = await params;
  const r = await openNotification(ctx, id);
  return NextResponse.redirect(new URL(r?.url ?? "/portal/notificacoes", req.url), 303);
}
