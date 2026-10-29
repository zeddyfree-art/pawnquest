// A puzzle from the puzzle book: the position from one of your games where a better move was there, and you find
// it yourself. Hints come in steps (the piece to move, then the idea, then the move), as in the Repertoire app.
// Solving it at the first try counts for "Second chance"; every solved puzzle counts for the puzzle book quests.
import { useMemo, useState } from 'react';
import { characterById } from '../../data/characters';
import { fenOf, moveFromUci, needsPromotion, posFromFen, replay, START_FEN, uciFromBoard, uciToSan } from '../../game/chess';
import { QUESTS } from '../../game/unlocks';
import { moveNo } from '../../review/explain';
import { ideaHint, judgeMove, type Puzzle } from '../../review/puzzles';
import { analyse, PRIORITY } from '../../review/reviewer';
import { useSave } from '../../store/save';
import { Board, type Arrow } from '../Board';
import { REGION_BOARD } from '../boards';
import { Portrait } from '../components';
import { useNav } from '../nav';
import { lichessPositionUrl } from '../../game/pgn';
import { RewardIcon, rewardsName } from './HeroScreen';

type State = 'try' | 'checking' | 'wrong' | 'solved' | 'shown';

export function PuzzleScreen() {
  const ids = useNav((s) => s.puzzleIds);
  const go = useNav((s) => s.go);
  const puzzles = useSave((s) => s.puzzles);
  const list = useMemo(() => ids.map((id) => puzzles.find((p) => p.id === id)).filter((p): p is Puzzle => !!p), [ids, puzzles]);
  const [index, setIndex] = useState(0);
  const p = list[index];
  if (!p) {
    return (
      <div className="panel center">
        <p>No puzzles here yet. Review a game, and the better moves you missed become puzzles.</p>
        <button className="btn" onClick={() => go('profile')}>
          Back
        </button>
      </div>
    );
  }
  return <PuzzleView key={p.id} p={p} n={index + 1} of={list.length} next={index + 1 < list.length ? () => setIndex(index + 1) : null} />;
}

