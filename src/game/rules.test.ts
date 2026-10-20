import { describe, expect, it } from 'vitest';
import { posFromFen, replay, sanToUci, START_FEN, uciFromBoard, legalUcis } from './chess';
import { boardResult, timeoutResult } from './rules';

function line(sans: string): string[] {
  const out: string[] = [];
  for (const s of sans.split(' ')) out.push(sanToUci(replay(out).pos, s)!);
  return out;
}

describe('game end', () => {
  it('checkmate', () => {
    expect(boardResult(line('f3 e5 g4 Qh4#'))).toEqual({ winner: 'black', termination: 'checkmate' });
  });
  it('threefold repetition', () => {
    expect(boardResult(line('Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8'))).toEqual({ winner: null, termination: 'repetition' });
    expect(boardResult(line('Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1'))).toBeNull();
  });
  it('stalemate', () => {
    // Sam Loyd's 10-move stalemate.
    expect(boardResult(line('e3 a5 Qh5 Ra6 Qxa5 h5 h4 Rah6 Qxc7 f6 Qxd7+ Kf7 Qxb7 Qd3 Qxb8 Qh7 Qxc8 Kg6 Qe6'))).toEqual({ winner: null, termination: 'stalemate' });
  });
  it('time-out is a draw when the other side cannot mate', () => {
    const pos = posFromFen('8/8/8/4k3/8/8/8/4K2B w - - 0 1');
    expect(timeoutResult(pos, 'black')).toEqual({ winner: null, termination: 'timeout' });
    expect(timeoutResult(posFromFen(START_FEN), 'black')).toEqual({ winner: 'white', termination: 'timeout' });
  });
});

describe('moves', () => {
  it('castling is stored as the king moving two squares', () => {
    const moves = line('e4 e5 Nf3 Nc6 Bc4 Bc5 O-O');
    expect(moves[6]).toBe('e1g1');
    const pos = replay(moves.slice(0, 6)).pos;
    expect(uciFromBoard(pos, 'e1', 'g1')).toBe('e1g1');
    expect(uciFromBoard(pos, 'e1', 'h1')).toBe('e1g1');
    expect(legalUcis(pos)).toContain('e1g1');
  });
  it('promotions carry the piece letter', () => {
    const pos = posFromFen('8/P7/8/8/8/8/8/k6K w - - 0 1');
    expect(uciFromBoard(pos, 'a7', 'a8', 'knight')).toBe('a7a8n');
    expect(legalUcis(pos)).toEqual(expect.arrayContaining(['a7a8q', 'a7a8r', 'a7a8b', 'a7a8n']));
  });
});
