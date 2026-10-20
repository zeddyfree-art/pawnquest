// Ratings from game results: the Elo (Bradley–Terry) maximum-likelihood fit, draws counting half, with a weak
// prior towards each character's ladder rating so that sparse pairs cannot run away. The scale is anchored so
// the mean of the fitted ratings equals the mean of the ladder ratings: calibration measures the gaps.
export interface Result {
  white: string;
  black: string;
  score: number;
}

export function fitRatings(results: readonly Result[], targets: Record<string, number>, iterations = 2000): Record<string, number> {
  const ids = Object.keys(targets);
  const r: Record<string, number> = { ...targets };
  const lr = 8;
  const priorWeight = 0.02; // games' worth of pull towards the target
  for (let it = 0; it < iterations; it++) {
    const grad: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
    for (const g of results) {
      const e = 1 / (1 + 10 ** ((r[g.black] - r[g.white]) / 400));
      grad[g.white] += g.score - e;
      grad[g.black] -= g.score - e;
    }
    for (const id of ids) r[id] += lr * (grad[id] + priorWeight * ((targets[id] - r[id]) / 400));
    const shift = ids.reduce((a, id) => a + targets[id] - r[id], 0) / ids.length;
    for (const id of ids) r[id] += shift;
  }
  return Object.fromEntries(ids.map((id) => [id, Math.round(r[id])]));
}

/** Score of `a` against `b` over their games (null when none). */
export function headToHead(results: readonly Result[], a: string, b: string): { games: number; score: number } {
  let games = 0;
  let score = 0;
  for (const g of results) {
    if (g.white === a && g.black === b) {
      games++;
      score += g.score;
    } else if (g.white === b && g.black === a) {
      games++;
      score += 1 - g.score;
    }
  }
  return { games, score };
}
