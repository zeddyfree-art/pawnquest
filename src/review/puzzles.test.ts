import { describe, expect, it } from 'vitest';
import type { GameReview } from './analyse';
import type { MomentData } from './explain';
import { judgeMove, puzzleCounts, puzzlesFrom } from './puzzles';

// White can take a free queen (Qxd5) but played Ke2.
const FEN = '4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1';
const moment = (o: Partial<MomentData> = {}): MomentData => ({
  ply: 20,
  fen: FEN,
  side: 'white',
  label: 'blunder',
  played: 'e1e2',
  good: ['d1d5'],
  line: ['d1d5', 'e8e7'],
  reply: ['d5d1'],
  bestEval: 900,
  playedEval: -900,
  ...o,
});
const review = (moments: MomentData[]): GameReview => ({ version: 1, evals: [], best: [], labels: [], accuracy: { white: 50, black: 50 }, moments, playerSide: 'white', depth: 12 });
const game = { id: 'g1', characterId: 'pip', date: '2026-10-21T10:00:00Z' };

describe('puzzle book', () => {
  it('turns the player’s mistakes and blunders into puzzles, not inaccuracies or the opponent’s moves', () => {
    const ps = puzzlesFrom(review([moment(), moment({ ply: 22, label: 'inaccuracy' }), moment({ ply: 21, side: 'black' })]), game);
    expect(ps).toHaveLength(1);
    expect(ps[0]).toMatchObject({ id: 'g1:20', gameId: 'g1', characterId: 'pip', fen: FEN, good: ['d1d5'], played: 'e1e2' });
    expect(ps[0].theme).toBeTruthy();
  });

  it('judges a move: the good moves count, the move played does not, others by the engine', async () => {
    const [p] = puzzlesFrom(review([moment()]), game);
    const never = async () => {
      throw new Error('the engine should not be asked');
    };
    expect(await judgeMove(p, 'd1d5', '', never)).toBe(true);
    expect(await judgeMove(p, 'e1e2', '', never)).toBe(false);
    // Another move: about as good by the engine counts, clearly worse does not.
    expect(await judgeMove(p, 'd1d2', '4k3/8/8/3q4/8/8/3Q4/4K3 b - - 1 1', async () => ({ cp: 880 }))).toBe(true);
    expect(await judgeMove(p, 'd1d2', '4k3/8/8/3q4/8/8/3Q4/4K3 b - - 1 1', async () => ({ cp: 0 }))).toBe(false);
  });

  it('counts solved puzzles and first tries', () => {
    expect(puzzleCounts({ a: { solved: true, firstTry: true, date: '' }, b: { solved: true, firstTry: false, date: '' }, c: { solved: false, firstTry: false, date: '' } })).toEqual({ solved: 2, firstTry: 1 });
  });
});
