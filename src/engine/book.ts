// Book moves: follow the character's opening lines while the game matches one of them.
import { parseSan } from 'chessops/san';
import type { Character } from '../data/characters';
import { OPENINGS, type OpeningId } from '../data/openings';
import { posFromFen, START_FEN, uciOf, type Side } from '../game/chess';

/** A book line as standard UCI moves (parsed once and cached). */
const cache = new Map<string, string[]>();
function lineUcis(san: string): string[] {
  let ucis = cache.get(san);
  if (!ucis) {
    const pos = posFromFen(START_FEN);
    ucis = san
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => {
        const move = parseSan(pos, s);
        if (!move || !('from' in move)) throw new Error(`Book line "${san}": illegal move ${s}`);
        const uci = uciOf(pos, move);
        pos.play(move);
        return uci;
      });
    cache.set(san, ucis);
  }
  return ucis;
}

/** Which openings apply: as White its White book; as Black the book for the opponent's first move. */
export function openingsFor(c: Character, botSide: Side, moves: readonly string[]): OpeningId[] {
  if (botSide === 'white') return c.book.white;
  return moves[0] === 'e2e4' ? c.book.vsE4 : c.book.vsD4;
}

/** The book moves for the bot here, with how many lines suggest each; empty when out of book. */
export function bookMoves(c: Character, botSide: Side, moves: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  const ownMovesPlayed = botSide === 'white' ? Math.ceil(moves.length / 2) : Math.floor(moves.length / 2);
  if (ownMovesPlayed >= c.bookDepth) return out;
  for (const id of openingsFor(c, botSide, moves)) {
    for (const line of OPENINGS[id].lines) {
      const ucis = lineUcis(line);
      if (ucis.length > moves.length && moves.every((m, i) => ucis[i] === m)) {
        const next = ucis[moves.length];
        out.set(next, (out.get(next) ?? 0) + 1);
      }
    }
  }
  return out;
}

/** All book lines of all openings as UCI (for tests: every line must be legal). */
export function allLines(): { id: OpeningId; ucis: string[] }[] {
  return (Object.keys(OPENINGS) as OpeningId[]).flatMap((id) => OPENINGS[id].lines.map((l) => ({ id, ucis: lineUcis(l) })));
}
