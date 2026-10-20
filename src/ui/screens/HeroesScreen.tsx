// Rivals: every opponent, greyed out until you beat them once, with your record against each.
import { CHARACTERS, FACTIONS, WORLDS } from '../../data/characters';
import { characterRecord, factionScores } from '../../game/progress';
import { useSave } from '../../store/save';
import { CrownIcon, Portrait } from '../components';
import { useNav } from '../nav';

export function HeroesScreen() {
  const history = useSave((s) => s.history);
  const challenge = useNav((s) => s.challenge);
  const scores = factionScores(history);
  const beaten = CHARACTERS.filter((c) => characterRecord(history, c.id).wins > 0).length;

  return (
    <div className="heroes">
      <h1>Rivals</h1>
      <p className="muted">
        {beaten} of {CHARACTERS.length} defeated
      </p>
      <div className="faction-scores">
        {(['gambiteer', 'classicist', 'strategist'] as const).map((f) => (
          <div key={f} className="panel fscore" style={{ ['--fc' as string]: FACTIONS[f].color }}>
            <b>{FACTIONS[f].name}</b>
            <span className="pixel">{scores[f] === null ? '—' : `${scores[f]}%`}</span>
            <small>{FACTIONS[f].motto}</small>
          </div>
        ))}
      </div>
      {WORLDS.map((w) => (
        <section key={w.id}>
          <h2>{w.name}</h2>
          <div className="hero-grid">
            {CHARACTERS.filter((c) => c.world === w.id)
              .sort((a, b) => a.rating - b.rating)
              .map((c) => {
              const rec = characterRecord(history, c.id);
              return (
                <button key={c.id} className="hero" onClick={() => challenge({ characterId: c.id, color: null, auto: false })} style={{ ['--fc' as string]: FACTIONS[c.faction].color }}>
                  <Portrait character={c} size={64} locked={rec.wins === 0} />
                  <b>{c.name}</b>
                  <small>{c.rating}</small>
                  <small className="hero-rec">
                    <CrownIcon crown={rec.crown} />
                    {rec.games ? `${rec.wins}–${rec.draws}–${rec.losses}` : '—'}
                    {rec.bestWin ? ` · best ${rec.bestWin} moves` : ''}
                  </small>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
