import { requireOwner } from "@/modules/auth/context";
import { loadProjectStatus } from "@/modules/reports/queries";
import { buildProjectStatus, projectStatusCsv } from "@/modules/reports/build";
import { csvResponse, reportFilename, toCsv } from "@/modules/reports/csv";
import { todayInSaoPaulo } from "@/modules/reports/dates";

/** CSV do relatório de status: uma linha por entrega, mesmos números da página. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOwner();
  const { id } = await params;
  const data = await loadProjectStatus(ctx, id);
  if (!data) return new Response("Projeto não encontrado", { status: 404 });
  const today = todayInSaoPaulo();
  const { headers, rows } = projectStatusCsv(data.input, buildProjectStatus(data.input, today), today);
  return csvResponse(reportFilename(data.slug, today), toCsv(headers, rows));
}
