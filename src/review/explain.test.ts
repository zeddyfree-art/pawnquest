import { describe, expect, it } from 'vitest';
import { accuracy, labelFor, lossAt, winPct } from './classify';
import { explain, maiaInsights, type MomentData } from './explain';
import { isSacrifice, nullMoveFen } from './analyse';

const moment = (o: Partial<MomentData>): MomentData => ({
  ply: 0, fen: '', side: 'white', label: 'blunder', played: '', good: [], line: [], reply: [], bestEval: 0, playedEval: -500, ...o,
});

describe('classification', () => {
  it('uses the brief’s thresholds', () => {
    expect([1, 3, 7, 15, 25].map((l) => labelFor(l, false))).toEqual(['excellent', 'good', 'inaccuracy', 'mistake', 'blunder']);
    expect(labelFor(0, true)).toBe('best');
    expect(labelFor(0, true, true)).toBe('brilliant');
  });
  it('Win% and accuracy behave like Lichess', () => {
    expect(winPct(0)).toBeCloseTo(50);
    expect(winPct(300)).toBeGreaterThan(70);
    expect(lossAt([0, -400], 0)).toBeGreaterThan(30);
    expect(accuracy([20, 20, 25, 20, 30], 'white')).toBeGreaterThan(95);
    expect(accuracy([20, -500, -500, -900, -900], 'white')!).toBeLessThan(40);
  });
  it('spots a sacrifice and builds the null-move position', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4: 4.Nxe5 gives the knight… no, wins a pawn; Bxf7+ Kxf7 gives a bishop for a pawn.
    const fen = 'r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    expect(isSacrifice(fen, 'c4f7', 'e8f7')).toBe(true);
    expect(isSacrifice(fen, 'f3e5', 'd8g5')).toBe(false);
    expect(nullMoveFen(fen)?.split(' ')[1]).toBe('b');
  });
});

describe('plain-English explanations', () => {
  it('missed mate', () => {
    const e = explain(moment({ fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', ply: 6, played: 'h5f3', line: ['h5f7'] }));
    expect(e.theme).toBe('Missed mate');
    expect(e.sentences[0]).toBe('There was mate in one: Qxf7#.');
    expect(e.title).toBe('4.Qf3: Blunder');
  });
  it('allowed mate', () => {
    const e = explain(moment({ fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2', ply: 2, played: 'g2g4', reply: ['d8h4'], line: ['b1c3'] }));
    expect(e.theme).toBe('Allowed mate');
    expect(e.sentences).toEqual(['After g4, your opponent has mate in 1: Qh4#.', 'Better was Nc3.']);
  });
  it('hanging piece', () => {
    const e = explain(moment({ fen: 'rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', ply: 2, played: 'c1g5', reply: ['d8g5', 'g1f3'], line: ['d4e5'] }));
    expect(e.theme).toBe('Hanging piece');
    expect(e.sentences[0]).toBe('Your bishop on g5 was undefended. The queen takes it and you lose a bishop.');
  });
  it('allowed a fork', () => {
    const e = explain(moment({ fen: '4k3/8/8/8/1n6/8/8/R3K2R w K - 0 1', ply: 0, played: 'h1h2', reply: ['b4c2', 'e1d2', 'c2a1'], line: ['a1a4'] }));
    expect(e.theme).toBe('Allowed a fork');
    expect(e.sentences[0]).toBe('After Nc2+ the knight attacks your king and rook at once.');
  });
  it('missed a free capture', () => {
    const e = explain(moment({ fen: '3k4/8/8/3r4/8/8/8/3QK3 w - - 0 1', ply: 0, played: 'e1e2', line: ['d1d5', 'd8e7'], bestEval: 900, playedEval: 0 }));
    expect(e.theme).toBe('Missed a capture');
    expect(e.sentences[0]).toBe('You could have taken the free rook on d5 with your queen (Qxd5+).');
  });
  it('falls back to what it cost and the better move', () => {
    const e = explain(moment({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', played: 'g2g4', line: ['e2e4'], bestEval: 30, playedEval: -90, label: 'inaccuracy' }));
    expect(e.theme).toBe('Positional');
    expect(e.sentences).toEqual(['This lost about a pawn (+0.3 → −0.9).', 'Better was e4.']);
  });
  it('Maia insights', () => {
    const m = moment({ maia: { findShare: 0.12, playedShare: 0.5, playedIsTop: true, seeRating: 1400, rating: 900 } });
    expect(maiaInsights(m, 'Qh7+')).toEqual([
      'Only 12% of 900-rated players find Qh7+.',
      'This is the most common mistake at your level.',
      'Players around 1400 usually see this: a good thing to learn next.',
    ]);
    // "Most players see this" only when most of them actually find it.
    const low = moment({ label: 'mistake', maia: { findShare: 0.28, playedShare: 0.1, playedIsTop: false, seeRating: 600, rating: 600 } });
    expect(maiaInsights(low, 'd4')).toEqual(['Only 28% of 600-rated players find d4.']);
    const high = moment({ label: 'mistake', maia: { findShare: 0.7, playedShare: 0.1, playedIsTop: false, seeRating: 600, rating: 600 } });
    expect(maiaInsights(high, 'd4')).toEqual(['About 70% of players around 600 find d4.', 'Most players at your level see this one.']);
  });
});
