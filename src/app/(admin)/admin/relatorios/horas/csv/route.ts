import { requireOwner } from "@/modules/auth/context";
import { listHoursByPerson } from "@/modules/projects/queries";
import { buildHoursReport, hoursCsv } from "@/modules/reports/hours";
import { csvResponse, toCsv } from "@/modules/reports/csv";
import { todayInSaoPaulo } from "@/modules/reports/dates";
import { isIsoDate } from "@/lib/iso-date";

export async function GET(req: Request) {
  const ctx = await requireOwner();
  const u = new URL(req.url);
  const today = todayInSaoPaulo();
  const from = isIsoDate(u.searchParams.get("de") ?? "") ? (u.searchParams.get("de") as string) : `${today.slice(0, 7)}-01`;
  const to = isIsoDate(u.searchParams.get("ate") ?? "") ? (u.searchParams.get("ate") as string) : today;
  const rows = await listHoursByPerson(ctx, { from, to, userId: u.searchParams.get("pessoa") ?? "", projectId: u.searchParams.get("projeto") ?? "" });
  const { headers, rows: body } = hoursCsv(buildHoursReport(rows));
  return csvResponse(`relatorio-horas-${from}-a-${to}.csv`, toCsv(headers, body));
}
