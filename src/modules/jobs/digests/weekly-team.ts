/**
 * Relatório semanal da equipe por e-mail: o mesmo `buildWeekly` da Fase 12,
 * para a semana que acabou de fechar (segunda a domingo anteriores).
 */
import { loadPortfolioData } from "@/modules/reports/queries";
import { buildWeekly, type WeeklyReport } from "@/modules/reports/build";
import { addDays, mondayOf } from "@/modules/reports/dates";
import { SYSTEM_CONTEXT } from "../system-context";

/** Segunda-feira da semana anterior à de `today`. */
export const previousMonday = (today: string) => mondayOf(addDays(mondayOf(today), -1));

export async function loadWeeklyTeamReport(today: string): Promise<WeeklyReport> {
  const projects = await loadPortfolioData(SYSTEM_CONTEXT, { includeClosed: true });
  return buildWeekly(projects, previousMonday(today), today);
}
