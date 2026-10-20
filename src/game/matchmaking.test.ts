import { describe, expect, it } from 'vitest';
import { autoMatch, nearestRank } from './matchmaking';
import type { GameRecord } from './progress';
import { characterRecord, crownFor, factionScores, lossStreak } from './progress';

const game = (o: Partial<GameRecord>): GameRecord => ({
  id: Math.random().toString(36), characterId: 'pip', faction: 'gambiteer', opponentRating: 600, color: 'white', moves: ['e2e4'],
  winner: 'white', termination: 'checkmate', score: 1, ratingBefore: 600, ratingAfter: 620, date: '2026-10-20T10:00:00Z', auto: true, ...o,
});

describe('matchmaking', () => {
  it('a new player meets the 600 rank, as White', () => {
    const m = autoMatch(600, []);
    expect(m.character.rating).toBe(600);
    expect(m.color).toBe('white');
  });
  it('aims a bit higher normally and lower after three losses', () => {
    expect(nearestRank(1000 + 100)).toBe(1000);
    expect(autoMatch(1150, []).character.rating).toBe(1200);
    const losses = [0, 1, 2].map(() => game({ score: 0, winner: 'black' }));
    expect(autoMatch(1150, losses).character.rating).toBe(1000);
    expect(autoMatch(600, losses).character.id).toBe('straw-sam');
  });
  it('rotates factions and targets the weakest every third game; colours alternate', () => {
    expect(autoMatch(1000, []).character.faction).toBe('gambiteer');
    const h = [game({ faction: 'gambiteer', score: 1 }), game({ faction: 'classicist', score: 0, color: 'black' })];
    const third = autoMatch(1000, h);
    expect(third.character.faction).toBe('classicist');
    expect(third.color).toBe('white');
  });
  it('never auto-picks the final boss', () => {
    expect(autoMatch(2600, []).character.id).not.toBe('necromancer-king');
  });
});

describe('progress', () => {
  it('records, crowns and faction scores', () => {
    const h = [game({}), game({ score: 0.5, winner: null }), game({ score: 0, winner: 'black' }), game({ moves: ['e2e4', 'e7e5', 'd1h5'] })];
    const r = characterRecord(h, 'pip');
    expect(r).toMatchObject({ games: 4, wins: 2, draws: 1, losses: 1, bestWin: 1, crown: 'bronze' });
    expect(crownFor(5)).toBe('gold');
    expect(factionScores(h).gambiteer).toBe(63);
    expect(lossStreak(h)).toBe(0);
  });
});
