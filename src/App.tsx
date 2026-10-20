import { useEffect } from 'react';
import { levelFor } from './game/progress';
import { loadSave, useSave } from './store/save';
import { PawnIcon } from './ui/components';
import { useNav, type Screen } from './ui/nav';
import { Battle } from './ui/screens/Battle';
import { HeroesScreen } from './ui/screens/HeroesScreen';
import { MapScreen } from './ui/screens/MapScreen';
import { PreMatch } from './ui/screens/PreMatch';
import { ProfileScreen } from './ui/screens/ProfileScreen';
import { ResultScreen } from './ui/screens/ResultScreen';

const TABS: { screen: Screen; label: string }[] = [
  { screen: 'map', label: 'Map' },
  { screen: 'heroes', label: 'Heroes' },
  { screen: 'profile', label: 'Profile' },
];

export function App() {
  const loaded = useSave((s) => s.loaded);
  const rating = useSave((s) => s.rating);
  const xp = useSave((s) => s.xp);
  const { screen, go } = useNav();

  useEffect(() => {
    void loadSave();
  }, []);

  if (!loaded) return <div className="splash pixel">Pawnquest</div>;
  const lvl = levelFor(xp);
  const inFight = screen === 'battle';

  return (
    <div className={`app screen-${screen}`}>
      {!inFight && (
        <header className="topbar">
          <button className="logo" onClick={() => go('map')}>
            Pawnquest
          </button>
          <span className="hud">
            <span className="hud-rating" title="Your rating">
              <PawnIcon /> {rating}
            </span>
            <span className="hud-level" title={`${xp} XP`}>
              LV {lvl.level}
            </span>
          </span>
        </header>
      )}
      <main className="content">
        {screen === 'map' && <MapScreen />}
        {screen === 'prematch' && <PreMatch />}
        {screen === 'battle' && <Battle />}
        {screen === 'result' && <ResultScreen />}
        {screen === 'heroes' && <HeroesScreen />}
        {screen === 'profile' && <ProfileScreen />}
      </main>
      {!inFight && screen !== 'prematch' && (
        <nav className="tabs" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.screen} className={screen === t.screen ? 'on' : ''} aria-current={screen === t.screen ? 'page' : undefined} onClick={() => go(t.screen)}>
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
