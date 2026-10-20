// The card before a fight: who, how strong, what is at stake, which colour.
import { useState } from 'react';
import { FACTIONS, characterById } from '../../data/characters';
import { TEMPERAMENTS } from '../../config';
import type { Side } from '../../game/chess';
import { ratedGames, skulls, stakes } from '../../game/rating';
import { characterRecord } from '../../game/progress';
import { useSave } from '../../store/save';
import { MODELS, useMaia } from '../../engine/maia';
import { Delta, FactionBadge, Portrait, Skulls } from '../components';
import { useNav } from '../nav';

export function PreMatch() {
  const matchup = useNav((s) => s.matchup);
  const go = useNav((s) => s.go);
  const { rating, history, startGame } = useSave();
  const [choice, setChoice] = useState<Side | 'random'>('random');
  const modelStatus = useMaia((s) => s.status);
  const c = matchup && characterById(matchup.characterId);
  if (!matchup || !c) return null;
  const st = stakes(rating, c.rating, ratedGames(history));
  const rec = characterRecord(history, c.id);
  const needsDownload = c.model === '79m' && modelStatus['79m'] !== 'ready';

  const fight = () => {
    const color: Side = matchup.color ?? (choice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : choice);
    startGame(c.id, color, matchup.auto);
    go('battle');
  };

  return (
    <div className="prematch">
      <div className="card panel" style={{ ['--fc' as string]: FACTIONS[c.faction].color }}>
        <div className="card-top">
          <Portrait character={c} size={128} mood="smug" />
          <div className="card-id">
            <FactionBadge character={c} />
            <h1>{c.name}</h1>
            <p className="rating-line">
              Rating <b>{c.rating}</b> · {TEMPERAMENTS[c.temperament].label}
            </p>
            <Skulls n={skulls(rating, c.rating)} size={27} />
          </div>
        </div>
        <p className="bubble">“{c.taunt}”</p>
        <div className="stakes" aria-label="What is at stake">
          <div className="stake win">
            <span>WIN</span>
            <Delta value={st.win} />
          </div>
          <div className="stake draw">
            <span>DRAW</span>
            <Delta value={st.draw} />
          </div>
          <div className="stake lose">
            <span>LOSE</span>
            <Delta value={st.loss} />
          </div>
        </div>
        {matchup.color ? (
          <p className="color-line">
            You play <b>{matchup.color === 'white' ? 'White' : 'Black'}</b> · 15+10
          </p>
        ) : (
          <div className="color-pick" role="radiogroup" aria-label="Your colour">
            {(['white', 'random', 'black'] as const).map((s) => (
              <button key={s} role="radio" aria-checked={choice === s} className={`chip${choice === s ? ' on' : ''}`} onClick={() => setChoice(s)}>
                {s === 'white' ? 'White' : s === 'black' ? 'Black' : 'Random'}
              </button>
            ))}
          </div>
        )}
        {rec.games > 0 && (
          <p className="muted">
            Your record: {rec.wins} won, {rec.draws} drawn, {rec.losses} lost
          </p>
        )}
        {needsDownload && <p className="muted">This opponent uses the stronger brain: a one-time download of {MODELS['79m'].label}.</p>}
        <div className="actions">
          <button className="btn" onClick={() => go('map')}>
            Back
          </button>
          <button className="btn primary big" onClick={fight}>
            Fight!
          </button>
        </div>
      </div>
    </div>
  );
}
