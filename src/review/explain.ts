// Plain-English explanations of a key moment, from rules plus the engine's lines (no LLM). Each pattern reads
// the position before the move, the move played, the engine's best line and the opponent's best answer:
// - allowed mate / missed mate: a line ends in checkmate;
// - hanging piece: the answer captures a piece of yours and the material stays lost;
// - fork: after a move the moved piece attacks two valuable pieces (or the king and one) and material is won;
// - missed capture: the better move simply takes a piece and keeps it;
// - pin: a bishop, rook or queen attacks a piece with a more valuable one (or the king) behind it;
// - threat: the opponent's punishing answer was already threatened before your move;
// - otherwise: how much it cost, and the better move.
import { attacks, between } from 'chessops';
import type { Chess } from 'chessops/chess';
import { makeSan } from 'chessops/san';
import { makeSquare } from 'chessops/util';
import type { NormalMove, Piece, Role, Square } from 'chessops/types';
import { moveFromUci, other, posFromFen, type Side } from '../game/chess';
import { formatEval, LABEL_INFO, MATE, type Label } from './classify';

export interface MomentData {
  ply: number;
  /** Position before the move. */
  fen: string;
  side: Side;
  label: Label;
  /** The move played (standard UCI). */
  played: string;
  /** Moves about as good as the best, best first (UCI). */
  good: string[];
  /** The engine's line from the position (UCI), starting with the best move. */
  line: string[];
  /** The opponent's best answer to the move played, and what follows (UCI). */
  reply: string[];
  /** What the opponent was threatening before the move, when that is what punished it (UCI line from the null-move position). */
  threat?: string[];
  /** Evaluations after the best move and after the move played (White's view). */
  bestEval: number;
  playedEval: number;
  /** Maia at the player's rating. */
  maia?: { findShare: number; playedShare: number; playedIsTop: boolean; seeRating: number | null; rating: number };
}

const VALUE: Record<Role, number> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
const NAME: Record<Role, string> = { pawn: 'pawn', knight: 'knight', bishop: 'bishop', rook: 'rook', queen: 'queen', king: 'king' };
const sq = (s: Square) => makeSquare(s);

interface Step {
  before: Chess;
  move: NormalMove;
  piece: Piece;
  captured?: Role;
  san: string;
}

/** Plays a UCI line on a copy of `start`, stopping at the first illegal move. */
function playLine(start: Chess, ucis: readonly string[]): { end: Chess; steps: Step[] } {
  const pos = start.clone();
  const steps: Step[] = [];
  for (const uci of ucis) {
    const m = moveFromUci(pos, uci);
    if (!m || !('from' in m) || !pos.isLegal(m)) break;
    const piece = pos.board.get(m.from);
    if (!piece) break;
    const target = pos.board.get(m.to);
    const captured = target && target.color !== piece.color ? target.role : piece.role === 'pawn' && (m.from & 7) !== (m.to & 7) ? 'pawn' : undefined;
    const san = makeSan(pos, m);
    steps.push({ before: pos.clone(), move: m, piece: m.promotion ? { ...piece, role: m.promotion } : piece, captured, san });
    pos.play(m);
  }
  return { end: pos, steps };
}

function material(pos: Chess, side: Side): number {
  let t = 0;
  for (const s of pos.board[side]) t += VALUE[pos.board.getRole(s)!];
  return t;
}
const balance = (pos: Chess, side: Side) => material(pos, side) - material(pos, other(side));

/** The two most valuable targets the piece on `to` attacks (king first), or null when fewer than two. */
function forkTargets(after: Chess, to: Square, piece: Piece): Role[] | null {
  const hit = attacks(piece, to, after.board.occupied).intersect(after.board[other(piece.color)]);
  const roles: Role[] = [];
  for (const s of hit) {
    const r = after.board.getRole(s)!;
    if (r === 'king' || (r !== 'pawn' && VALUE[r] >= Math.max(3, VALUE[piece.role]))) roles.push(r);
  }
  roles.sort((a, b) => (a === 'king' ? -1 : b === 'king' ? 1 : VALUE[b] - VALUE[a]));
  return roles.length >= 2 ? roles.slice(0, 2) : null;
}

