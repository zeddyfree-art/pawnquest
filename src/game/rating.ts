// Plain Elo against bots with a fixed rating: beating someone far above you pays a lot, losing to them costs
// little, and the reverse. Ratings are whole numbers and never drop below the floor.
import { RATING } from '../config';

export function expectedScore(player: number, opponent: number): number {
  return 1 / (1 + Math.pow(10, (opponent - player) / 400));
}

export function kFactor(gamesPlayed: number): number {
  return gamesPlayed < RATING.placementGames ? RATING.kPlacement : RATING.kNormal;
}

/** Rating change for a result (1 win, 0.5 draw, 0 loss), after the floor. */
export function ratingDelta(player: number, opponent: number, score: number, gamesPlayed: number): number {
  const raw = Math.round(kFactor(gamesPlayed) * (score - expectedScore(player, opponent)));
  return Math.max(RATING.floor, player + raw) - player;
}

/** What is at stake before a game: the change for a win, a draw and a loss. */
export function stakes(player: number, opponent: number, gamesPlayed: number) {
  return {
    win: ratingDelta(player, opponent, 1, gamesPlayed),
    draw: ratingDelta(player, opponent, 0.5, gamesPlayed),
    loss: ratingDelta(player, opponent, 0, gamesPlayed),
  };
}

/** 1–3 skulls by how far the opponent is above you (0 when below or equal). */
export function skulls(player: number, opponent: number): 0 | 1 | 2 | 3 {
  const gap = opponent - player;
  if (gap <= 50) return 0;
  if (gap <= 250) return 1;
  if (gap <= 500) return 2;
  return 3;
}
