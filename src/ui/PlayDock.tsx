// The button above the tabs: Play on the map, or Continue (on every tab) while a fight is waiting.
import { characterById } from '../data/characters';
import { autoMatch } from '../game/matchmaking';
import { useSave } from '../store/save';
import { Portrait } from './components';
import { useNav } from './nav';

export function PlayDock() {
  const { rating, history, active } = useSave();
  const { screen, go, challenge } = useNav();
  const foe = active && characterById(active.characterId);

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
      </div>
    );
  if (screen !== 'map') return null;
  const play = () => {
    const m = autoMatch(rating, history);
    challenge({ characterId: m.character.id, color: m.color, auto: true });
  };
  return (
    <div className="play-dock">
      <button className="btn big primary" onClick={play}>
        Play
      </button>
    </div>
  );
}
