// Ratings from game results: the Bradley–Terry (Elo) maximum-likelihood fit by Hunter's MM iteration, draws
// counting half a win for each side, plus one virtual draw against a player at the ladder rating so sparse
// records stay finite. The scale is anchored so the mean of the fitted ratings equals the mean of the ladder
// ratings: calibration measures the gaps.
export interface Result {
  white: string;
  black: string;
  score: number;
}

export function fitRatings(results: readonly Result[], targets: Record<string, number>, iterations = 500): Record<string, number> {
  const ids = Object.keys(targets);
  const strength = (elo: number) => 10 ** (elo / 400);
  const g: Record<string, number> = Object.fromEntries(ids.map((id) => [id, strength(targets[id])]));
  const wins: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0.5])); // the virtual draw
  const games = new Map<string, Map<string, number>>(ids.map((id) => [id, new Map()]));
  for (const r of results) {
    if (!(r.white in g) || !(r.black in g)) continue;
    wins[r.white] += r.score;
    wins[r.black] += 1 - r.score;
    games.get(r.white)!.set(r.black, (games.get(r.white)!.get(r.black) ?? 0) + 1);
    games.get(r.black)!.set(r.white, (games.get(r.black)!.get(r.white) ?? 0) + 1);
  }
  for (let it = 0; it < iterations; it++) {
    for (const i of ids) {
      let denom = 1 / (g[i] + strength(targets[i])); // the virtual game
      for (const [j, n] of games.get(i)!) denom += n / (g[i] + g[j]);
      g[i] = wins[i] / denom;
    }
  }
  const elo = Object.fromEntries(ids.map((id) => [id, 400 * Math.log10(g[id])]));
  const shift = ids.reduce((a, id) => a + targets[id] - elo[id], 0) / ids.length;
  return Object.fromEntries(ids.map((id) => [id, Math.round(elo[id] + shift)]));
}

/** Score of `a` against `b` over their games. */
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
