import { describe, expect, it } from 'vitest';
import { gamePgn, lichessGameUrl, lichessPositionUrl, movetext } from './pgn';
import type { GameRecord } from './progress';

const game: GameRecord = {
  id: 'g1',
  characterId: 'pip',
  faction: 'neutral' as GameRecord['faction'],
  opponentRating: 600,
  color: 'black',
  moves: ['f2f3', 'e7e5', 'g2g4', 'd8h4'],
  winner: 'black',
  termination: 'checkmate',
  score: 1,
  ratingBefore: 800,
  ratingAfter: 810,
  date: '2026-10-29T12:00:00.000Z',
  auto: false,
};

describe('pgn', () => {
  it('numbers the moves', () => {
    expect(movetext(game.moves)).toBe('1. f3 e5 2. g4 Qh4#');
  });

  it('starts with "1..." when Black moves first', () => {
    expect(movetext(['e7e5'], 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')).toBe('1... e5');
  });

  it('writes the headers, with our own Source and YourColor', () => {
    const pgn = gamePgn(game, 'Zed "the" Hero', 'Pip');
    expect(pgn).toContain('[White "Pip"]');
    expect(pgn).toContain('[Black "Zed \\"the\\" Hero"]');
    expect(pgn).toContain('[Result "0-1"]');
    expect(pgn).toContain('[WhiteElo "600"]');
    expect(pgn).toContain('[BlackElo "800"]');
    expect(pgn).toContain('[Source "Pawnquest"]');
    expect(pgn).toContain('[YourColor "Black"]');
    expect(pgn).toContain('[Termination "Checkmate"]');
    expect(pgn.trim().endsWith('1. f3 e5 2. g4 Qh4# 0-1')).toBe(true);
    expect(pgn).not.toContain('[FEN');
  });

  it('links to the Lichess analysis board', () => {
    expect(lichessGameUrl(game, 2)).toBe('https://lichess.org/analysis/pgn/1._f3_e5_2._g4_Qh4%23#2');
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    expect(lichessGameUrl({ moves: ['e7e5'], startFen: fen })).toBe(lichessPositionUrl('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'));
    expect(lichessPositionUrl(fen)).toBe('https://lichess.org/analysis/standard/rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR_b_KQkq_-_0_1');
  });
});
