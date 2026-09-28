/**
 * Arestas do DAG de dependências: `predecessorId → successorId` significa
 * "successor depende de predecessor" (a entrega successor só pode começar
 * quando predecessor termina).
 */
export type DependencyEdge = {
  predecessorId: string;
  successorId: string;
};

/**
 * Devolve true se adicionar a aresta `predecessorId → successorId` ao grafo
 * atual fecharia um ciclo. Puro; sem side effects.
 *
 * Estratégia: BFS partindo de `successorId` seguindo arestas no sentido
 * predecessor→successor. Se alcança `predecessorId`, a nova aresta fecha
 * ciclo (successor já é ancestral de predecessor).
 *
 * Auto-loop é sempre ciclo (`predecessorId === successorId`).
 */
export function detectDependencyCycle(
  edges: readonly DependencyEdge[],
  predecessorId: string,
  successorId: string,
): boolean {
  if (predecessorId === successorId) return true;

  const outgoing = new Map<string, string[]>();
  for (const e of edges) {
    const list = outgoing.get(e.predecessorId);
    if (list) list.push(e.successorId);
    else outgoing.set(e.predecessorId, [e.successorId]);
  }

  const visited = new Set<string>();
  const queue: string[] = [successorId];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node === predecessorId) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    const next = outgoing.get(node);
    if (next) queue.push(...next);
  }
  return false;
}
