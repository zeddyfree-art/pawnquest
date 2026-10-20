// The fight: the board, the opponent with a speech bubble above, you below, both clocks (15+10).
// The bot thinks in the Maia worker; its fake think time comes off its own clock.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CLOCK } from '../../config';
import { characterById, REACTIONS, type Character } from '../../data/characters';
import { acceptsDraw, chooseBotMove, shouldResign, thinkTimeMs } from '../../engine/botPlayer';
import { loadModel, maiaPredict, MODELS, useMaia } from '../../engine/maia';
import { captured, materialBalance, needsPromotion, other, replay, uciFromBoard, type Side } from '../../game/chess';
import { flagged, press, runFor, showTime, stop, timeLeft } from '../../game/clock';
import { boardResult, timeoutResult, type Result } from '../../game/rules';
import { useSave } from '../../store/save';
import { Board } from '../Board';
import { Material, Portrait, type Mood } from '../components';
import { useNav } from '../nav';
import { pieceDataUrl } from '../pixelArt';
import { sfx } from '../sound';

const INC = CLOCK.incrementSeconds * 1000;
const line = (c: Character, kind: keyof (typeof REACTIONS)['gambiteer']) => {
  const lines = REACTIONS[c.faction][kind];
  return lines[Math.floor(Math.random() * lines.length)];
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Battle() {
  const active = useSave((s) => s.active);
  const rating = useSave((s) => s.rating);
  const motion = useSave((s) => s.settings.motion);
  const { updateActive, finishGame } = useSave.getState();
  const go = useNav((s) => s.go);
  const c = active ? characterById(active.characterId) : undefined;
  const modelStatus = useMaia((s) => (c ? s.status[c.model] : 'idle'));
  const progress = useMaia((s) => (c ? s.progress[c.model] : 0));
  const maiaError = useMaia((s) => s.error);

  const [ready, setReady] = useState(false);
  const [bubble, setBubble] = useState<string>(c?.taunt ?? '');
  const [mood, setMood] = useState<Mood>('idle');
  const [now, setNow] = useState(Date.now());
  const [promo, setPromo] = useState<{ orig: string; dest: string } | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [showMoves, setShowMoves] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const thinking = useRef(false);
  const ended = useRef(false);
  const saidLosing = useRef(false);

  const moves = active?.moves ?? [];
  const r = useMemo(() => replay(moves), [moves]);
  const playerSide: Side = active?.color ?? 'white';
  const botSide = other(playerSide);
  const playerTurn = r.pos.turn === playerSide;

  const finish = useCallback(
    (result: Result) => {
      if (ended.current) return;
      ended.current = true;
      const score = result.winner === null ? 0.5 : result.winner === playerSide ? 1 : 0;
      (score === 1 ? sfx.win : score === 0 ? sfx.lose : sfx.draw)();
      finishGame(result);
      go('result');
    },
    [finishGame, go, playerSide],
  );

  const effects = useCallback(
    (san: string) => {
      if (san.includes('+') || san.includes('#')) {
        sfx.check();
        if (motion) {
          setShake(true);
          setTimeout(() => setShake(false), 300);
        }
      } else if (san.includes('x')) sfx.capture();
      else sfx.move();
    },
    [motion],
  );

  // A speech bubble stays for a few seconds (tap it to close it sooner).
  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(''), 5000);
    return () => clearTimeout(t);
  }, [bubble]);

  // Load the bot's brain; the clock does not run while you were away or while it loads.
  useEffect(() => {
    if (!c) return;
    let alive = true;
    loadModel(c.model)
      .then(() => {
        if (!alive) return;
        const a = useSave.getState().active;
        if (a?.clock.running) updateActive({ clock: { ...a.clock, since: Date.now() } });
        setReady(true);
        if (!a?.moves.length) sfx.start();
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [c, updateActive]);

  // Leaving the tab pauses the game: bank the time used so far, and forgive the time away on return.
  useEffect(() => {
    const onVis = () => {
      const a = useSave.getState().active;
      if (!a?.clock.running) return;
      if (document.visibilityState === 'hidden') updateActive({ clock: runFor(stop(a.clock, Date.now()), a.clock.running, Date.now()) });
      else updateActive({ clock: { ...a.clock, since: Date.now() } });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      const a = useSave.getState().active;
      if (a?.clock.running) updateActive({ clock: runFor(stop(a.clock, Date.now()), a.clock.running, Date.now()) });
    };
  }, [updateActive]);

  // Clock tick and flag fall.
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const a = useSave.getState().active;
      const side = a && flagged(a.clock, n);
      if (a && side) finish(timeoutResult(replay(a.moves).pos, side));
    }, 200);
    return () => clearInterval(t);
  }, [ready, finish]);

  // The bot's turn.
  useEffect(() => {
    if (!ready || !c || !active || ended.current || thinking.current || r.pos.turn !== botSide || r.pos.isEnd()) return;
    thinking.current = true;
    setMood('thinking');
    const gameId = active.id;
    const before = active.moves;
    const started = Date.now();
    (async () => {
      try {
        const bm = await chooseBotMove(c, before, rating, maiaPredict);
        if (!bm) return;
        const chances = [...active.botWinChances, bm.winChance];
        if (shouldResign(c, chances)) {
          setBubble(line(c, 'loss'));
          setMood('defeated');
          await sleep(1200);
          finish({ winner: playerSide, termination: 'resign' });
          return;
        }
        const a0 = useSave.getState().active;
        if (!a0) return;
        const wait = thinkTimeMs(c, timeLeft(a0.clock, botSide, Date.now()), before.length) - (Date.now() - started);
        if (wait > 0) await sleep(wait);
        const a = useSave.getState().active;
        if (!a || a.id !== gameId || a.moves.length !== before.length || ended.current) return;
        const after = [...a.moves, bm.uci];
        const san = replay(after).sans[after.length - 1];
        updateActive({ moves: after, clock: press(a.clock, botSide, Date.now(), INC), botWinChances: chances });
        effects(san);
        if (san.includes('+') || san.includes('#')) setBubble(line(c, 'check'));
        else if (san.includes('x') && Math.random() < 0.5) setBubble(line(c, 'capture'));
        else if (bm.winChance < 0.2 && !saidLosing.current) {
          saidLosing.current = true;
          setBubble(line(c, 'losing'));
        }
        setMood(bm.winChance > 0.75 ? 'smug' : bm.winChance < 0.2 ? 'defeated' : 'idle');
        const end = boardResult(after);
        if (end) {
          await sleep(700);
          finish(end);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        thinking.current = false;
      }
    })();
  }, [ready, c, active, r, botSide, rating, playerSide, finish, effects, updateActive]);

  if (!active || !c) {
    return (
      <div className="panel center">
        <p>No fight in progress.</p>
        <button className="btn" onClick={() => go('map')}>
          Back to the map
        </button>
      </div>
    );
  }

  const commit = (uci: string | null) => {
    const a = useSave.getState().active;
    if (!uci || !a || ended.current) return;
    const after = [...a.moves, uci];
    const san = replay(after).sans[after.length - 1];
    updateActive({ moves: after, clock: press(a.clock, playerSide, Date.now(), INC) });
    effects(san);
    const end = boardResult(after);
    if (end) setTimeout(() => finish(end), 500);
  };

  const onMove = (orig: string, dest: string) => {
    if (needsPromotion(r.pos, orig, dest)) setPromo({ orig, dest });
    else commit(uciFromBoard(r.pos, orig, dest));
  };

  const canOfferDraw = moves.length >= 2 && (active.drawOfferPly === null || moves.length - active.drawOfferPly >= 10);
  const offerDraw = () => {
    const wc = active.botWinChances[active.botWinChances.length - 1] ?? 0.5;
    if (acceptsDraw(r.pos, wc)) {
      setBubble(line(c, 'draw'));
      setTimeout(() => finish({ winner: null, termination: 'agreement' }), 900);
    } else {
      setBubble('No thanks. Let’s play on!');
      updateActive({ drawOfferPly: moves.length });
    }
  };

  const balance = materialBalance(r.pos) * (playerSide === 'white' ? 1 : -1);
  const taken = captured(r.pos);
  const clockOf = (side: Side) => timeLeft(active.clock, side, now);
  const loadingText =
    modelStatus === 'downloading' ? `Summoning your opponent… ${progress}%` : 'Summoning your opponent…';

  return (
    <div className="battle">
      <div className="fighter foe">
        <Portrait character={c} size={44} mood={mood} />
        <div className="fighter-info">
          <b>{c.name}</b>
          <small>{c.rating}</small>
          <Material roles={taken[botSide]} color={playerSide} plus={-balance} />
        </div>
        <span className={`clock${active.clock.running === botSide ? ' running' : ''}${clockOf(botSide) < 30_000 ? ' low' : ''}`}>{showTime(clockOf(botSide))}</span>
      </div>

      <div className={`board-wrap${shake ? ' shake' : ''}`}>
        <Board pos={r.pos} orientation={playerSide} movable={ready && playerTurn && !ended.current && !promo} lastMove={r.lastMove} onMove={onMove} />
        {bubble && ready && (
          <p className="bubble speech" aria-live="polite" onClick={() => setBubble('')}>
            {bubble}
          </p>
        )}
        {!ready && !error && (
          <div className="overlay">
            <p className="pixel">{loadingText}</p>
            {modelStatus === 'downloading' && (
              <>
                <div className="bar">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <small>One-time download ({MODELS[c.model].label}). After this it works offline.</small>
              </>
            )}
          </div>
        )}
        {(error || maiaError) && (
          <div className="overlay">
            <p>{error ?? maiaError}</p>
            <button className="btn" onClick={() => location.reload()}>
              Try again
            </button>
          </div>
        )}
        {promo && (
          <div className="overlay promo" role="dialog" aria-label="Promote to">
            {(['queen', 'rook', 'bishop', 'knight'] as const).map((p) => (
              <button
                key={p}
                className="promo-btn"
                aria-label={p}
                onClick={() => {
                  setPromo(null);
                  commit(uciFromBoard(r.pos, promo.orig, promo.dest, p));
                }}
              >
                <img src={pieceDataUrl(p, playerSide)} alt="" width={48} height={48} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fighter me">
        <div className="fighter-info">
          <b>You</b>
          <small>{rating}</small>
          <Material roles={taken[playerSide]} color={botSide} plus={balance} />
        </div>
        <span className="turn-hint">{ready ? (playerTurn ? 'Your move' : `${c.name.split(/[ ,]/)[0]} is thinking…`) : ''}</span>
        <span className={`clock${active.clock.running === playerSide ? ' running' : ''}${clockOf(playerSide) < 30_000 ? ' low' : ''}`}>{showTime(clockOf(playerSide))}</span>
      </div>

      <div className="battle-actions">
        {confirmResign ? (
          <>
            <span>Give up this fight?</span>
            <button className="btn danger" onClick={() => finish({ winner: botSide, termination: 'resign' })}>
              Yes, resign
            </button>
            <button className="btn" onClick={() => setConfirmResign(false)}>
              Keep playing
            </button>
          </>
        ) : (
          <>
            <button className="btn" onClick={() => setConfirmResign(true)} disabled={!ready}>
              Resign
            </button>
            <button className="btn" onClick={offerDraw} disabled={!ready || !canOfferDraw}>
              Offer draw
            </button>
            <button className="btn" aria-expanded={showMoves} onClick={() => setShowMoves(!showMoves)}>
              Moves
            </button>
            <button className="btn" onClick={() => go('map')}>
              Pause
            </button>
          </>
        )}
      </div>
      {showMoves && (
        <ol className="move-list">
          {r.sans.map((san, i) => (i % 2 === 0 ? <li key={i}>{`${san} ${r.sans[i + 1] ?? ''}`}</li> : null))}
        </ol>
      )}
    </div>
  );
}
