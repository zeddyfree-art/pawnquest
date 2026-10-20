// Your hero: what they wear (six slots and a pet), the quests that unlock boards, piece sets and pets, and the
// collection of boards and pieces to play with.
import { useState } from 'react';
import { characterById, shortName } from '../../data/characters';
import { ITEMS, PETS, SLOT_LABEL, classById, itemById, petById } from '../../data/gear';
import { levelFor } from '../../game/progress';
import { QUESTS, unlocks, type Reward } from '../../game/unlocks';
import { progressOf, useSave } from '../../store/save';
import { BOARD_THEMES, boardDataUrl } from '../boards';
import { GearIcon, HeroSprite, PetIcon } from '../components';
import { SLOTS, type Slot } from '../hero';
import { useNav } from '../nav';
import { PIECE_SETS, pieceDataUrl } from '../pieces';

type Tab = 'gear' | 'quests' | 'collection';

export function rewardName(r: Reward): string {
  if (r.kind === 'board') return `${BOARD_THEMES.find((t) => t.id === r.id)?.name} board`;
  if (r.kind === 'pieces') return `${PIECE_SETS.find((p) => p.id === r.id)?.name} pieces`;
  return petById(r.id)?.name ?? r.id;
}

export function RewardIcon({ r, size = 36 }: { r: Reward; size?: number }) {
  if (r.kind === 'pet') return <PetIcon kind={r.id} size={size} />;
  if (r.kind === 'pieces') return <img className="gear-icon" src={pieceDataUrl('knight', 'black', r.id)} alt="" width={size} height={size} />;
  const t = BOARD_THEMES.find((b) => b.id === r.id)!;
  return <img className="gear-icon board-icon" src={boardDataUrl(t)} alt="" width={size} height={size} />;
}

