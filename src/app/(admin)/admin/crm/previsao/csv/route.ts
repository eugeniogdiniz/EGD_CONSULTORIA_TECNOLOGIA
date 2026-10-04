import { requireOwner } from "@/modules/auth/context";
import { loadForecastInput } from "@/modules/crm/queries";
import { buildForecast, forecastCsv } from "@/modules/crm/forecast";
import { csvResponse, reportFilename, toCsv } from "@/modules/reports/csv";
import { todayInSaoPaulo } from "@/modules/reports/dates";

export async function GET() {
  const ctx = await requireOwner();
  const today = todayInSaoPaulo();
  const { headers, rows } = forecastCsv(buildForecast(await loadForecastInput(ctx), today));
  return csvResponse(reportFilename("previsao", today), toCsv(headers, rows));
}
