// Every tunable number in one place. Values marked "calibrate" are starting points that
// tools/calibrate.ts (phase 5) will replace with measured ones.

export const RATING = {
  start: 600,
  floor: 400,
  /** K-factor while the player is being placed, then afterwards. */
  kPlacement: 40,
  kNormal: 24,
  placementGames: 20,
};

export const CLOCK = {
  /** Always 15+10 for both sides. */
  minutes: 15,
  incrementSeconds: 10,
};

export const MATCHMAKING = {
  /** Default target: this much above the player's rating (expected score about 0.4–0.5). */
  aboveBy: 100,
  /** After this many losses in a row, aim below the player instead. */
  lossStreakForEasier: 3,
  belowBy: 100,
  /** Every Nth auto-match picks the faction with the player's worst score. */
  weaknessEvery: 3,
};

/** Crowns per character: bronze, silver, gold at this many wins. */
export const CROWNS = { bronze: 1, silver: 3, gold: 5 };

/** Pets grow with the games played together: an accessory, then the grown-up form. */
export const PET_GROWTH = { accessory: 25, grown: 100 };

/** XP per game result, per crown earned, and per good-habit chip on the result screen (two at most). */
export const XP = { win: 30, draw: 15, loss: 5, crown: 50, habit: 10, perLevel: 200 };

export type Temperament = 'chaotic' | 'human' | 'steady' | 'cold';

/** Personality knobs (Maia sampling). calibrate */
export const TEMPERAMENTS: Record<Temperament, { label: string; temperature: number; topP: number }> = {
  chaotic: { label: 'Chaotic', temperature: 1.4, topP: 0.98 },
  human: { label: 'Human', temperature: 1.0, topP: 0.9 },
  steady: { label: 'Steady', temperature: 0.6, topP: 0.85 },
  cold: { label: 'Cold', temperature: 0.2, topP: 0.7 },
};

/**
 * Strength schedule by rank: the temperament's temperature is multiplied by this factor. Phase 0 showed that at
 * the top the Elo input alone barely separates the bots, while a lower temperature for the stronger side restores
 * the expected 200-point gap (2200 at T 1.0 vs 2400 at T 0.6 scored 25%). calibrate
 */
export function rankTemperatureFactor(rating: number): number {
  if (rating <= 1600) return 1;
  if (rating <= 2000) return 0.8;
  if (rating <= 2400) return 0.6;
  return 0.5;
}

/** Below this probability a move is never sampled (keeps the bot from absurd moves outside its blunder budget). */
export const MIN_MOVE_PROBABILITY = 0.005;

/** Which network plays at which rating. 5M is bundled (fast first start); 79M int8 is an 82 MB download. */
export function modelForRating(rating: number): ModelId {
  return rating >= 1400 ? '79m' : '5m';
}
export type ModelId = '5m' | '79m';

export const BOT = {
  /** Never think less than this, so a move never lands instantly (seconds). */
  minThink: 0.5,
  /** Never spend more than this share of the remaining clock on one move. */
  maxClockShare: 0.05,
  /** Resign when the bot's winning chance (Maia's value head) stays below this for `resignMoves` own moves. */
  resignWinChance: 0.03,
  resignMoves: 4,
  /** Bots below this rating never resign: beginners should practise mating. */
  resignFromRating: 1000,
  /** Accept a draw offer only in an endgame (non-pawn material per side, in pawns, at most this)… */
  drawEndgameMaterial: 13,
  /** …and only when its winning chance is at most this. */
  drawAcceptWinChance: 0.55,
};

/** Game review. Labels by Win% the move lost (the brief's thresholds); engine depths kept low enough for a phone. */
export const REVIEW = {
  excellent: 2,
  good: 5,
  inaccuracy: 10,
  mistake: 20,
  /** Every position, quickly. */
  quick: { depth: 12, movetime: 600 },
  /** The player's worst moves, again and deeper, with the three best moves. */
  deep: { depth: 16, movetime: 2000, multiPv: 3 },
  /** How many key moments the review explains. */
  moments: 3,
  /** Moves within this many Win% of the best move count as "the right move" for Maia insights. */
  goodEnough: 5,
};
