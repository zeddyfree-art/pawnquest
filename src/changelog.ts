// What changed, shown once after an update ("What's new"), and in full on the Profile screen.
//
// When a version players will notice is published: raise "version" in package.json and add an entry at the top, in
// plain words about what a player sees. A build without a new entry shows nothing.

export const APP_VERSION = __APP_VERSION__;

export interface ChangelogEntry {
  version: string;
  items: string[];
}

/** Newest first. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.9.1',
    items: [
      'After an update, this scroll tells you what is new.',
      'Send feedback straight from the game: on the Profile screen, under About.',
      'New lately: Ranks — your class title grows with your best rating, from Squire to Kingsguard Eternal (see the Hero screen).',
    ],
  },
  {
    version: '0.9',
    items: [
      'Ranks: your class title grows with your best rating — a Squire becomes Man-at-Arms, Cavalier, Knight … up to Kingsguard Eternal. Each step is a milestone quest.',
    ],
  },
  {
    version: '0.8.2',
    items: ['Clearer piece colours in every set, and Fire & Ice, a set with its own crystal shapes.'],
  },
  {
    version: '0.8.1',
    items: ['Games you have not reviewed yet are reviewed in the background, newest first.'],
  },
  {
    version: '0.8',
    items: [
      'Puzzle book: every clear mistake in a reviewed game becomes a puzzle, with hints in steps.',
      'A passport with a stamp per region, Friend of the Realm, victory effects and Professor Hoot’s glasses and cap.',
    ],
  },
  { version: '0.7', items: ['Rewards for how you play: quests for good habits, titles, and pets that grow with you.'] },
  { version: '0.6', items: ['Music: a tune for the map and one per region in a fight, with jingles for results and rewards.'] },
  { version: '0.5', items: ['The world map, and What to study on your profile.'] },
];

const SEEN_KEY = 'pawnquest-seen-version';

export function markVersionSeen() {
  try {
    localStorage.setItem(SEEN_KEY, APP_VERSION);
  } catch {
    /* ignore */
  }
}

/** What to show once after an update, or null: nothing new, already seen, or a new player (marked up to date). */
export function newsToShow(isNewPlayer: boolean): ChangelogEntry | null {
  let seen: string | null = null;
  try {
    seen = localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
  if (seen === APP_VERSION) return null;
  if (isNewPlayer) {
    markVersionSeen();
    return null;
  }
  return CHANGELOG.find((c) => c.version === APP_VERSION) ?? null;
}

/** The feedback e-mail, with the version and device filled in so a report says what it is about. */
export function feedbackHref(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const body = `\n\n\n—\nPawnquest ${APP_VERSION} (${__APP_COMMIT__})\n${ua}`;
  return `mailto:zeddyfree@gmail.com?subject=${encodeURIComponent('Pawnquest feedback')}&body=${encodeURIComponent(body)}`;
}
