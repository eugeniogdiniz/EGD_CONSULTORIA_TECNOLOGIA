import { requireAdmin } from "@/modules/auth/context";
import { loadPortfolioData } from "@/modules/reports/queries";
import { buildWeekly, weeklyCsv } from "@/modules/reports/build";
import { csvResponse, toCsv } from "@/modules/reports/csv";
import { parseWeekParam, todayInSaoPaulo } from "@/modules/reports/dates";

export async function GET(req: Request) {
  const ctx = await requireAdmin();
  const today = todayInSaoPaulo();
  const monday = parseWeekParam(new URL(req.url).searchParams.get("semana") ?? undefined, today);
  const w = buildWeekly(await loadPortfolioData(ctx, { includeClosed: true }), monday, today);
  const { headers, rows } = weeklyCsv(w);
  return csvResponse(`relatorio-semanal-${w.label}.csv`, toCsv(headers, rows));
}
