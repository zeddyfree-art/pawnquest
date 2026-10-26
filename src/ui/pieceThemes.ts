// Themed piece sets: their own shapes (not only their own colours), drawn in the same 32-unit space as the classic
// set, so they read as chess pieces first: the king is the tallest with a cross, the queen has a spiky crown, the
// bishop a tall pointed head, the rook a built top, the knight faces left, the pawn is small.
import { any, base, half, polygon, rect, segment, type Design } from './pieceShapes';
import type { Role } from 'chessops/types';

export type ThemeDesigns = Record<Role, Design>;

/** Fire and ice: faceted crystals and lava rock; the left facet catches the light in the trim colour. */
export const ELEMENTS: ThemeDesigns = {
  pawn: {
    body: any(polygon([[16, 3.5], [20.6, 9.6], [16, 15], [11.4, 9.6]]), half(14, 23.5, 2.8, 7), base),
    gold: polygon([[16, 3.5], [16, 15], [11.4, 9.6]]),
  },
  rook: {
    body: any(polygon([[8.5, 21.5], [8.5, 10], [10.5, 4.5], [12.5, 10], [14, 10], [16, 2.8], [18, 10], [19.5, 10], [21.5, 4.5], [23.5, 10], [23.5, 21.5]]), half(21.5, 23.5, 6.3, 7.5), base),
    gold: any(polygon([[8.5, 10], [10.5, 4.5], [10.5, 10]]), polygon([[14, 10], [16, 2.8], [16, 10]]), polygon([[19.5, 10], [21.5, 4.5], [21.5, 10]])),
    carve: polygon([[16, 12.5], [17.6, 15.5], [16, 18.5], [14.4, 15.5]]),
  },
  bishop: {
    body: any(polygon([[16, 1.5], [22, 11], [19.5, 20.5], [12.5, 20.5], [10, 11]]), half(20, 23.5, 4, 7), base),
    gold: polygon([[16, 1.5], [16, 20.5], [12.5, 20.5], [10, 11]]),
    carve: segment(18.8, 6.6, 14.2, 13.4, 1),
  },
  knight: {
    body: any(polygon([[8, 24], [9, 18.5], [12.5, 15], [9, 14.5], [4.5, 15.5], [3.4, 12], [8.5, 6.5], [11, 1.8], [14, 5], [17.5, 2.2], [19, 6.5], [24, 10], [26, 16], [25, 24]]), base),
    gold: any(polygon([[8.5, 6.5], [11, 1.8], [14, 5], [12.4, 9.4]]), polygon([[19, 6.5], [24, 10], [26, 16], [21, 12]])),
    carve: polygon([[10.4, 9], [12.6, 8.6], [11.2, 10.6]]),
  },
  queen: {
    body: any(polygon([[5, 5], [9.5, 12.5], [10.5, 3], [13.8, 11], [16, 1.5], [18.2, 11], [21.5, 3], [22.5, 12.5], [27, 5], [23.5, 15.4], [8.5, 15.4]]), half(15.4, 16.8, 8, 7), half(16.8, 23.5, 5, 8), base),
    gold: any(rect(8.6, 14, 23.4, 15.4), polygon([[16, 7], [17.5, 10], [16, 13], [14.5, 10]])),
  },
  king: {
    body: any(
      polygon([[16, 0.6], [17.8, 3.5], [16, 6.4], [14.2, 3.5]]), polygon([[11.6, 3.5], [14.2, 2.4], [14.2, 4.6]]), polygon([[20.4, 3.5], [17.8, 2.4], [17.8, 4.6]]),
      rect(15.2, 6, 16.8, 9.5),
      polygon([[7.5, 15.8], [7, 8.5], [11, 11.5], [13, 6.8], [16, 9.5], [19, 6.8], [21, 11.5], [25, 8.5], [24.5, 15.8]]), half(15.8, 23.5, 5, 8), base,
    ),
    gold: any(polygon([[16, 0.6], [17.8, 3.5], [16, 6.4], [14.2, 3.5]]), polygon([[11.6, 3.5], [14.2, 2.4], [14.2, 4.6]]), polygon([[20.4, 3.5], [17.8, 2.4], [17.8, 4.6]]), rect(7.6, 13.6, 24.4, 15.8)),
  },
};
