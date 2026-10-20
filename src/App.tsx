import { useEffect } from 'react';
import { initUpdateCheck, useUpdate } from './version';
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
import { ReviewScreen } from './ui/screens/ReviewScreen';
import { CreateHero } from './ui/screens/CreateHero';
import { HeroScreen } from './ui/screens/HeroScreen';
import { applyPieceSet } from './ui/pieces';
import { PlayDock } from './ui/PlayDock';

const TABS: { screen: Screen; label: string }[] = [
  { screen: 'map', label: 'Map' },
  { screen: 'heroes', label: 'Rivals' },
  { screen: 'hero', label: 'Hero' },
  { screen: 'profile', label: 'Profile' },
];

export function App() {
  const loaded = useSave((s) => s.loaded);
  const rating = useSave((s) => s.rating);
  const xp = useSave((s) => s.xp);
  const hasHero = useSave((s) => !!s.hero);
  const pieceSet = useSave((s) => s.settings.pieceSet);
  const { screen, go } = useNav();

  const updateAvailable = useUpdate((s) => s.available);
  useEffect(() => {
    void loadSave();
    initUpdateCheck();
  }, []);

  if (!loaded) return <div className="splash pixel">Pawnquest</div>;
  applyPieceSet(pieceSet);
  if (!hasHero)
    return (
      <div className="app screen-create">
        <main className="content">
          <CreateHero />
        </main>
      </div>
    );
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
      {updateAvailable && !inFight && (
        <button className="update-toast" onClick={() => location.reload()}>
          A new version of Pawnquest is ready. Tap to update.
        </button>
      )}
      <main className="content">
        {screen === 'map' && <MapScreen />}
        {screen === 'prematch' && <PreMatch />}
        {screen === 'battle' && <Battle />}
        {screen === 'result' && <ResultScreen />}
        {screen === 'heroes' && <HeroesScreen />}
        {screen === 'profile' && <ProfileScreen />}
        {screen === 'hero' && <HeroScreen />}
        {screen === 'create' && <CreateHero />}
        {screen === 'review' && <ReviewScreen />}
      </main>
      {['map', 'heroes', 'hero', 'profile'].includes(screen) && <PlayDock />}
      {!inFight && screen !== 'prematch' && screen !== 'create' && (
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