/** [pinned, behind] when the slider on `to` pins or skewers, else null. */
function pinOf(after: Chess, to: Square, piece: Piece): [Role, Role] | null {
  if (piece.role !== 'bishop' && piece.role !== 'rook' && piece.role !== 'queen') return null;
  const occ = after.board.occupied;
  const enemy = after.board[other(piece.color)];
  for (const s of attacks(piece, to, occ).intersect(enemy)) {
    const front = after.board.getRole(s)!;
    for (const b of attacks(piece, to, occ.without(s)).diff(attacks(piece, to, occ)).intersect(enemy)) {
      if (!between(to, b).has(s)) continue;
      const back = after.board.getRole(b)!;
      if ((back === 'king' && front !== 'pawn') || VALUE[back] > VALUE[front] + 1) return [front, back];
    }
  }
  return null;
}

const mateIn = (plies: number) => Math.ceil(plies / 2);
const ownMoves = (steps: Step[], side: Side) => steps.filter((s) => s.piece.color === side).map((s) => s.san);

/** "lost about a pawn", "lost about two pawns", "lost about a piece"… from an evaluation swing in centipawns. */
function costPhrase(cp: number): string {
  const p = Math.abs(cp) / 100;
  if (p < 0.75) return 'This gave away a little of your position';
  if (p < 1.5) return 'This lost about a pawn';
  if (p < 2.5) return 'This lost about two pawns';
  if (p < 4) return 'This lost about a piece';
  if (p < 7) return 'This lost about a rook';
  return 'This lost a lot of material';
}

export interface Explanation {
  title: string;
  /** Short name of the pattern, for a chip ("Hanging piece"). */
  theme: string;
  sentences: string[];
}

export function moveNo(ply: number): string {
  const n = Math.floor(ply / 2) + 1;
  return ply % 2 === 0 ? `${n}.` : `${n}…`;
}

