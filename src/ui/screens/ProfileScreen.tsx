import { useRef, useState } from 'react';
import { levelFor } from '../../game/progress';
import { exportSave, useSave } from '../../store/save';
import { connectDrive, disconnectDrive, sendGames, useDrive } from '../../store/drive';
import { characterById } from '../../data/characters';
import { useNav } from '../nav';
import { mistakePatterns, phaseAdvice } from '../../review/patterns';

function RatingChart({ points }: { points: number[] }) {
  if (points.length < 2) return <p className="muted">Your rating graph appears after your first games.</p>;
  const W = 320;
  const H = 120;
  const min = Math.min(...points) - 20;
  const max = Math.max(...points) + 20;
  const x = (i: number) => 8 + (i * (W - 16)) / (points.length - 1);
  const y = (v: number) => H - 14 - ((v - min) / (max - min)) * (H - 28);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(' ');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rating from ${points[0]} to ${points[points.length - 1]}`}>
      <path d={`${d} L${x(points.length - 1)} ${H - 6} L${x(0)} ${H - 6} Z`} className="chart-area" />
      <path d={d} className="chart-line" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r="4" className="chart-dot" />
      <text x="8" y="12" className="chart-label">
        {max - 20}
      </text>
      <text x="8" y={H - 2} className="chart-label">
        {min + 20}
      </text>
    </svg>
  );
}

export function ProfileScreen() {
  const { rating, peak, xp, history, reviews, settings, setSettings, importSave, resetAll, puzzles, puzzleLog } = useSave();
  const solve = useNav((s) => s.solve);
  // Unsolved puzzles, newest first; then the solved ones to go over again.
  const open = puzzles.filter((p) => !puzzleLog[p.id]?.solved).reverse();
  const solved = puzzles.filter((p) => puzzleLog[p.id]?.solved).reverse();
  const pat = mistakePatterns(reviews, history);
  const top = pat.themes.slice(0, 3);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const wins = history.filter((g) => g.score === 1).length;
  const draws = history.filter((g) => g.score === 0.5).length;
  const lvl = levelFor(xp);
  const review = useNav((s) => s.review);
  const recent = history.slice(-10).reverse();

  const download = () => {
    const blob = new Blob([exportSave()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pawnquest-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg('Save file downloaded.');
  };
  const upload = async (f: File | undefined) => {
    if (!f) return;
    try {
      importSave(await f.text());
      setMsg('Save file loaded.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'That file could not be loaded.');
    }
  };

  return (
    <div className="profile">
      <h1>Your stats</h1>
      <div className="stats-row">
        <div className="panel stat">
          <span className="pixel">{rating}</span>
          <small>Rating</small>
        </div>
        <div className="panel stat">
          <span className="pixel">{peak}</span>
          <small>Peak</small>
        </div>
        <div className="panel stat">
          <span className="pixel">{lvl.level}</span>
          <small>Level · {xp} XP</small>
        </div>
        <div className="panel stat">
          <span className="pixel">{history.length}</span>
          <small>
            {wins}W {draws}D {history.length - wins - draws}L
          </small>
        </div>
      </div>
      <div className="panel">
        <h2>Rating</h2>
        <RatingChart points={[history[0]?.ratingBefore ?? rating, ...history.map((g) => g.ratingAfter)]} />
      </div>
      <div className="panel study">
        <h2>What to study</h2>
        {pat.games === 0 || (!top.length && !pat.weakPhase) ? (
          <p className="muted">Review your games (Review on the result screen or below) and this shows which mistakes come back most, with what to practise.</p>
        ) : (
          <>
            <p className="muted small">
              From {pat.games} reviewed {pat.games === 1 ? 'game' : 'games'}
              {pat.accuracy !== null ? ` · average accuracy ${pat.accuracy}%` : ''}
            </p>
            {top.length > 0 && (
              <ol className="patterns">
                {top.map((t) => (
                  <li key={t.theme}>
                    <div className="pattern-head">
                      <b>{t.theme}</b>
                      <span className="pattern-count">{t.count}×</span>
                    </div>
                    <span className="bar small">
                      <span style={{ width: `${(100 * t.count) / top[0].count}%` }} />
                    </span>
                    <p>{t.advice}</p>
                  </li>
                ))}
              </ol>
            )}
            {pat.weakPhase && <p className="phase-advice">{phaseAdvice(pat.weakPhase)}</p>}
          </>
        )}
      </div>
      <div className="panel puzzle-book">
        <h2>Puzzle book</h2>
        {puzzles.length ? (
          <>
            <p className="muted small">The better moves you missed in your reviewed games. Find them yourself: hints come in steps.</p>
            <div className="puzzle-counts">
              <span>
                <b className="pixel">{open.length}</b> to solve
              </span>
              <span>
                <b className="pixel">{solved.length}</b> solved
              </span>
            </div>
            <div className="actions left">
              <button className="btn primary" onClick={() => solve(open.map((p) => p.id))} disabled={!open.length}>
                {open.length ? `Solve puzzles (${open.length})` : 'All solved!'}
              </button>
              {solved.length > 0 && (
                <button className="btn" onClick={() => solve(solved.map((p) => p.id))}>
                  Go over solved ones
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="muted">Review a game, and every clear mistake in it becomes a puzzle here: find the better move yourself.</p>
        )}
      </div>
      <div className="panel">
        <h2>Recent games</h2>
        {recent.length ? (
          <ul className="recent">
            {recent.map((g) => (
              <li key={g.id}>
                <span className={`res res-${g.score === 1 ? 'w' : g.score === 0 ? 'l' : 'd'}`}>{g.score === 1 ? 'W' : g.score === 0 ? 'L' : 'D'}</span>
                <span className="recent-who">
                  {characterById(g.characterId)?.name ?? g.characterId}
                  <small>
                    {new Date(g.date).toLocaleDateString()} · {Math.ceil(g.moves.length / 2)} moves · {g.ratingAfter - g.ratingBefore >= 0 ? '+' : ''}
                    {g.ratingAfter - g.ratingBefore}
                  </small>
                </span>
                {g.review ? (
                  <button className="btn reviewed" onClick={() => review(g.id)} aria-label="Reviewed: see the review">
                    ✓ Reviewed
                  </button>
                ) : (
                  <button className="btn" onClick={() => review(g.id)} disabled={g.moves.length < 2}>
                    Review
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Your games appear here, each with a review.</p>
        )}
      </div>
      <div className="panel settings">
        <h2>Settings</h2>
        <label>
          <input type="checkbox" checked={settings.sound} onChange={(e) => setSettings({ sound: e.target.checked })} /> Sound effects
        </label>
        <label>
          <input type="checkbox" checked={settings.music} onChange={(e) => setSettings({ music: e.target.checked })} /> Music
        </label>
        <label className="range">
          Music volume
          <input type="range" min={0.05} max={1} step={0.05} value={settings.musicVolume} disabled={!settings.music} onChange={(e) => setSettings({ musicVolume: Number(e.target.value) })} />
        </label>
        <label>
          <input type="checkbox" checked={settings.motion} onChange={(e) => setSettings({ motion: e.target.checked })} /> Motion (ambient effects, screen shake on check)
        </label>
      </div>
      <RepertoireLink />
      <div className="panel">
        <h2>Your save</h2>
        <p className="muted">Everything is stored on this device only. Download a save file to keep a copy or to move to another device.</p>
        <div className="actions left">
          <button className="btn" onClick={download}>
            Download save
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            Load save
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => upload(e.target.files?.[0])} />
          {confirmReset ? (
            <>
              <button
                className="btn danger"
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                  setMsg('Started over at 600.');
                }}
              >
                Yes, erase everything
              </button>
              <button className="btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn" onClick={() => setConfirmReset(true)}>
              Start over
            </button>
          )}
        </div>
        {msg && (
          <p className="msg" role="status">
            {msg}
          </p>
        )}
      </div>
      <div className="panel about">
        <h2>About</h2>
        <p>
          Pawnquest is free and open source (AGPL-3.0). Your opponents are{' '}
          <a href="https://github.com/CSSLab/maia3" target="_blank" rel="noreferrer">
            Maia-3
          </a>{' '}
          (CSSLab, University of Toronto), a neural network that plays like humans of a given rating, run on your device with{' '}
          <a href="https://www.npmjs.com/package/maia3-js" target="_blank" rel="noreferrer">
            maia3-js
          </a>{' '}
          and ONNX Runtime. The stronger opponents use the 79M model as exported by{' '}
          <a href="https://github.com/Dash1971/maia-chess-android" target="_blank" rel="noreferrer">
            Mobile Maia
          </a>
          . The board is Lichess’s chessground; the rules come from chessops. Music: Ninja Adventure by Pixel-boy and AAA (CC0). Many
          piece sets and boards come from the{' '}
          <a href="https://pulsarcp.itch.io/chess" target="_blank" rel="noreferrer">
            Pixel Art Chess Asset Pack
          </a>{' '}
          by{' '}
          <a href="https://pulsarcp.itch.io/" target="_blank" rel="noreferrer">
            PulsarCP
          </a>
          , used with permission. Thank you!
        </p>
        <p className="muted">Ratings are Pawnquest’s own scale and are not the same as Lichess or Chess.com ratings.</p>
        <p className="muted small">
          <a href="https://github.com/zeddyfree-art/pawnquest" target="_blank" rel="noreferrer">
            Source code
          </a>{' '}
          · version {__APP_COMMIT__}
        </p>
      </div>
    </div>
  );
}

/** Sends your games to the Repertoire app through your Google Drive. */
function RepertoireLink() {
  const { connected, status, error, waiting } = useDrive();
  const [busy, setBusy] = useState(false);
  const connect = () => {
    setBusy(true);
    void connectDrive().finally(() => setBusy(false));
  };
  return (
    <div className="panel">
      <h2>Repertoire app</h2>
      <p className="muted">
        Send your games to the{' '}
        <a href="https://zeddyfree-art.github.io/chess/" target="_blank" rel="noreferrer">
          Repertoire app
        </a>{' '}
        through your Google Drive: each finished game goes to its Inbox folder and shows up there at the next sync, tagged Pawnquest. The app
        only sees files it made itself, nothing else in your Drive.
      </p>
      {connected && (
        <p role="status">
          {status === 'sending' && `Sending… ${waiting} to go.`}
          {status === 'done' && 'All your games are sent.'}
          {status === 'needs-auth' && `${waiting} ${waiting === 1 ? 'game is' : 'games are'} waiting: sign in to Google again to send them.`}
          {status === 'error' && `Could not send: ${error}`}
        </p>
      )}
      {!connected && error && <p role="status">{error}</p>}
      <div className="actions left">
        {!connected ? (
          <button className="btn primary" onClick={connect} disabled={busy}>
            Connect Google Drive
          </button>
        ) : (
          <>
            {status === 'needs-auth' && (
              <button className="btn primary" onClick={connect} disabled={busy}>
                Sign in again
              </button>
            )}
            {status === 'error' && (
              <button className="btn" onClick={() => void sendGames()}>
                Try again
              </button>
            )}
            <button className="btn" onClick={disconnectDrive}>
              Stop sending
            </button>
          </>
        )}
      </div>
    </div>
  );
}
