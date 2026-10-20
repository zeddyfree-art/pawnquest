// The game review: accuracy, how your moves were labelled, the evaluation over the game, and the key moments
// explained in plain English, each with the better move on the board and a "Try again" from that position.
import { useEffect, useMemo, useState } from 'react';
import { characterById, FACTIONS, shortName } from '../../data/characters';
import { maiaPredict } from '../../engine/maia';
import { engine } from '../../engine/stockfish';
import { posFromFen, replay, START_FEN, uciToSan, type Side } from '../../game/chess';
import { reviewGame, labelCounts, type GameReview } from '../../review/analyse';
import { formatEval, LABEL_INFO, LABELS, moverOf, winPct } from '../../review/classify';
import { explain, maiaInsights, moveNo } from '../../review/explain';
import { useSave } from '../../store/save';
import { Board, type Arrow } from '../Board';
import { REGION_BOARD } from '../boards';
import { Portrait } from '../components';
import { useNav } from '../nav';

export function ReviewScreen() {
  const gameId = useNav((s) => s.reviewId);
  const go = useNav((s) => s.go);
  const { history, reviews, setReview, startGame, lastResult } = useSave();
  const record = history.find((g) => g.id === gameId) ?? (lastResult?.record.id === gameId ? lastResult.record : undefined);
  const c = record && characterById(record.characterId);
  const review = gameId ? reviews[gameId] : undefined;
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ply, setPly] = useState<number | null>(null);

  // Analyse once; the result is kept with the save.
  useEffect(() => {
    if (!record || !c || review) return;
    let alive = true;
    setError(null);
    reviewGame(
      { moves: record.moves, startFen: record.startFen, playerSide: record.color, playerRating: record.ratingBefore, opponentRating: c.rating },
      engine,
      async (fens, selfElo, oppoElo) => (await maiaPredict({ fens, selfElo, oppoElo, model: c.model })).moves,
      (done, total) => alive && setProgress(Math.round((100 * done) / total)),
    )
      .then((r) => alive && setReview(record.id, r))
      .catch((e: Error) => alive && setError(e.message || 'The review could not be made.'));
    return () => {
      alive = false;
      engine.stop();
    };
  }, [record, c, review, setReview]);

  const r = useMemo(() => (record ? replay(record.moves, record.startFen ?? START_FEN) : null), [record]);
  const first: Side = record?.startFen ? posFromFen(record.startFen).turn : 'white';

  if (!record || !c || !r) {
    return (
      <div className="panel center">
        <p>This game is no longer available.</p>
        <button className="btn" onClick={() => go('map')}>
          Back to the map
        </button>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="review">
        <h1>Game review</h1>
        <div className="panel center review-loading">
          <Portrait character={c} size={64} mood="thinking" />
          <p className="pixel">{error ? 'Something went wrong' : `Your coach is studying the game… ${progress}%`}</p>
          {error ? (
            <>
              <p className="muted">{error}</p>
              <button className="btn" onClick={() => location.reload()}>
                Try again
              </button>
            </>
          ) : (
            <div className="bar">
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
          <p className="muted small">Stockfish checks every move on your device; nothing is sent anywhere.</p>
        </div>
      </div>
    );
  }

  const me = record.color;
  const counts = labelCounts(review, me, first);
  const moments = review.moments;
  const selected = ply ?? moments[0]?.ply ?? Math.max(0, record.moves.length - 1);
  return (
    <div className="review">
      <h1>Game review</h1>
      <p className="muted">
        You vs {c.name} ({c.rating}) · {record.score === 1 ? 'won' : record.score === 0 ? 'lost' : 'drawn'} · {Math.ceil(record.moves.length / 2)} moves
      </p>

      <div className="panel review-top">
        <AccuracyRing value={review.accuracy[me]} label="You" />
        <AccuracyRing value={review.accuracy[me === 'white' ? 'black' : 'white']} label={shortName(c.name)} small color={FACTIONS[c.faction].color} />
        <div className="label-counts">
          {LABELS.map((l) => (
            <span key={l} className="label-chip" style={{ ['--lc' as string]: LABEL_INFO[l].color }}>
              <b>{counts[l]}</b> {LABEL_INFO[l].name}
            </span>
          ))}
        </div>
      </div>

      <MovePane review={review} record={record} ply={selected} setPly={setPly} first={first} theme={REGION_BOARD[c.world]} />

      <div className="panel">
        <h2>The game at a glance</h2>
        <EvalGraph evals={review.evals} selected={selected} onSelect={setPly} moments={moments.map((m) => m.ply)} playerSide={me} />
      </div>

      <h2 className="moments-head">{moments.length ? `Key moments (${moments.length})` : 'Key moments'}</h2>
      {!moments.length && <p className="panel">A clean game: none of your moves lost much. Well played!</p>}
      <div className="moments">
        {moments.map((m) => {
          const e = explain(m);
          const bestSan = m.line[0] ? uciToSan(posFromFen(m.fen), m.line[0]) : '';
          const insights = maiaInsights(m, bestSan);
          return (
            <article key={m.ply} className={`moment panel${selected === m.ply ? ' on' : ''}`} style={{ ['--lc' as string]: LABEL_INFO[m.label].color }}>
              <div className="moment-chips">
                <span className="label-chip solid">{LABEL_INFO[m.label].name}</span>
                <span className="theme-chip">{e.theme}</span>
              </div>
              <h3>{e.title}</h3>
              {e.sentences.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
              {insights.length > 0 && (
                <ul className="insights">
                  {insights.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
              <div className="actions left">
                <button className="btn" onClick={() => setPly(m.ply)}>
                  Show on board
                </button>
                <button
                  className="btn primary"
                  onClick={() => {
                    startGame(c.id, m.side, false, { startFen: m.fen, practice: true });
                    go('battle');
                  }}
                >
                  Try again
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="actions">
        <button className="btn" onClick={() => go('map')}>
          Map
        </button>
      </div>
    </div>
  );
}

/** The board at the selected move, with the move played and the better one as arrows, and buttons to step through. */
function MovePane({ review, record, ply, setPly, first, theme }: { review: GameReview; record: { moves: string[]; startFen?: string; color: Side }; ply: number; setPly: (p: number) => void; first: Side; theme: string }) {
  const setting = useSave((s) => s.settings.boardTheme);
  const r = useMemo(() => replay(record.moves.slice(0, ply), record.startFen ?? START_FEN), [record, ply]);
  const played = record.moves[ply];
  const label = review.labels[ply];
  const best = review.best[ply];
  const mover = moverOf(ply, first);
  const playedSan = played ? uciToSan(r.pos, played) : '';
  const bestSan = best && best !== played ? uciToSan(r.pos, best) : '';
  const bad = label === 'mistake' || label === 'blunder' || label === 'inaccuracy';
  const arrows: Arrow[] = [];
  if (played) arrows.push({ from: played.slice(0, 2), to: played.slice(2, 4), brush: bad ? 'bad' : 'info' });
  if (bestSan && bad && best) arrows.push({ from: best.slice(0, 2), to: best.slice(2, 4), brush: 'good' });
  const last = ply > 0 ? record.moves[ply - 1] : null;
  const n = record.moves.length;
  return (
    <div className="panel move-pane">
      <div className={`review-board board-theme-${setting === 'region' ? theme : setting}`}>
        <Board pos={r.pos} orientation={record.color} movable={false} lastMove={last ? [last.slice(0, 2), last.slice(2, 4)] : null} arrows={arrows} />
      </div>
      <div className="move-line">
        {played ? (
          <>
            <b>
              {moveNo(ply)}
              {playedSan}
            </b>{' '}
            <span className="label-chip solid" style={{ ['--lc' as string]: LABEL_INFO[label].color }}>
              {LABEL_INFO[label].symbol} {LABEL_INFO[label].name}
            </span>{' '}
            <span className="muted">{mover === record.color ? 'your move' : 'their move'}</span>
            {bestSan && bad && <span className="better"> · Better: {bestSan}</span>}
            <span className="muted eval"> · {formatEval(review.evals[ply + 1])}</span>
          </>
        ) : (
          <span className="muted">End of the game.</span>
        )}
      </div>
      <div className="stepper" role="group" aria-label="Step through the game">
        <button className="btn" onClick={() => setPly(0)} disabled={ply <= 0} aria-label="First move">
          ⏮
        </button>
        <button className="btn" onClick={() => setPly(Math.max(0, ply - 1))} disabled={ply <= 0} aria-label="Previous move">
          ◀
        </button>
        <button className="btn" onClick={() => setPly(Math.min(n - 1, ply + 1))} disabled={ply >= n - 1} aria-label="Next move">
          ▶
        </button>
        <button className="btn" onClick={() => setPly(n - 1)} disabled={ply >= n - 1} aria-label="Last move">
          ⏭
        </button>
      </div>
    </div>
  );
}

function AccuracyRing({ value, label, small, color = '#feae34' }: { value: number | null; label: string; small?: boolean; color?: string }) {
  const size = small ? 72 : 104;
  const r = size / 2 - 8;
  const len = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <figure className={`ring${small ? ' small' : ''}`} aria-label={`${label}: accuracy ${value === null ? 'unknown' : Math.round(v)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" stroke={color} strokeDasharray={`${(len * v) / 100} ${len}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="ring-text">
          {value === null ? '–' : Math.round(v)}
        </text>
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/** White's winning chances over the game; tap a point to see that move. Key moments are marked. */
function EvalGraph({ evals, selected, onSelect, moments, playerSide }: { evals: number[]; selected: number; onSelect: (p: number) => void; moments: number[]; playerSide: Side }) {
  const W = 340;
  const H = 110;
  const n = evals.length;
  const x = (i: number) => (n > 1 ? (i * W) / (n - 1) : 0);
  // From the player's point of view: up is good for you.
  const y = (cp: number) => {
    const w = winPct(cp);
    return H - ((playerSide === 'white' ? w : 100 - w) / 100) * H;
  };
  const line = evals.map((e, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(e).toFixed(1)}`).join(' ');
  return (
    <svg className="eval-graph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Your winning chances move by move">
      <rect width={W} height={H / 2} className="eg-good" />
      <rect y={H / 2} width={W} height={H / 2} className="eg-bad" />
      <path d={`${line} L${W} ${H} L0 ${H} Z`} className="eg-area" />
      <path d={line} className="eg-line" />
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="eg-mid" />
      {moments.map((p) => (
        <circle key={p} cx={x(p + 1)} cy={y(evals[p + 1])} r="5" className="eg-moment" />
      ))}
      <line x1={x(selected + 1)} x2={x(selected + 1)} y1="0" y2={H} className="eg-cursor" />
      {evals.slice(1).map((_, i) => (
        <rect key={i} x={x(i + 1) - W / (2 * Math.max(1, n - 1))} y="0" width={W / Math.max(1, n - 1)} height={H} fill="transparent" onClick={() => onSelect(i)} style={{ cursor: 'pointer' }} />
      ))}
    </svg>
  );
}
