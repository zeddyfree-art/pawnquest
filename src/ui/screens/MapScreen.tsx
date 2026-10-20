// Home: the quest path through the worlds, hardest at the top. Each rank is a node; open it to see its
// characters with their crowns and your record. The Play button picks a fitting opponent.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CHARACTERS, FACTIONS, WORLDS, characterById } from '../../data/characters';
import { autoMatch } from '../../game/matchmaking';
import { characterRecord } from '../../game/progress';
import { skulls } from '../../game/rating';
import { useSave } from '../../store/save';
import { CrownIcon, Portrait, Skulls } from '../components';
import { useNav } from '../nav';

export function MapScreen() {
  const { rating, history, active } = useSave();
  const challenge = useNav((s) => s.challenge);
  const go = useNav((s) => s.go);
  const ranks = useMemo(() => [...new Set(CHARACTERS.map((c) => c.rating))].sort((a, b) => b - a), []);
  const here = ranks.reduce((best, r) => (Math.abs(r - rating) < Math.abs(best - rating) ? r : best), ranks[0]);
  const [open, setOpen] = useState<number | null>(here);
  const hereRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    hereRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  const play = () => {
    const m = autoMatch(rating, history);
    challenge({ characterId: m.character.id, color: m.color, auto: true });
  };
  const activeChar = active && characterById(active.characterId);

  return (
    <div className="map">
      {activeChar && (
        <button className="resume panel" onClick={() => go('battle')}>
          <Portrait character={activeChar} size={40} />
          <span>
            <b>Your fight with {activeChar.name} is waiting.</b>
            <small>Tap to continue the game.</small>
          </span>
        </button>
      )}
      {WORLDS.slice()
        .reverse()
        .map((w) => {
          const worldRanks = ranks.filter((r) => CHARACTERS.find((c) => c.rating === r)!.world === w.id);
          return (
            <section key={w.id} className={`world world-${w.id}`} aria-label={w.name}>
              <header className="world-head">
                <h2>{w.name}</h2>
                <p>{w.blurb}</p>
              </header>
              {worldRanks.map((r, i) => {
                const chars = CHARACTERS.filter((c) => c.rating === r);
                const isOpen = open === r;
                return (
                  <div key={r} className={`rank-node ${i % 2 ? 'right' : 'left'}`} ref={r === here ? hereRef : undefined}>
                    <div className="node-row">
                      <button className={`node${r === here ? ' here' : ''}`} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r)}>
                        <span className="node-rating">{r}</span>
                        <span className="node-faces">
                          {chars.map((c) => (
                            <span key={c.id} className="node-dot" style={{ background: FACTIONS[c.faction].color }} />
                          ))}
                        </span>
                      </button>
                      {r === here && (
                        <span className="you-marker" aria-label={`You are here: ${rating}`}>
                          YOU {rating}
                        </span>
                      )}
                    </div>
                    {isOpen && (
                      <div className="rank-cards">
                        {chars.map((c) => {
                          const rec = characterRecord(history, c.id);
                          return (
                            <button key={c.id} className="char-card" style={{ ['--fc' as string]: FACTIONS[c.faction].color }} onClick={() => challenge({ characterId: c.id, color: null, auto: false })}>
                              <Portrait character={c} size={56} />
                              <span className="char-info">
                                <b>{c.name}</b>
                                <small>
                                  {FACTIONS[c.faction].name} · {c.rating}
                                </small>
                                <span className="char-rec">
                                  <CrownIcon crown={rec.crown} />
                                  {rec.games ? `${rec.wins}W ${rec.draws}D ${rec.losses}L` : 'Not fought yet'}
                                  <Skulls n={skulls(rating, c.rating)} />
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
      <div className="play-dock">
        <button className="btn big primary" onClick={play} disabled={!!active}>
          Play
        </button>
      </div>
    </div>
  );
}
