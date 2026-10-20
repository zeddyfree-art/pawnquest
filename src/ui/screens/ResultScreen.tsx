import { useEffect, useState } from 'react';
import { characterById, REACTIONS, shortName } from '../../data/characters';
import { levelFor } from '../../game/progress';
import { describeResult } from '../../game/rules';
import { useSave } from '../../store/save';
import { CrownIcon, Delta, Portrait } from '../components';
import { useNav } from '../nav';
import { characterRecord } from '../../game/progress';
import { itemById } from '../../data/gear';
import { QUESTS } from '../../game/unlocks';
import { GearIcon, HeroSprite } from '../components';
import { RewardIcon, rewardName } from './HeroScreen';

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ResultScreen() {
  const last = useSave((s) => s.lastResult);
  const { xp, history, startGame, hero, equip } = useSave();
  const [worn, setWorn] = useState<string[]>([]);
  const go = useNav((s) => s.go);
  const review = useNav((s) => s.review);
  const rec = last?.record;
  const c = rec && characterById(rec.characterId);
  const [shown, setShown] = useState(rec?.ratingBefore ?? 0);

  // The rating counts up (or down) to its new value.
  useEffect(() => {
    if (!rec) return;
    if (reducedMotion()) return setShown(rec.ratingAfter);
    const from = rec.ratingBefore;
    const to = rec.ratingAfter;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1200);
      setShown(Math.round(from + (to - from) * k));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [rec]);

  if (!rec || !c || !last) {
    return (
      <div className="panel center">
        <button className="btn" onClick={() => go('map')}>
          Back to the map
        </button>
      </div>
    );
  }
  const d = describeResult({ winner: rec.winner, termination: rec.termination }, rec.color);
  const kind = d.score === 1 ? 'loss' : d.score === 0 ? 'win' : 'draw'; // the bot's point of view
  const lines = REACTIONS[c.faction][kind];
  const lvl = levelFor(xp);
  const crown = characterRecord(history, c.id).crown;

  const rematch = () => {
    if (rec.practice) startGame(c.id, rec.color, false, { startFen: rec.startFen, practice: true });
    else startGame(c.id, rec.color === 'white' ? 'black' : 'white', false);
    go('battle');
  };

  return (
    <div className={`result result-${d.score === 1 ? 'win' : d.score === 0 ? 'loss' : 'draw'}`}>
      <h1 className="result-title">{rec.practice ? `Practice: ${d.title}` : d.title}</h1>
      <p className="muted">{d.detail}</p>
      <div className="panel result-card">
        <div className="result-faces">
          {hero && <HeroSprite hero={hero} size={112} mood={d.score === 1 ? 'happy' : d.score === 0 ? 'sad' : 'idle'} />}
          <Portrait character={c} size={96} mood={d.score === 1 ? 'defeated' : d.score === 0 ? 'smug' : 'idle'} />
        </div>
        <p className="bubble">“{lines[rec.id.length % lines.length]}”</p>
        {rec.practice || rec.unrated ? (
          <p className="muted">{rec.practice ? 'Practice games from a review do not change your rating.' : 'Training games do not change your rating.'}</p>
        ) : (
          <div className="result-rating">
            <span className="pixel big-number">{shown}</span>
            <Delta value={rec.ratingAfter - rec.ratingBefore} />
          </div>
        )}
        {last.crownEarned && (
          <p className="crown-earned">
            <CrownIcon crown={crown} size={28} /> New {crown} crown against {c.name}!
          </p>
        )}
        {last.newItems.map((id) => {
          const it = itemById(id);
          if (!it) return null;
          const on = worn.includes(id) || hero?.equip[it.art.slot] === id;
          return (
            <div key={id} className="reward">
              <GearIcon art={it.art} size={48} />
              <span>
                <small>{shortName(c.name)} dropped</small>
                <b>{it.name}</b>
              </span>
              <button
                className="btn"
                disabled={on}
                onClick={() => {
                  equip(it.art.slot, id);
                  setWorn([...worn, id]);
                }}
              >
                {on ? 'Wearing' : 'Wear it'}
              </button>
            </div>
          );
        })}
        {last.newQuests.map((qid) => {
          const q = QUESTS.find((x) => x.id === qid);
          if (!q) return null;
          return (
            <div key={qid} className="reward">
              <RewardIcon r={q.reward} size={48} />
              <span>
                <small>Quest complete: {q.title}</small>
                <b>{rewardName(q.reward)}</b>
              </span>
            </div>
          );
        })}
        {!rec.practice && (
          <>
            <p className="xp-line">
              +{last.xpGained} XP · Level {lvl.level}
            </p>
            <div className="bar xp">
              <span style={{ width: `${(100 * lvl.into) / lvl.needed}%` }} />
            </div>
          </>
        )}
      </div>
      <div className="actions">
        <button className="btn" onClick={() => go('map')}>
          Map
        </button>
        <button className="btn" onClick={rematch}>
          {rec.practice ? 'Try again' : 'Rematch'}
        </button>
        {!rec.practice && (
          <button className="btn primary big" onClick={() => review(rec.id)}>
            Review
          </button>
        )}
      </div>
    </div>
  );
}
