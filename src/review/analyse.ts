// Reviews a finished game on the device:
// 1. every position gets a quick Stockfish evaluation (and its best move);
// 2. every move gets its accuracy and label (Best, Excellent, Good, Inaccuracy, Mistake, Blunder, Brilliant);
// 3. the player's worst moves (up to three) are looked at again, deeper and with the three best moves; the
//    position after the move gives the opponent's best answer; the "null move" shows whether that answer was
//    already threatened;
// 4. Maia says how many players at the player's rating would find the right move, whether the move played is the
//    usual mistake at that level, and from which rating players usually see it.
// The engine and Maia are injected, so this runs the same in the app and in tests.
import type { Chess } from 'chessops/chess';
import type { Role } from 'chessops/types';
import { REVIEW } from '../config';
import { moveFromUci, posFromFen, replay, START_FEN, type Side } from '../game/chess';
import type { EngineLine } from '../engine/stockfish';
import { accuracy, labelFor, lossAt, MATE, moverOf, scoreCp, winFor, type Label } from './classify';
import type { MomentData } from './explain';

export interface ReviewEngine {
  analyse(fen: string, opts: { depth?: number; movetime?: number; multiPv?: number }): Promise<EngineLine[]>;
}
/** Maia's move probabilities for the side to move, as a player of `selfElo` facing `oppoElo`. `fens` ends with the position. */
export type MaiaProbs = (fens: string[], selfElo: number, oppoElo: number) => Promise<{ uci: string; p: number }[]>;

export interface GameReview {
  version: 1;
  /** White's view, centipawns (mate on the same scale); index 0 = the start. */
  evals: number[];
  /** The engine's move in the position before each move. */
  best: (string | null)[];
  labels: Label[];
  accuracy: Record<Side, number | null>;
  moments: MomentData[];
  playerSide: Side;
  depth: number;
}

export interface ReviewInput {
  moves: string[];
  startFen?: string;
  playerSide: Side;
  playerRating: number;
  opponentRating: number;
}

const VALUE: Record<Role, number> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
function balance(pos: Chess, side: Side): number {
  let t = 0;
  for (const s of pos.board.occupied) {
    const p = pos.board.get(s)!;
    t += (p.color === side ? 1 : -1) * VALUE[p.role];
  }
  return t;
}

function terminalEval(fen: string): number | null {
  const pos = posFromFen(fen);
  if (pos.isCheckmate()) return pos.turn === 'white' ? -MATE : MATE;
  if (pos.isStalemate() || pos.isInsufficientMaterial()) return 0;
  return null;
}

/** The same position with the other side to move, or null when that is not a legal position (in check). */
export function nullMoveFen(fen: string): string | null {
  const pos = posFromFen(fen);
  if (pos.isCheck()) return null;
  const p = fen.split(' ');
  const flipped = [p[0], p[1] === 'w' ? 'b' : 'w', p[2], '-', p[4] ?? '0', p[5] ?? '1'].join(' ');
  try {
    const q = posFromFen(flipped);
    return q.isCheck() ? null : flipped;
  } catch {
    return null;
  }
}

/** Does `uci` give up material that the opponent's best answer (`reply`) takes, at least two pawns' worth? */
export function isSacrifice(fen: string, uci: string, reply: string | null | undefined): boolean {
  if (!reply) return false;
  const pos = posFromFen(fen);
  const side = pos.turn;
  const before = balance(pos, side);
  for (const u of [uci, reply]) {
    const m = moveFromUci(pos, u);
    if (!m || !pos.isLegal(m)) return false;
    pos.play(m);
  }
  return before - balance(pos, side) >= 2;
}

