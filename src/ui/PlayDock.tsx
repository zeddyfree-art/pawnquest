// The button above the tabs: Play on the map, or Continue (on every tab) while a fight is waiting; under it, the
// notice that a new version is ready.
import { characterById } from '../data/characters';
import { autoMatch } from '../game/matchmaking';
import { useSave } from '../store/save';
import { Portrait } from './components';
import { useNav } from './nav';
import { useUpdate } from '../version';

export function PlayDock() {
  const { rating, history, active } = useSave();
  const { screen, go, challenge } = useNav();
  const foe = active && characterById(active.characterId);
  const update = useUpdate((s) => s.available) && (
    <button className="update-pill" onClick={() => location.reload()}>
      New version ready · tap to update
    </button>
  );

  if (foe)
    return (
      <div className="play-dock">
        <button className="resume" onClick={() => go('battle')}>
          <Portrait character={foe} size={40} />
          <span>
            <small>Your fight with {foe.name} is waiting</small>
            <b className="pixel">Continue</b>
          </span>
        </button>
        {update}
      </div>
    );
  if (screen !== 'map') return update ? <div className="play-dock">{update}</div> : null;
  const play = () => {
    const m = autoMatch(rating, history);
    challenge({ characterId: m.character.id, color: m.color, auto: true });
  };
  return (
    <div className="play-dock">
      <button className="btn big primary" onClick={play}>
        Play
      </button>
      {update}
    </div>
  );
}
