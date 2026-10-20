// Home: the drawn world map, hardest at the top. Every rank is a stone on the path; tap one to see its characters
// with their crowns and your record. Your hero stands at your rank. The Play button (below) picks an opponent.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CHARACTERS, FACTIONS, WORLDS } from '../../data/characters';
import { characterRecord } from '../../game/progress';
import { skulls } from '../../game/rating';
import { useSave } from '../../store/save';
import { CrownIcon, HeroSprite, Portrait, Skulls } from '../components';
import { useNav } from '../nav';
import { mapLayout, mapUrl } from '../worldMap';

export function MapScreen() {
  const { rating, history, hero } = useSave();
  const challenge = useNav((s) => s.challenge);
  const layout = useMemo(() => mapLayout(), []);
  const here = layout.nodes.reduce((best, n) => (Math.abs(n.rating - rating) < Math.abs(best.rating - rating) ? n : best), layout.nodes[0]);
  const [open, setOpen] = useState<number | null>(null);
  const hereRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    hereRef.current?.scrollIntoView({ block: 'center' });
  }, []);
  const pct = (v: number, of: number) => `${(100 * v) / of}%`;
  const openChars = open === null ? [] : CHARACTERS.filter((c) => c.rating === open);
  const openWorld = openChars[0] && WORLDS.find((w) => w.id === openChars[0].world);

  return (
    <div className="map">
      <div className="worldmap" style={{ aspectRatio: `${layout.w} / ${layout.h}` }}>
        <img className="worldmap-art" src={mapUrl(layout)} alt="" aria-hidden="true" />
        {layout.regions.map((r) => {
          const w = WORLDS.find((x) => x.id === r.world)!;
          // The sign stands on the side away from the region's first stone.
          const first = layout.nodes.find((n) => n.world === r.world)!;
          return (
            <span key={r.world} className={`region-sign ${first.x < layout.w / 2 ? 'right' : 'left'}`} style={{ top: pct(r.y1 - 3, layout.h) }}>
              {w.name}
            </span>
          );
        })}
        {layout.nodes.map((n) => {
          const chars = CHARACTERS.filter((c) => c.rating === n.rating);
          const beaten = chars.filter((c) => characterRecord(history, c.id).wins > 0).length;
          const isHere = n === here;
          return (
            <button
              key={n.rating}
              ref={isHere ? hereRef : undefined}
              className={`node${isHere ? ' here' : ''}${beaten === chars.length ? ' cleared' : ''}`}
              style={{ left: pct(n.x, layout.w), top: pct(n.y, layout.h) }}
              aria-label={`Rank ${n.rating}: ${chars.map((c) => c.name).join(', ')}${beaten ? `, ${beaten} beaten` : ''}`}
              onClick={() => setOpen(n.rating)}
            >
              <span className="node-rating">{n.rating}</span>
              <span className="node-faces">
                {chars.map((c) => (
                  <span key={c.id} className={`node-dot${characterRecord(history, c.id).wins ? ' won' : ''}`} style={{ background: FACTIONS[c.faction].color }} />
                ))}
              </span>
            </button>
          );
        })}
        {hero && (
          <span className={`map-hero ${here.x < layout.w / 2 ? 'right' : 'left'}`} style={{ left: pct(here.x, layout.w), top: pct(here.y, layout.h) }} aria-label={`You are here: ${rating}`}>
            <HeroSprite hero={hero} size={72} />
            <span className="you-marker">{hero.name}</span>
          </span>
        )}
      </div>

      {open !== null && openWorld && (
        <div className="sheet-backdrop" onClick={() => setOpen(null)}>
          <div className="sheet panel" role="dialog" aria-label={`Rank ${open}`} onClick={(e) => e.stopPropagation()}>
            <header className="sheet-head">
              <span>
                <h2>
                  {openWorld.name} · {open}
                </h2>
                <p className="muted small">{openWorld.blurb}</p>
              </span>
              <button className="btn" aria-label="Close" onClick={() => setOpen(null)}>
                ✕
              </button>
            </header>
            <div className="rank-cards">
              {openChars.map((c) => {
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
          </div>
        </div>
      )}
    </div>
  );
}