export async function reviewGame(input: ReviewInput, engine: ReviewEngine, maia?: MaiaProbs, onProgress?: (done: number, total: number) => void): Promise<GameReview> {
  const r = replay(input.moves, input.startFen ?? START_FEN);
  const fens = r.fens;
  const first: Side = posFromFen(fens[0]).turn;
  const maiaSteps = maia ? 11 : 0;
  const total = fens.length + REVIEW.moments * (3 + maiaSteps);
  let done = 0;
  const tick = () => onProgress?.(++done, total);

  // 1. Quick pass.
  const evals: number[] = [];
  const best: (string | null)[] = [];
  const replyOf: (string | null)[] = [];
  for (let i = 0; i < fens.length; i++) {
    const end = terminalEval(fens[i]);
    if (end !== null) {
      evals[i] = end;
      best[i] = null;
    } else {
      const [l] = await engine.analyse(fens[i], REVIEW.quick);
      evals[i] = l ? scoreCp(l) : (evals[i - 1] ?? 0);
      best[i] = l?.pv[0] ?? null;
      replyOf[i] = l?.pv[0] ?? null;
    }
    tick();
  }

  // 2. Labels for every move.
  const labelAt = (ply: number): Label => {
    const loss = lossAt(evals, ply, first);
    const isBest = best[ply] === input.moves[ply];
    return labelFor(loss, isBest, isBest && isSacrifice(fens[ply], input.moves[ply], replyOf[ply + 1]));
  };
  const labels: Label[] = input.moves.map((_, ply) => labelAt(ply));

  // 3. A deeper look at the player's worst moves.
  const candidates = input.moves
    .map((_, ply) => ply)
    .filter((ply) => moverOf(ply, first) === input.playerSide && lossAt(evals, ply, first) >= REVIEW.good)
    .sort((a, b) => lossAt(evals, b, first) - lossAt(evals, a, first))
    .slice(0, REVIEW.moments)
    .sort((a, b) => a - b);

  const moments: MomentData[] = [];
  for (const ply of candidates) {
    const lines = (await engine.analyse(fens[ply], REVIEW.deep)).filter(Boolean);
    tick();
    if (lines.length) {
      evals[ply] = scoreCp(lines[0]);
      best[ply] = lines[0].pv[0] ?? best[ply];
    }
    let after: EngineLine | undefined;
    const end = terminalEval(fens[ply + 1]);
    if (end !== null) evals[ply + 1] = end;
    else {
      [after] = await engine.analyse(fens[ply + 1], { depth: REVIEW.deep.depth, movetime: REVIEW.deep.movetime });
      if (after) evals[ply + 1] = scoreCp(after);
    }
    tick();
    labels[ply] = labelAt(ply);
    if (lossAt(evals, ply, first) < REVIEW.good) continue;

    const side = input.playerSide;
    const top = winFor(evals[ply], side);
    const good = lines.filter((l) => l.pv[0] && winFor(scoreCp(l), side) >= top - REVIEW.goodEnough).map((l) => l.pv[0]);
    const m: MomentData = {
      ply,
      fen: fens[ply],
      side,
      label: labels[ply],
      played: input.moves[ply],
      good: good.length ? good : best[ply] ? [best[ply]!] : [],
      line: lines[0]?.pv.slice(0, 8) ?? [],
      reply: after?.pv.slice(0, 6) ?? [],
      bestEval: evals[ply],
      playedEval: evals[ply + 1],
    };

    const nullFen = nullMoveFen(fens[ply]);
    if (nullFen && m.reply[0]) {
      const [threat] = await engine.analyse(nullFen, REVIEW.quick);
      if (threat?.pv[0] === m.reply[0] && winFor(scoreCp(threat), side) <= top - 10) m.threat = threat.pv.slice(0, 4);
    }
    tick();

    if (maia) {
      const history = fens.slice(0, ply + 1);
      const probs = await maia(history, input.playerRating, input.opponentRating);
      tick();
      const goodSet = new Set(m.good);
      const share = (pred: (u: string) => boolean) => probs.filter((p) => pred(p.uci)).reduce((a, p) => a + p.p, 0);
      const topMove = [...probs].sort((a, b) => b.p - a.p)[0]?.uci;
      let seeRating: number | null = null;
      for (let rating = 600; rating <= 2400; rating += 200) {
        const atR = await maia(history, rating, rating);
        tick();
        const t = [...atR].sort((a, b) => b.p - a.p)[0]?.uci;
        if (seeRating === null && t && goodSet.has(t)) seeRating = rating;
      }
      m.maia = {
        findShare: round3(share((u) => goodSet.has(u))),
        playedShare: round3(share((u) => u === m.played)),
        playedIsTop: topMove === m.played,
        seeRating,
        rating: input.playerRating,
      };
    }
    moments.push(m);
  }
  onProgress?.(total, total);

  return {
    version: 1,
    evals,
    best,
    labels,
    accuracy: { white: accuracy(evals, 'white', first), black: accuracy(evals, 'black', first) },
    moments,
    playerSide: input.playerSide,
    depth: REVIEW.quick.depth,
  };
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** Counts of each label for one side. */
export function labelCounts(review: GameReview, side: Side, firstMover: Side = 'white'): Record<Label, number> {
  const out = { brilliant: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 } as Record<Label, number>;
  review.labels.forEach((l, ply) => {
    if (moverOf(ply, firstMover) === side) out[l]++;
  });
  return out;
}

