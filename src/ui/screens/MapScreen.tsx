// Home: the drawn world map, hardest at the top. Every opponent stands on the path as a little figure with their
// name and rating; tap one to challenge them. Your hero stands where your rating puts you. The Play button
// (below) picks an opponent.
import { useEffect, useMemo, useRef } from 'react';
import { CHARACTERS, FACTIONS, WORLDS, characterById, shortName } from '../../data/characters';
import { characterRecord } from '../../game/progress';
import { useSave } from '../../store/save';
import { CrownIcon, HeroSprite } from '../components';
import { figureOf } from '../figures';
import { heroUrl } from '../hero';
import { useNav } from '../nav';
import { heroSpot, mapLayout, mapUrl } from '../worldMap';

const FIGURE = 64;
/** Short names for the map tags, so they read alike. */
const MAP_NAME: Record<string, string> = {
  'straw-sam': 'Straw Sam', 'old-tom': 'Old Tom', 'brawling-bess': 'Bess', 'squire-aldric': 'Aldric', 'captain-holt': 'Holt',
  'sir-cedric': 'Cedric', 'bishop-anselm': 'Anselm', 'royal-champion': 'Champion', oakhart: 'Oakhart', 'frost-giant': 'Frost Giant',
  'count-draven': 'Draven', 'bone-oracle': 'Oracle', 'witch-queen': 'Witch-Queen', 'death-knight': 'Death Knight', 'necromancer-king': 'Necromancer',
};

export function MapScreen() {
  const { rating, history, hero } = useSave();
  const challenge = useNav((s) => s.challenge);
  const layout = useMemo(() => mapLayout(), []);
  const spot = heroSpot(layout, rating);
  const heroRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    heroRef.current?.scrollIntoView({ block: 'center' });
  }, []);
  const pct = (v: number, of: number) => `${(100 * v) / of}%`;

  return (
    <div className="map">
      <div className="worldmap" style={{ aspectRatio: `${layout.w} / ${layout.h}` }}>
        <img className="worldmap-art" src={mapUrl(layout)} alt="" aria-hidden="true" />
        {layout.regions.map((r) => {
          const w = WORLDS.find((x) => x.id === r.world)!;
          // The sign stands on the side away from the region's first figure.
          const first = layout.nodes.find((n) => n.world === r.world)!;
          return (
            <span key={r.world} className={`region-sign ${first.x < layout.w / 2 ? 'right' : 'left'}`} style={{ top: pct(r.y1 - 3, layout.h) }}>
              {w.name}
            </span>
          );
        })}
        {layout.nodes.map((n) => {
          const c = characterById(n.id)!;
          const fig = figureOf(c);
          const rec = characterRecord(history, c.id);
          return (
            <button
              key={n.id}
              className={`figure${rec.wins ? ' beaten' : ''}`}
              style={{ left: pct(n.x, layout.w), top: pct(n.y, layout.h), ['--fc' as string]: FACTIONS[c.faction].color }}
              aria-label={`${c.name}, ${c.rating}${rec.wins ? `, beaten ${rec.wins} times` : ''}`}
              onClick={() => challenge({ characterId: c.id, color: null, auto: false })}
            >
              {fig && <img src={heroUrl(fig.look, fig.outfit)} alt="" width={(FIGURE * 3) / 4} height={FIGURE} />}
              <span className="figure-label">
                <b>
                  {rec.crown !== 'none' && <CrownIcon crown={rec.crown} size={12} />}
                  {MAP_NAME[c.id] ?? shortName(c.name)}
                </b>
                <small>{c.rating}</small>
              </span>
            </button>
          );
        })}
        {hero && (
          <span ref={heroRef} className="figure map-hero" style={{ left: pct(spot.x, layout.w), top: pct(spot.y, layout.h) }} aria-label={`You: ${rating}`}>
            <HeroSprite hero={hero} size={FIGURE} />
            <span className="figure-label you">
              <b>{hero.name}</b>
              <small>{rating}</small>
            </span>
          </span>
        )}
      </div>
      <p className="sr-only">{CHARACTERS.length} opponents on the map.</p>
    </div>
  );
}