function PuzzleView({ p, n, of, next }: { p: Puzzle; n: number; of: number; next: (() => void) | null }) {
  const go = useNav((s) => s.go);
  const { logPuzzle, settings, history } = useSave();
  // The opponent's move that led to the position, from the game itself.
  const prev = history.find((g) => g.id === p.gameId)?.moves[p.ply - 1];
  const c = characterById(p.characterId);
  const [state, setState] = useState<State>('try');
  const [tries, setTries] = useState(0);
  const [hints, setHints] = useState(0);
  const [moved, setMoved] = useState<string | null>(null);
  const [quests, setQuests] = useState<string[]>([]);
  const best = p.good[0];
  const playedSan = useMemo(() => uciToSan(posFromFen(p.fen), p.played), [p]);
  const finished = state === 'solved' || state === 'shown';
  // Once solved (or shown), the board shows the position after the move; before that, a fresh position object
  // after each try puts the board back.
  const result = state === 'solved' ? moved : state === 'shown' ? best : null;
  const pos = useMemo(() => posFromFen(result ? fenAfter(p.fen, result) : p.fen), [p.fen, tries, result]);
  const lastMove: [string, string] | null = result ? [result.slice(0, 2), result.slice(2, 4)] : prev ? [prev.slice(0, 2), prev.slice(2, 4)] : null;
  const follow = result && result === best && p.line ? lineSan(p.fen, p.line) : '';

  const finish = (solved: boolean, firstTry: boolean) => setQuests(logPuzzle(p.id, solved, firstTry));

  const onMove = async (orig: string, dest: string) => {
    if (state !== 'try' && state !== 'wrong') return;
    const before = posFromFen(p.fen);
    const uci = uciFromBoard(before, orig, dest, needsPromotion(before, orig, dest) ? 'queen' : undefined);
    if (!uci) return;
    setMoved(uci);
    setState('checking');
    const ok = await judgeMove(p, uci, fenAfter(p.fen, uci), async (fen) => (await analyse(fen, { depth: 12 }, PRIORITY.puzzle))[0]);
    if (ok) {
      setState('solved');
      finish(true, tries === 0 && hints < 3);
    } else {
      setState('wrong');
      setTries((t) => t + 1);
    }
  };

  const show = () => {
    setState('shown');
    finish(false, false);
  };

  const arrows: Arrow[] = [];
  const circles = !finished && hints >= 1 && best ? [{ square: best.slice(0, 2), brush: 'good' as const }] : undefined;
  const theme = settings.boardTheme === 'region' ? (c ? REGION_BOARD[c.world] : 'meadow') : settings.boardTheme;
  const movedSan = moved ? safeSan(p.fen, moved) : '';

  return (
    <div className="puzzle">
      <h1>Find the better move</h1>
      <p className="muted">
        Puzzle {n} of {of} · from your game against {c?.name ?? 'an opponent'}, move {moveNo(p.ply)} You played {playedSan} here.
        {prev && !finished && ` Their last move: ${safeSan(fenBefore(history.find((g) => g.id === p.gameId), p.ply - 1) ?? p.fen, prev)}.`}
      </p>
      <div className="panel puzzle-pane">
        <div className={`puzzle-board board-theme-${theme}`}>
          <Board pos={pos} orientation={p.side} movable={!finished && state !== 'checking'} lastMove={lastMove} onMove={onMove} arrows={arrows} circles={circles} />
        </div>
        <div className="puzzle-side">
          {c && <Portrait character={c} size={48} mood={state === 'solved' ? 'defeated' : state === 'wrong' ? 'smug' : 'thinking'} />}
          <p className="puzzle-status" aria-live="polite">
            {state === 'try' && `${p.side === 'white' ? 'White' : 'Black'} to move. Can you find something better than ${playedSan}?`}
            {state === 'checking' && 'Checking…'}
            {state === 'wrong' && `${movedSan} is not it. Try again.`}
            {state === 'solved' && (tries === 0 && hints < 3 ? `${movedSan}! Found it at the first try.` : `${movedSan}! Found it.`)}
            {state === 'shown' && `The better move was ${safeSan(p.fen, best)}.`}
          </p>
          {follow && (
            <p className="small">
              <span className="muted">The line:</span> {follow}
            </p>
          )}
          {!finished && hints >= 1 && <p className="small"><span className="muted">Hint:</span> the piece to move is circled.</p>}
          {!finished && hints >= 2 && <p className="small"><span className="muted">Hint:</span> {ideaHint(p.theme)}</p>}
          {quests.map((qid) => {
            const q = QUESTS.find((x) => x.id === qid);
            return q ? (
              <div key={qid} className="reward">
                <RewardIcon r={q.rewards[0]} size={40} />
                <span>
                  <small>Quest complete: {q.title}</small>
                  <b>{rewardsName(q.rewards)}</b>
                </span>
              </div>
            ) : null;
          })}
          <div className="actions left">
            {!finished && (
              <>
                <button className="btn" onClick={() => setHints((h) => h + 1)} disabled={hints >= 2 || state === 'checking'}>
                  {hints ? 'Another hint' : 'Hint'}
                </button>
                <button className="btn" onClick={show} disabled={state === 'checking'}>
                  Show the move
                </button>
              </>
            )}
            {finished && next && (
              <button className="btn primary" onClick={next}>
                Next puzzle
              </button>
            )}
            {finished && (
              <a className="btn" href={lichessPositionUrl(p.fen)} target="_blank" rel="noreferrer">
                Analyse on Lichess
              </a>
            )}
            <button className={`btn${finished && !next ? ' primary' : ''}`} onClick={() => go('profile')}>
              {finished && !next ? 'Done' : 'Puzzle book'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fenAfter(fen: string, uci: string): string {
  const pos = posFromFen(fen);
  const m = moveFromUci(pos, uci);
  if (m) pos.play(m);
  return fenOf(pos);
}

/** The position before a given ply of a game (null when the game is not there). */
function fenBefore(g: { moves: string[]; startFen?: string } | undefined, ply: number): string | null {
  if (!g || ply < 0) return null;
  try {
    return fenOf(replay(g.moves.slice(0, ply), g.startFen ?? START_FEN).pos);
  } catch {
    return null;
  }
}

/** "1.Qxd5 Ke7 2.Qd4" for a line from a position. */
function lineSan(fen: string, line: string[]): string {
  const pos = posFromFen(fen);
  const out: string[] = [];
  let n = Number(fen.split(' ')[5] ?? 1);
  for (const [i, uci] of line.slice(0, 6).entries()) {
    const m = moveFromUci(pos, uci);
    if (!m || !pos.isLegal(m)) break;
    const san = uciToSan(pos, uci);
    if (pos.turn === 'white') out.push(`${n}.${san}`);
    else out.push(i === 0 ? `${n}…${san}` : san);
    if (pos.turn === 'black') n++;
    pos.play(m);
  }
  return out.join(' ');
}

function safeSan(fen: string, uci: string | undefined): string {
  if (!uci) return '';
  try {
    return uciToSan(posFromFen(fen), uci);
  } catch {
    return uci;
  }
}