export function explain(m: MomentData): Explanation {
  const start = posFromFen(m.fen);
  const me = m.side;
  const opp = other(me);
  const playedLine = playLine(start, [m.played, ...m.reply]);
  const playedStep = playedLine.steps[0];
  const playedSan = playedStep?.san ?? m.played;
  const replySteps = playedLine.steps.slice(1);
  const bestLine = playLine(start, m.line);
  const bestSan = bestLine.steps[0]?.san ?? m.line[0] ?? '';
  const no = moveNo(m.ply);
  const title = `${no}${playedSan}: ${LABEL_INFO[m.label].name}`;
  const better = bestSan && bestSan !== playedSan ? `Better was ${bestSan}.` : '';
  const out = (theme: string, ...sentences: string[]): Explanation => ({ title, theme, sentences: [...sentences.filter(Boolean)] });

  // 1. Allowed mate.
  if (playedLine.end.isCheckmate() && replySteps.length && replySteps[replySteps.length - 1].piece.color === opp) {
    const n = mateIn(replySteps.length);
    const seq = replySteps.map((s) => s.san).join(' ');
    return out('Allowed mate', `After ${playedSan}, your opponent has mate in ${n}: ${seq}.`, better);
  }
  // 2. Missed mate.
  if (bestLine.end.isCheckmate()) {
    const mine = ownMoves(bestLine.steps, me);
    const n = mineCount(mine);
    return out('Missed mate', n === 1 ? `There was mate in one: ${mine[0]}.` : `There was mate in ${n}: ${mine.join(' then ')}.`);
  }
  const afterPlayed = playedStep ? replySteps[0]?.before : undefined;

  // 3. Hanging piece: the answer takes something of yours and you stay down.
  if (afterPlayed && replySteps[0]?.captured && VALUE[replySteps[0].captured] >= 3) {
    const lost = balance(start, me) - balance(playedLine.end, me);
    if (lost >= 2) {
      const r = replySteps[0];
      const piece = NAME[r.captured!];
      const where = sq(r.move.to);
      const taker = NAME[r.piece.role];
      const yours = playedStep.move.to === r.move.to ? `Your ${piece} on ${where}` : `${playedSan} left your ${piece} on ${where}, and it`;
      return out(
        'Hanging piece',
        isDefended(afterPlayed, r.move.to, me)
          ? `${yours} can be taken: the ${taker} takes it, and taking back does not make up for it.`
          : `${yours} was undefended. The ${taker} takes it and you lose a ${piece}.`,
        better,
      );
    }
  }
  // 4. Allowed a fork.
  for (let i = 0; i < Math.min(replySteps.length, 3); i++) {
    const s = replySteps[i];
    if (s.piece.color !== opp) continue;
    const after = replySteps[i + 1]?.before ?? playedLine.end;
    const t = forkTargets(after, s.move.to, s.piece);
    if (t && balance(start, me) - balance(playedLine.end, me) >= 2) {
      return out('Allowed a fork', `After ${s.san} the ${NAME[s.piece.role]} attacks your ${NAME[t[0]]} and ${NAME[t[1]]} at once.`, better);
    }
  }
  // 5. Missed a fork.
  for (let i = 0; i < Math.min(bestLine.steps.length, 3); i++) {
    const s = bestLine.steps[i];
    if (s.piece.color !== me) continue;
    const after = bestLine.steps[i + 1]?.before ?? bestLine.end;
    const t = forkTargets(after, s.move.to, s.piece);
    if (t && balance(bestLine.end, me) - balance(start, me) >= 2) {
      return out('Missed a fork', `${s.san} would have attacked the ${NAME[t[0]]} and the ${NAME[t[1]]} at once.`);
    }
  }
  // 6. Missed a free capture.
  const b0 = bestLine.steps[0];
  if (b0?.captured && VALUE[b0.captured] >= 3 && balance(bestLine.end, me) - balance(start, me) >= 2) {
    return out('Missed a capture', `You could have taken the free ${NAME[b0.captured]} on ${sq(b0.move.to)} with your ${NAME[b0.piece.role]} (${b0.san}).`);
  }
  // 7. Pins.
  if (b0 && b0.piece.color === me) {
    const p = pinOf(bestLine.steps[1]?.before ?? bestLine.end, b0.move.to, b0.piece);
    if (p && balance(bestLine.end, me) - balance(start, me) >= 2) return out('Missed a pin', `${b0.san} pins the ${NAME[p[0]]} to the ${NAME[p[1]]}.`);
  }
  const r0 = replySteps[0];
  if (r0) {
    const p = pinOf(replySteps[1]?.before ?? playedLine.end, r0.move.to, r0.piece);
    if (p && balance(start, me) - balance(playedLine.end, me) >= 2) return out('Allowed a pin', `After ${r0.san} your ${NAME[p[0]]} is pinned to your ${NAME[p[1]]}.`, better);
  }
  // 8. An overlooked threat.
  if (m.threat?.length && r0) {
    return out('Missed a threat', `Your opponent was threatening ${r0.san}, and ${playedSan} did not stop it.`, better);
  }
  // 9. Otherwise: what it cost.
  const swing = (m.bestEval - m.playedEval) * (me === 'white' ? 1 : -1);
  if (Math.abs(m.bestEval) > MATE - 1000 && Math.abs(m.playedEval) < MATE - 1000) {
    return out('Missed a win', `You had a forced win here (${formatEval(m.bestEval)}), and ${playedSan} let it go.`, better);
  }
  return out('Positional', `${costPhrase(swing)} (${formatEval(m.bestEval)} → ${formatEval(m.playedEval)}).`, better);
}

const mineCount = (mine: string[]) => Math.max(1, mine.length);

/** Is `square` defended by `side` (would it be recaptured)? */
function isDefended(pos: Chess, square: Square, side: Side): boolean {
  const occ = pos.board.occupied;
  for (const s of pos.board[side]) {
    if (s === square) continue;
    if (attacks(pos.board.get(s)!, s, occ).has(square)) return true;
  }
  return false;
}

/** The "what players at your level do" lines (Maia). */
export function maiaInsights(m: MomentData, bestSan: string): string[] {
  const x = m.maia;
  if (!x) return [];
  const r = Math.round(x.rating / 50) * 50;
  const pct = (v: number) => (v < 0.01 ? 'less than 1%' : `${Math.round(v * 100)}%`);
  const out: string[] = [];
  if (x.findShare < 0.3) out.push(`Only ${pct(x.findShare)} of ${r}-rated players find ${bestSan}.`);
  else out.push(`About ${pct(x.findShare)} of players around ${r} find ${bestSan}.`);
  if (x.playedIsTop && (m.label === 'mistake' || m.label === 'blunder')) out.push('This is the most common mistake at your level.');
  if (x.seeRating !== null && x.seeRating > x.rating + 50) out.push(`Players around ${x.seeRating} usually see this: a good thing to learn next.`);
  else if (x.seeRating !== null && x.seeRating <= x.rating && x.findShare >= 0.5) out.push('Most players at your level see this one.');
  return out;
}
