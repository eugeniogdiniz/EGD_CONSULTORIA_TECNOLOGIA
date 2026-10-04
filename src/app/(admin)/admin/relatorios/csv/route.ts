import { requireOwner } from "@/modules/auth/context";
import { loadPortfolioData } from "@/modules/reports/queries";
import { buildPortfolio, portfolioCsv } from "@/modules/reports/build";
import { csvResponse, reportFilename, toCsv } from "@/modules/reports/csv";
import { todayInSaoPaulo } from "@/modules/reports/dates";

export async function GET() {
  const ctx = await requireOwner();
  const today = todayInSaoPaulo();
  const { headers, rows } = portfolioCsv(buildPortfolio(await loadPortfolioData(ctx), today));
  return csvResponse(reportFilename("portfolio", today), toCsv(headers, rows));
}
