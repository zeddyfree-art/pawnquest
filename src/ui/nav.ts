import { create } from 'zustand';
import type { Side } from '../game/chess';

export type Screen = 'map' | 'prematch' | 'battle' | 'result' | 'heroes' | 'profile';

export interface Matchup {
  characterId: string;
  /** Fixed by auto-match; null = the player chooses on the pre-match card. */
  color: Side | null;
  auto: boolean;
}

export const useNav = create<{ screen: Screen; matchup: Matchup | null; go: (s: Screen) => void; challenge: (m: Matchup) => void }>()((set) => ({
  screen: 'map',
  matchup: null,
  go: (screen) => {
    set({ screen });
    window.scrollTo?.(0, 0);
  },
  challenge: (matchup) => {
    set({ matchup, screen: 'prematch' });
    window.scrollTo?.(0, 0);
  },
}));
