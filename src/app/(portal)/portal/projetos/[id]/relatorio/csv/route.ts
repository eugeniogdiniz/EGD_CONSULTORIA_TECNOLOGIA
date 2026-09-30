import { requirePortal } from "@/modules/auth/context";
import { loadClientReport } from "@/modules/reports/portal-queries";
import { clientReportCsv } from "@/modules/reports/build";
import { csvResponse, reportFilename, toCsv } from "@/modules/reports/csv";
import { todayInSaoPaulo } from "@/modules/reports/dates";

/** CSV do cliente: só entregas visíveis, sem horas nem valores. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePortal();
  const { id } = await params;
  const data = await loadClientReport(ctx, id);
  if (!data) return new Response("Projeto não encontrado", { status: 404 });
  const { headers, rows } = clientReportCsv(data.input);
  return csvResponse(reportFilename(data.slug, todayInSaoPaulo()), toCsv(headers, rows));
}
