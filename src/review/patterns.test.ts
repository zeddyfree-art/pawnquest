import { describe, expect, it } from 'vitest';
import type { GameRecord } from '../game/progress';
import type { GameReview } from './analyse';
import type { Label } from './classify';
import { mistakePatterns } from './patterns';

const moves = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d3', 'd7d6', 'e1g1', 'e8g8', 'f1e1', 'a7a6', 'b1d2', 'c8e6', 'c4e6', 'f7e6', 'd2f1', 'd8e8', 'f1g3', 'e8g6', 'h2h3', 'a8d8'];
const game = (id: string): GameRecord => ({ id, characterId: 'pip', faction: 'gambiteer', opponentRating: 600, color: 'white', moves, winner: null, termination: 'agreement', score: 0.5, ratingBefore: 600, ratingAfter: 600, date: '', auto: false });
const review = (labels: Label[]): GameReview => ({ version: 1, evals: [], best: [], labels, accuracy: { white: 80, black: 70 }, moments: [], playerSide: 'white', depth: 12 });

describe('mistake patterns', () => {
  it('counts only reviewed games and finds the phase with the most errors', () => {
    // White errs in the opening (plies 0–19) and plays well after.
    const labels: Label[] = moves.map((_, ply) => (ply % 2 === 0 && ply < 20 ? 'mistake' : 'best'));
    const p = mistakePatterns({ a: review(labels) }, [game('a'), game('b')]);
    expect(p.games).toBe(1);
    expect(p.accuracy).toBe(80);
    expect(p.phases.opening).toBe(20);
    expect(p.weakPhase).toBe('opening');
  });
  it('says nothing without reviews', () => {
    const p = mistakePatterns({}, [game('a')]);
    expect(p).toMatchObject({ games: 0, themes: [], weakPhase: null, accuracy: null });
  });
});