export function HeroScreen() {
  const s = useSave();
  const { hero, equip, settings, setSettings, xp } = s;
  const go = useNav((n) => n.go);
  const [tab, setTab] = useState<Tab>('gear');
  const [open, setOpen] = useState<Slot | 'pet' | null>(null);
  const progress = progressOf(s);
  const u = unlocks(progress);
  if (!hero) return null;
  const lvl = levelFor(xp);
  const questFor = (r: Reward) => QUESTS.find((q) => q.reward.kind === r.kind && q.reward.id === r.id);

  return (
    <div className="hero-screen">
      <div className="panel hero-card">
        <HeroSprite hero={hero} size={160} />
        <div className="hero-card-info">
          <h1>{hero.name}</h1>
          <p className="muted">
            {classById(hero.cls).name} · Level {lvl.level}
          </p>
          <p className="muted small">
            {u.items.size - ITEMS.filter((i) => !i.from).length} of {ITEMS.filter((i) => i.from).length} trophies · {u.quests.size} of {QUESTS.length} quests
          </p>
          <button className="btn" onClick={() => go('create')}>
            Change look
          </button>
        </div>
      </div>

      <div className="seg" role="tablist" aria-label="Hero">
        {(['gear', 'quests', 'collection'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`chip${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {t === 'gear' ? 'Gear' : t === 'quests' ? 'Quests' : 'Boards & pieces'}
          </button>
        ))}
      </div>

      {tab === 'gear' && (
        <div className="panel slots">
          {[...SLOTS, 'pet' as const].map((slot) => {
            const isPet = slot === 'pet';
            const worn = isPet ? null : itemById(hero.equip[slot]);
            const pet = isPet ? petById(hero.pet) : null;
            const choices = isPet ? [] : ITEMS.filter((i) => i.art.slot === slot);
            return (
              <div key={slot} className="slot">
                <button className="slot-row" aria-expanded={open === slot} onClick={() => setOpen(open === slot ? null : slot)}>
                  <span className="slot-icon">{worn ? <GearIcon art={worn.art} /> : pet ? <PetIcon kind={pet.id} /> : null}</span>
                  <span className="slot-text">
                    <small>{isPet ? 'Pet' : SLOT_LABEL[slot]}</small>
                    <b>{worn?.name ?? pet?.name ?? 'Nothing'}</b>
                  </span>
                  <span className="slot-count">{isPet ? `${u.pets.size}/${PETS.length}` : `${choices.filter((i) => u.items.has(i.id)).length}/${choices.length}`}</span>
                </button>
                {open === slot && (
                  <div className="picker">
                    <button className={`pick${(isPet ? !hero.pet : !hero.equip[slot]) ? ' on' : ''}`} onClick={() => equip(slot, null)}>
                      <span className="pick-none">✕</span>
                      <small>None</small>
                    </button>
                    {isPet
                      ? PETS.map((p) => {
                          const owned = u.pets.has(p.id);
                          const q = questFor({ kind: 'pet', id: p.id });
                          return (
                            <button key={p.id} className={`pick${hero.pet === p.id ? ' on' : ''}`} disabled={!owned} onClick={() => equip('pet', p.id)} title={owned ? p.name : `Quest: ${q?.title}`}>
                              <PetIcon kind={p.id} locked={!owned} />
                              <small>{owned ? p.name.split(' ')[0] : q?.title}</small>
                            </button>
                          );
                        })
                      : choices.map((i) => {
                          const owned = u.items.has(i.id);
                          const from = i.from ? characterById(i.from) : undefined;
                          return (
                            <button key={i.id} className={`pick${hero.equip[slot] === i.id ? ' on' : ''}`} disabled={!owned} onClick={() => equip(slot, i.id)} title={owned ? i.name : `Beat ${from?.name}`}>
                              <GearIcon art={i.art} locked={!owned} />
                              <small>{owned ? i.name : `Beat ${from ? shortName(from.name) : '?'}`}</small>
                            </button>
                          );
                        })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'quests' && (
        <ul className="quests">
          {QUESTS.map((q) => {
            const [n, of] = q.progress(progress);
            const done = n >= of;
            return (
              <li key={q.id} className={`panel quest${done ? ' done' : ''}`}>
                <RewardIcon r={q.reward} />
                <span className="quest-text">
                  <b>{q.title}</b>
                  <small>{q.text}</small>
                  {done ? (
                    <small className="quest-reward">Unlocked: {rewardName(q.reward)}</small>
                  ) : (
                    <>
                      <span className="bar small">
                        <span style={{ width: `${(100 * n) / of}%` }} />
                      </span>
                      <small className="muted">
                        {of > 1 ? `${n}/${of} · ` : ''}Reward: {rewardName(q.reward)}
                      </small>
                    </>
                  )}
                </span>
                {done && <span className="check" aria-label="Done">✓</span>}
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'collection' && (
        <>
          <div className="panel">
            <h2>Board</h2>
            <div className="collection">
              <button className={`pick wide${settings.boardTheme === 'region' ? ' on' : ''}`} onClick={() => setSettings({ boardTheme: 'region' })}>
                <span className="pick-none">🗺</span>
                <small>Each region’s own</small>
              </button>
              {BOARD_THEMES.map((t) => {
                const owned = u.boards.has(t.id);
                const q = questFor({ kind: 'board', id: t.id });
                return (
                  <button key={t.id} className={`pick wide${settings.boardTheme === t.id ? ' on' : ''}`} disabled={!owned} onClick={() => setSettings({ boardTheme: t.id })}>
                    <img className={`gear-icon board-icon${owned ? '' : ' locked'}`} src={boardDataUrl(t)} alt="" width={56} height={56} />
                    <small>{owned ? t.name : `Quest: ${q?.title}`}</small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="panel">
            <h2>Pieces</h2>
            <div className="collection">
              {PIECE_SETS.map((p) => {
                const owned = u.pieces.has(p.id);
                const q = questFor({ kind: 'pieces', id: p.id });
                return (
                  <button key={p.id} className={`pick wide${settings.pieceSet === p.id ? ' on' : ''}`} disabled={!owned} onClick={() => setSettings({ pieceSet: p.id })}>
                    <span className={`piece-pair${owned ? '' : ' locked'}`}>
                      <img src={pieceDataUrl('queen', 'white', p.id)} alt="" width={32} height={32} />
                      <img src={pieceDataUrl('knight', 'black', p.id)} alt="" width={32} height={32} />
                    </span>
                    <small>{owned ? p.name : `Quest: ${q?.title}`}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
