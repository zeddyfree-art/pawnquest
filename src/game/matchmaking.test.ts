import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../data/characters';
import { autoMatch, nearestOpponents } from './matchmaking';
import type { GameRecord } from './progress';
import { characterRecord, crownFor, factionScores, lossStreak } from './progress';

const game = (o: Partial<GameRecord>): GameRecord => ({
  id: Math.random().toString(36), characterId: 'pip', faction: 'gambiteer', opponentRating: 600, color: 'white', moves: ['e2e4'],
  winner: 'white', termination: 'checkmate', score: 1, ratingBefore: 600, ratingAfter: 620, date: '2026-10-20T10:00:00Z', auto: true, ...o,
});

describe('matchmaking', () => {
  it('a new player meets someone just above 600, as White', () => {
    const m = autoMatch(600, []);
    expect(Math.abs(m.character.rating - 700)).toBeLessThan(250);
    expect(m.color).toBe('white');
  });
  it('aims a bit higher normally and lower after three losses', () => {
    expect(nearestOpponents(1100).every((c) => Math.abs(c.rating - 1100) <= 250)).toBe(true);
    const losses = [0, 1, 2].map(() => game({ score: 0, winner: 'black' }));
    expect(autoMatch(1150, losses).character.rating).toBeLessThan(autoMatch(1150, []).character.rating + 1);
    expect(autoMatch(1150, []).character.rating).toBeGreaterThan(1150);
  });
  it('rotates factions and targets the weakest every third game; colours alternate', () => {
    const roster = [600, 610, 620].map((rating, i) => ({ ...CHARACTERS[1 + i], rating, faction: (['gambiteer', 'classicist', 'strategist'] as const)[i] }));
    expect(autoMatch(520, [], roster).character.faction).toBe('gambiteer');
    const h = [game({ faction: 'gambiteer', score: 1 }), game({ faction: 'classicist', score: 0, color: 'black' })];
    const third = autoMatch(520, h, roster);
    expect(third.character.faction).toBe('classicist');
    expect(third.color).toBe('white');
  });
  it('never auto-picks the final boss or the training dummy', () => {
    expect(autoMatch(2600, []).character.id).not.toBe('necromancer-king');
    expect(autoMatch(400, [0, 1, 2].map(() => game({ score: 0, winner: 'black' }))).character.id).not.toBe('straw-sam');
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
