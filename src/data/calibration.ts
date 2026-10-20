// Calibration results (tools/calibrate): per character its measured rating, and the strength knobs: the Elo
// given to Maia, a factor on its sampling temperature and its share of random moves. Characters not listed use their starting values.
// Filled in from a calibration run (see tools/calibrate/README.md).
export interface Knobs {
  /** The measured rating (replaces the ladder step as the character's rating). */
  rating?: number;
  engineElo?: number;
  tempScale?: number;
  blunderPct?: number;
}

/** Measured in October 2026: 80 games per pair against the same rank and the ranks next to it (9360 games), Elo fit
 * anchored on the ladder's mean. Zed and the Jester play with a human temperament (their openings make them wild). */
export const CALIBRATION: Record<string, Knobs> = {
  "straw-sam": { rating: 557 },
  pip: { rating: 622 },
  "old-tom": { rating: 806 },
  moss: { rating: 945 },
  "brawling-bess": { rating: 830 },
  hobb: { rating: 991 },
  nell: { rating: 1174 },
  zed: { rating: 1203 },
  "squire-aldric": { rating: 1180 },
  grunwald: { rating: 1355 },
  morwen: { rating: 1282 },
  bram: { rating: 1264 },
  "captain-holt": { rating: 1425 },
  jester: { rating: 1377 },
  "sir-cedric": { rating: 1353 },
  "bishop-anselm": { rating: 1526 },
  vex: { rating: 1532 },
  "royal-champion": { rating: 1486 },
  spymaster: { rating: 1667 },
  scarlet: { rating: 1728 },
  thorne: { rating: 1707 },
  oakhart: { rating: 1832 },
  ignis: { rating: 1846 },
  solenne: { rating: 1818 },
  "frost-giant": { rating: 1970 },
  azgar: { rating: 1997 },
  "count-draven": { rating: 1989 },
  "bone-oracle": { rating: 2034 },
  "witch-queen": { rating: 2068 },
  "death-knight": { rating: 2074 },
  lich: { rating: 2124 },
  "necromancer-king": { rating: 2137 },
};
