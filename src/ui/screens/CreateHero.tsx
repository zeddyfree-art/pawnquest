// Making your hero: a name, a class (its starting outfit and title) and a look. Shown before the first game, and
// again from the Hero screen to change the look. Some hair styles and colours unlock at higher levels.
import { useState } from 'react';
import { connectDrive } from '../../store/drive';
import { CLASSES, EYES, HAIR_COLORS, HAIR_STYLES, SKINS, classById, newHero, type Hero } from '../../data/gear';
import { levelFor } from '../../game/progress';
import { useSave } from '../../store/save';
import { ALL_SETS, pieceDataUrl, STARTING_SETS } from '../pieces';
import { HeroSprite } from '../components';
import type { HeroLook } from '../hero';
import { useNav } from '../nav';

const STYLE_LABEL: Record<string, string> = { short: 'Short', messy: 'Messy', long: 'Long', ponytail: 'Ponytail', bob: 'Bob', none: 'Bald', bun: 'Bun', braids: 'Braids', curly: 'Curly', spiky: 'Spiky' };

export function CreateHero() {
  const existing = useSave((s) => s.hero);
  const xp = useSave((s) => s.xp);
  const setHero = useSave((s) => s.setHero);
  const pieceSet = useSave((s) => s.settings.pieceSet);
  const setSettings = useSave((s) => s.setSettings);
  const go = useNav((s) => s.go);
  const level = levelFor(xp).level;
  const [name, setName] = useState(existing?.name ?? '');
  const [cls, setCls] = useState<Hero['cls']>(existing?.cls ?? 'squire');
  const [look, setLook] = useState<HeroLook>(existing?.look ?? { skin: SKINS[2], hair: HAIR_COLORS[1].color, hairStyle: 'messy', eyes: EYES[0] });
  const patch = (p: Partial<HeroLook>) => setLook({ ...look, ...p });

  // While making a new hero the class shows its starting outfit; when editing, the hero keeps what they wear.
  const preview: Hero = existing ? { ...existing, cls, look, name } : newHero(name, cls, look);
  const save = () => {
    setHero(existing ? { ...existing, name: name.trim() || 'Hero', cls, look } : newHero(name, cls, look));
    go(existing ? 'hero' : 'map');
  };

  return (
    <div className="create">
      <h1>{existing ? 'Change your look' : 'Who goes on this quest?'}</h1>
      <div className="create-preview panel">
        <HeroSprite hero={preview} size={128} />
        <b className="pixel">{name.trim() || 'Hero'}</b>
        <small>{classById(cls).name}</small>
      </div>

      <div className="panel create-form">
        <label className="field">
          <span>Name</span>
          <input value={name} maxLength={16} placeholder="Hero" onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>

        <fieldset>
          <legend>Class</legend>
          <div className="class-grid" role="radiogroup" aria-label="Class">
            {CLASSES.map((c) => (
              <button key={c.id} role="radio" aria-checked={cls === c.id} className={`class-card${cls === c.id ? ' on' : ''}`} onClick={() => setCls(c.id)}>
                <HeroSprite hero={newHero('', c.id, look)} size={72} pet={false} />
                <b>{c.name}</b>
                <small>{c.blurb}</small>
              </button>
            ))}
          </div>
          {existing && <p className="muted small">Your class is your title. You keep everything you have won.</p>}
        </fieldset>

        <fieldset>
          <legend>Skin</legend>
          <div className="swatches" role="radiogroup" aria-label="Skin">
            {SKINS.map((c, i) => (
              <button key={c} role="radio" aria-checked={look.skin === c} aria-label={`Skin ${i + 1}`} className={`swatch${look.skin === c ? ' on' : ''}`} style={{ background: c }} onClick={() => patch({ skin: c })} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Hair</legend>
          <div className="chips" role="radiogroup" aria-label="Hair style">
            {HAIR_STYLES.map((h) => {
              const locked = h.level > level;
              return (
                <button key={h.id} role="radio" aria-checked={look.hairStyle === h.id} className={`chip${look.hairStyle === h.id ? ' on' : ''}`} disabled={locked} title={locked ? `Unlocks at level ${h.level}` : undefined} onClick={() => patch({ hairStyle: h.id })}>
                  {STYLE_LABEL[h.id]}
                  {locked && <small> · Lv {h.level}</small>}
                </button>
              );
            })}
          </div>
          <div className="swatches" role="radiogroup" aria-label="Hair colour">
            {HAIR_COLORS.map((h, i) => {
              const locked = h.level > level;
              return (
                <button
                  key={h.color}
                  role="radio"
                  aria-checked={look.hair === h.color}
                  aria-label={locked ? `Hair colour ${i + 1}, unlocks at level ${h.level}` : `Hair colour ${i + 1}`}
                  title={locked ? `Unlocks at level ${h.level}` : undefined}
                  disabled={locked}
                  className={`swatch${look.hair === h.color ? ' on' : ''}${locked ? ' locked' : ''}`}
                  style={{ background: h.color }}
                  onClick={() => patch({ hair: h.color })}
                />
              );
            })}
          </div>
        </fieldset>

        {!existing && (
          <fieldset>
            <legend>Pieces</legend>
            <div className="piece-choice" role="radiogroup" aria-label="Pieces">
              {STARTING_SETS.map((id) => (
                <button key={id} role="radio" aria-checked={pieceSet === id} className={`pick wide${pieceSet === id ? ' on' : ''}`} onClick={() => setSettings({ pieceSet: id })}>
                  <span className="piece-pair">
                    <img src={pieceDataUrl('queen', 'white', id)} alt="" width={32} height={32} />
                    <img src={pieceDataUrl('knight', 'black', id)} alt="" width={32} height={32} />
                  </span>
                  <small>{ALL_SETS.find((x) => x.id === id)?.name}</small>
                </button>
              ))}
            </div>
            <small className="muted">More sets come with quests. You can change this any time on the Hero screen.</small>
          </fieldset>
        )}

        <fieldset>
          <legend>Eyes</legend>
          <div className="swatches" role="radiogroup" aria-label="Eyes">
            {EYES.map((c, i) => (
              <button key={c} role="radio" aria-checked={look.eyes === c} aria-label={`Eye colour ${i + 1}`} className={`swatch${look.eyes === c ? ' on' : ''}`} style={{ background: c }} onClick={() => patch({ eyes: c })} />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="actions">
        {existing && (
          <button className="btn" onClick={() => go('hero')}>
            Cancel
          </button>
        )}
        <button className="btn primary big" onClick={save}>
          {existing ? 'Save' : 'Begin your quest'}
        </button>
      </div>
      {!existing && (
        <p className="center muted">
          Already playing on another device?{' '}
          <button className="linkish" onClick={() => void connectDrive()}>
            Continue with Google
          </button>
        </p>
      )}
    </div>
  );
}
