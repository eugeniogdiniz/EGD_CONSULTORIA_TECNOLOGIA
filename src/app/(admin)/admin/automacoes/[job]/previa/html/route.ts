import { requireAdmin } from "@/modules/auth/context";
import { baseUrl, getJob } from "@/modules/jobs/registry";
import { todayInSaoPaulo } from "@/modules/reports/dates";

/**
 * O HTML do e-mail como seria enviado, para o iframe da prévia. A CSP desta
 * rota (next.config) impede script e recurso externo; só o próprio admin pode
 * emoldurar a página.
 */
export async function GET(req: Request, { params }: RouteContext<"/admin/automacoes/[job]/previa/html">) {
  await requireAdmin();
  const { job: key } = await params;
  const job = getJob(key);
  if (!job) return new Response("Não encontrada", { status: 404 });
  const organizationId = new URL(req.url).searchParams.get("org") ?? undefined;
  const now = new Date();
  const preview = await job.preview({ now, today: todayInSaoPaulo(now), baseUrl: baseUrl() }, { organizationId });
  if (preview.kind !== "mail" || !preview.html) return new Response("Sem e-mail para mostrar", { status: 404 });
  return new Response(preview.html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
