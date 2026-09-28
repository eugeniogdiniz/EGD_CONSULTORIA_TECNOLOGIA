/**
 * Reordena uma lista de itens com `position`, movendo o item `movedId`
 * uma casa acima ou abaixo, e renumera todas as posições em 0..n-1.
 * Puro: não muta a lista de entrada.
 *
 * Devolve uma lista com o mesmo tamanho, mesmos ids, na ordem final e
 * com `position` sequencial. Se o item não existe ou está na borda pra
 * direção pedida, devolve a lista original ordenada (no-op silencioso).
 */
export function reorderPositions<T extends { id: string; position: number }>(
  items: readonly T[],
  movedId: string,
  direction: "up" | "down",
): T[] {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const index = sorted.findIndex((i) => i.id === movedId);
  if (index === -1) return renumber(sorted);

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= sorted.length) return renumber(sorted);

  const next = sorted.slice();
  [next[index], next[swapWith]] = [next[swapWith], next[index]];
  return renumber(next);
}

function renumber<T extends { position: number }>(items: T[]): T[] {
  return items.map((item, i) => ({ ...item, position: i }));
}
