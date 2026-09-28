/**
 * Grade mensal 6×7 pro calendário do projeto. Sempre em UTC pra
 * o dia ficar estável independente do fuso do servidor. A semana começa
 * em segunda (Seg=0..Dom=6), mesmo padrão do mockup.
 */

export type MonthGridDay = {
  date: Date;
  day: number;
  outside: boolean;
};

export type MonthGrid = {
  year: number;
  month: number;
  weeks: MonthGridDay[][];
};

export function parseYearMonth(input: string): { year: number; month: number } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(input);
  if (!match) throw new Error(`Formato inválido: "${input}". Esperado AAAA-MM.`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

function dayOfMonthUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

// getUTCDay(): 0=Dom, 1=Seg, ..., 6=Sáb. A grade quer Seg=0..Dom=6.
function mondayFirstIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

export function buildMonthGrid(input: string | { year: number; month: number }): MonthGrid {
  const { year, month } =
    typeof input === "string" ? parseYearMonth(input) : input;

  const first = dayOfMonthUTC(year, month, 1);
  const offset = mondayFirstIndex(first);
  const startDate = new Date(first.getTime());
  startDate.setUTCDate(startDate.getUTCDate() - offset);

  const weeks: MonthGridDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: MonthGridDay[] = [];
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      const date = new Date(startDate.getTime());
      date.setUTCDate(date.getUTCDate() + idx);
      row.push({
        date,
        day: date.getUTCDate(),
        outside: date.getUTCMonth() !== month - 1 || date.getUTCFullYear() !== year,
      });
    }
    weeks.push(row);
  }

  return { year, month, weeks };
}
