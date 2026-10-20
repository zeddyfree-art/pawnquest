// Across your reviewed games: which kinds of mistakes come back most, in which phase of the game they happen, and
// what to study for each. The kinds come from the explanations of the key moments (the costliest moves of
// every game); the phases from all of your inaccuracies, mistakes and blunders.
import { replay, pieceMaterial } from '../game/chess';
import type { GameRecord } from '../game/progress';
import type { GameReview } from './analyse';
import { explain } from './explain';

export type Phase = 'opening' | 'middlegame' | 'endgame';

export interface Pattern {
  theme: string;
  count: number;
  advice: string;
}

export interface Patterns {
  games: number;
  /** Most frequent first. */
  themes: Pattern[];
  phases: Record<Phase, number>;
  /** The phase with the most errors per move played in it, when there is a clear one. */
  weakPhase: Phase | null;
  accuracy: number | null;
}

const ADVICE: Record<string, string> = {
  'Hanging piece': 'Before every move, ask: “What does this leave undefended?” Practise counting attackers and defenders, and do a quick blunder check before you let go of the piece.',
  'Allowed mate': 'Look at every check your opponent could give after your move. Study the common mating patterns: back-rank mate, smothered mate, the queen-and-bishop mate.',
  'Missed mate': 'Checks first: look at every check you can give, every move. Mate-in-one and mate-in-two puzzles train exactly this.',
  'Allowed a fork': 'Watch the squares your opponent’s knights and queen can jump to, and keep your king and big pieces off the same lines. Fork puzzles help.',
  'Missed a fork': 'Look for moves that attack two things at once, above all knight jumps and queen moves. Do a few fork and double-attack puzzles each day.',
  'Missed a capture': 'Every move, look at all captures first: is something free? Puzzles on hanging pieces build the habit.',
  'Missed a pin': 'Look for an enemy piece standing in front of its king or queen on a line: that is a pin waiting to happen. Study pins and skewers.',
  'Allowed a pin': 'Do not line up your king or queen behind another piece on an open line or diagonal. Study pins and skewers.',
  'Missed a threat': 'After every move of your opponent, ask: “What does that threaten?” before you look for your own plan.',
  'Missed a win': 'You reach winning positions: now learn to finish them. Practise converting, keep it simple, and trade when ahead.',
  Positional: 'Your losses come from slow moves rather than tactics: put your pieces on active squares, make a plan, and study pawn structures and good versus bad pieces.',
};

const PHASE_ADVICE: Record<Phase, string> = {
  opening: 'Most of your errors come in the opening. Learn the ideas behind your first moves: control the centre, develop knights and bishops, castle early, and do not move the same piece twice.',
  middlegame: 'Most of your errors come in the middlegame. Slow down when the position gets sharp, and look at checks, captures and threats for both sides.',
  endgame: 'Most of your errors come in the endgame. Study the basics: king activity, passed pawns, the opposition, and rook endgames.',
};
export const phaseAdvice = (p: Phase) => PHASE_ADVICE[p];

function phaseOf(ply: number, fen: string): Phase {
  if (ply < 20) return 'opening';
  // An endgame: little non-pawn material left (Lichess-like: about two minor pieces and a rook each, or less).
  const pos = replay([], fen).pos;
  return pieceMaterial(pos, 'white') + pieceMaterial(pos, 'black') <= 22 ? 'endgame' : 'middlegame';
}

export function mistakePatterns(reviews: Record<string, GameReview>, history: readonly GameRecord[]): Patterns {
  const byTheme = new Map<string, number>();
  const errors: Record<Phase, number> = { opening: 0, middlegame: 0, endgame: 0 };
  const moves: Record<Phase, number> = { opening: 0, middlegame: 0, endgame: 0 };
  const acc: number[] = [];
  let games = 0;
  for (const g of history) {
    const r = reviews[g.id];
    if (!r) continue;
    games++;
    const me = r.playerSide;
    if (r.accuracy[me] !== null) acc.push(r.accuracy[me]!);
    for (const m of r.moments) {
      if (m.side !== me || !['inaccuracy', 'mistake', 'blunder'].includes(m.label)) continue;
      const theme = explain(m).theme;
      byTheme.set(theme, (byTheme.get(theme) ?? 0) + 1);
    }
    let fens: string[];
    try {
      fens = replay(g.moves, g.startFen).fens;
    } catch {
      continue;
    }
    const first = fens[0].split(' ')[1] === 'w' ? 'white' : 'black';
    r.labels.forEach((l, ply) => {
      const side = (ply % 2 === 0) === (first === 'white') ? 'white' : 'black';
      if (side !== me) return;
      const ph = phaseOf(ply, fens[ply]);
      moves[ph]++;
      if (l === 'inaccuracy' || l === 'mistake' || l === 'blunder') errors[ph] += l === 'inaccuracy' ? 1 : l === 'mistake' ? 2 : 3;
    });
  }
  const themes = [...byTheme.entries()]
    .map(([theme, count]) => ({ theme, count, advice: ADVICE[theme] ?? ADVICE.Positional }))
    .sort((a, b) => b.count - a.count);
  // The weak phase: the highest error rate, if clearly above the others and with enough moves to judge.
  const rate = (p: Phase) => (moves[p] >= 10 ? errors[p] / moves[p] : 0);
  const ranked = (['opening', 'middlegame', 'endgame'] as const).slice().sort((a, b) => rate(b) - rate(a));
  const weakPhase = rate(ranked[0]) > 0 && rate(ranked[0]) >= 1.3 * rate(ranked[1]) ? ranked[0] : null;
  return { games, themes, phases: errors, weakPhase, accuracy: acc.length ? Math.round(acc.reduce((a, b) => a + b, 0) / acc.length) : null };
}
