// Themed piece sets: each has its own shapes (not only its own colours), drawn in the same 32-unit space as the
// classic set, so they read as chess pieces first. Every piece keeps the classic silhouette cues: the king is the
// tallest with a crown or antlers, the queen has a spiky crown, the bishop a tall pointed head, the rook a flat or
// built top, the knight faces left, the pawn is small and round.
import { any, base, ellipse, half, minus, mirror, polygon, rect, segment, type Design } from './pieceShapes';
import type { Role } from 'chessops/types';

export type ThemeDesigns = Record<Role, Design>;

const pupil = (x: number, y: number, r = 1) => ellipse(x, y, r, r * 1.1);

/** Woodland folk: acorn, tree house, owl, fox, dryad, stag. */
export const WOODLAND: ThemeDesigns = {
  pawn: {
    body: any(rect(15.2, 2.6, 16.8, 6), minus(ellipse(16, 9.4, 6.4, 4.4), rect(0, 9.6, 32, 32)), rect(9.6, 8.4, 22.4, 10.2), ellipse(16, 13, 4.8, 4.6), half(16.5, 23.5, 3, 7), base),
    gold: any(rect(15.2, 2.6, 16.8, 6), minus(ellipse(16, 9.4, 6.4, 4.4), rect(0, 9.6, 32, 32)), rect(9.6, 8.4, 22.4, 10.2)),
  },
  rook: {
    body: any(ellipse(11, 7.4, 5, 4.2), ellipse(21, 7.4, 5, 4.2), ellipse(16, 4.8, 5.6, 4.2), ellipse(16, 9.4, 7.6, 3), rect(12.4, 10, 19.6, 21.5), half(19, 23.5, 4, 7.5), base),
    gold: any(ellipse(11, 7.4, 5, 4.2), ellipse(21, 7.4, 5, 4.2), ellipse(16, 4.8, 5.6, 4.2), ellipse(16, 9.4, 7.6, 3)),
    carve: any(ellipse(16, 16.4, 1.8, 2), rect(14.2, 16.4, 17.8, 20.5)),
  },
  bishop: {
    body: any(ellipse(16, 12.5, 6.6, 8.2), polygon([[10, 7.5], [10.4, 2.4], [13.6, 5.6]]), mirror(polygon([[10, 7.5], [10.4, 2.4], [13.6, 5.6]])), half(19.5, 23.5, 4.5, 7.2), base),
    gold: any(ellipse(13.3, 10, 2.3, 2.3), ellipse(18.7, 10, 2.3, 2.3), polygon([[15, 12.2], [17, 12.2], [16, 14.6]])),
    carve: any(pupil(13.5, 10.2), pupil(18.5, 10.2), segment(13, 16, 14, 17, 0.6), segment(19, 16, 18, 17, 0.6), segment(16, 17, 16, 18.2, 0.6)),
  },
  knight: {
    body: any(polygon([[8.5, 24], [10, 18.5], [7.5, 15.5], [2.8, 13.6], [5.5, 10.5], [9.5, 8.6], [9.8, 2.4], [14, 6.6], [18.5, 2.6], [19.5, 8.8], [24, 13], [25.4, 18.5], [24, 24]]), base),
    gold: polygon([[2.8, 13.6], [5.5, 10.5], [9.6, 11], [11, 14.2], [7.5, 15.5]]),
    carve: any(pupil(11.8, 10.2), ellipse(3.4, 13, 0.9, 0.9), segment(11, 4.4, 12.6, 7, 0.7), segment(17.6, 4.4, 17, 7.4, 0.7)),
  },
  queen: {
    body: any(
      ...[[8.5, 7], [12, 4], [16, 2.8], [20, 4], [23.5, 7]].map(([x, y]) => ellipse(x, y, 2.4, 3)),
      ellipse(16, 10, 4.2, 4.4),
      half(12.5, 15.5, 4.5, 6.6),
      half(15.5, 23.5, 5, 8.5),
      base,
    ),
    gold: any(...[[8.5, 7], [12, 4], [16, 2.8], [20, 4], [23.5, 7]].map(([x, y]) => ellipse(x, y, 2.4, 3)), rect(9.5, 16.6, 22.5, 18)),
    carve: any(pupil(14.4, 10.2, 0.7), pupil(17.6, 10.2, 0.7)),
  },
  king: {
    body: any(
      segment(13.6, 9, 10, 2.2, 1.7), segment(11.4, 4.8, 7.4, 4.2, 1.5), segment(18.4, 9, 22, 2.2, 1.7), segment(20.6, 4.8, 24.6, 4.2, 1.5),
      ellipse(10.6, 11.4, 2.4, 1.3), ellipse(21.4, 11.4, 2.4, 1.3),
      ellipse(16, 13, 4.4, 5.2), ellipse(16, 17.2, 3, 2.4), half(19, 23.5, 4.5, 7.5), base,
    ),
    gold: any(segment(13.6, 9, 10, 2.2, 1.7), segment(11.4, 4.8, 7.4, 4.2, 1.5), segment(18.4, 9, 22, 2.2, 1.7), segment(20.6, 4.8, 24.6, 4.2, 1.5)),
    carve: any(pupil(14.2, 12.6, 0.8), pupil(17.8, 12.6, 0.8), ellipse(16, 18.4, 1.3, 0.8)),
  },
};

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

/** Bone and spirit: skull, crypt, hooded monk, skeletal horse, banshee, crowned lich. */
export const BONES: ThemeDesigns = {
  pawn: {
    body: any(ellipse(16, 9.5, 5.6, 5.2), rect(12.6, 12.5, 19.4, 16), half(16, 23.5, 2.6, 7), base),
    carve: any(ellipse(13.7, 9.6, 1.6, 1.8), ellipse(18.3, 9.6, 1.6, 1.8), polygon([[16, 11.4], [17, 13.2], [15, 13.2]]), rect(14.4, 14.4, 15, 16), rect(17, 14.4, 17.6, 16)),
  },
  rook: {
    body: any(rect(8.5, 8, 23.5, 21.5), polygon([[7, 8.6], [16, 3], [25, 8.6]]), rect(15.3, 0.4, 16.7, 5), rect(13.8, 1.6, 18.2, 2.9), half(21.5, 23.5, 6.3, 7.5), base),
    gold: any(rect(15.3, 0.4, 16.7, 5), rect(13.8, 1.6, 18.2, 2.9)),
    carve: any(ellipse(16, 15.4, 2.6, 2.6), rect(13.4, 15.4, 18.6, 21.5)),
  },
  bishop: {
    body: any(polygon([[16, 1.6], [21.6, 8], [22.6, 20.5], [9.4, 20.5], [10.4, 8]]), half(20, 23.5, 4.5, 7.5), base),
    carve: minus(ellipse(16, 10.2, 3.3, 3.9), pupil(14.8, 10, 0.8), pupil(17.2, 10, 0.8)),
  },
  knight: {
    body: any(polygon([[8, 24], [9, 19], [13, 15.5], [10, 14.6], [6, 15.6], [3.8, 13.2], [4.8, 10], [9.6, 6], [11.8, 2], [14.8, 4.8], [18, 2.4], [19.2, 6], [23.2, 8.8], [25.8, 14], [25.8, 19], [24, 24]]), base),
    carve: any(ellipse(11.4, 9.4, 1.7, 1.7), ellipse(5.6, 13, 0.8, 0.8), segment(17, 10, 22.4, 15.4, 0.8), segment(15.6, 13, 21, 18.6, 0.8), segment(14.6, 16, 19.4, 21, 0.8)),
  },
  queen: {
    body: any(polygon([[11, 6.4], [12, 2.4], [13.6, 5.2], [16, 1.2], [18.4, 5.2], [20, 2.4], [21, 6.4]]), polygon([[16, 3.6], [22, 8.6], [25, 23.5], [7, 23.5], [10, 8.6]]), base),
    gold: polygon([[11, 6.4], [12, 2.4], [13.6, 5.2], [16, 1.2], [18.4, 5.2], [20, 2.4], [21, 6.4]]),
    carve: minus(ellipse(16, 11, 3.1, 3.7), pupil(14.8, 10.8, 0.8), pupil(17.2, 10.8, 0.8)),
  },
  king: {
    body: any(polygon([[10.5, 8.6], [10.5, 3.4], [13, 6], [16, 2.4], [19, 6], [21.5, 3.4], [21.5, 8.6]]), ellipse(16, 11.6, 5.4, 5), rect(12.8, 14.5, 19.2, 17.5), half(17.5, 23.5, 5.5, 8.5), base),
    gold: polygon([[10.5, 8.6], [10.5, 3.4], [13, 6], [16, 2.4], [19, 6], [21.5, 3.4], [21.5, 8.6]]),
    carve: any(ellipse(13.9, 11.8, 1.5, 1.7), ellipse(18.1, 11.8, 1.5, 1.7), polygon([[16, 13.4], [16.9, 15], [15.1, 15]]), rect(14.4, 16.2, 15, 17.5), rect(17, 16.2, 17.6, 17.5)),
  },
};

const cap = (cy: number, rx: number, ry: number) => minus(ellipse(16, cy, rx, ry), rect(0, cy, 32, 32));

/** Mushroom garden: toadstool, mushroom house, inkcap, snail, flower, crowned toadstool. Spots in the trim colour. */
export const GARDEN: ThemeDesigns = {
  pawn: {
    body: any(cap(10.4, 7.4, 6), rect(8.6, 9.6, 23.4, 11), half(11, 23.5, 2.8, 6.5), base),
    gold: any(ellipse(12.6, 7.4, 1.4, 1.1), ellipse(18.6, 6.4, 1.5, 1.1), ellipse(16, 9, 1, 0.8)),
  },
  rook: {
    body: any(cap(9, 10.4, 7.6), rect(10, 9, 22, 21.5), half(21.5, 23.5, 6.3, 7.5), base),
    gold: any(ellipse(10.4, 6.6, 1.5, 1.1), ellipse(16.4, 4, 1.7, 1.2), ellipse(21.6, 6.8, 1.4, 1.1)),
    carve: any(ellipse(16, 16.4, 2, 2), rect(14, 16.4, 18, 21.5), ellipse(12.4, 12.4, 1, 1), ellipse(19.6, 12.4, 1, 1)),
  },
  bishop: {
    body: any(minus(ellipse(16, 10, 5.4, 8.4), rect(0, 14.6, 32, 32)), half(14.6, 23.5, 2.4, 6.5), base),
    gold: any(ellipse(16, 3.4, 1.6, 1.3), ellipse(13.6, 8.4, 1.1, 1), ellipse(18.4, 10.4, 1.1, 1)),
    carve: any(segment(13.4, 13.2, 13.6, 14.6, 0.5), segment(16, 13.4, 16, 14.6, 0.5), segment(18.6, 13.2, 18.4, 14.6, 0.5)),
  },
  knight: {
    body: any(ellipse(18.4, 13.4, 6.6, 6.6), polygon([[4.6, 23.5], [6.6, 16.6], [10, 17.6], [26, 19.8], [26.4, 23.5]]), segment(7.6, 17, 5.4, 9.4, 1.7), ellipse(5.4, 8.8, 1.5, 1.5), segment(9.4, 17.4, 9, 10.6, 1.5), ellipse(9, 10.2, 1.3, 1.3), base),
    gold: any(ellipse(5.4, 8.8, 1.5, 1.5), ellipse(9, 10.2, 1.3, 1.3)),
    carve: any(minus(ellipse(18.4, 13.4, 4.6, 4.6), ellipse(18.4, 13.4, 3.6, 3.6)), minus(ellipse(19, 13.8, 2.2, 2.2), ellipse(19, 13.8, 1.3, 1.3))),
  },
  queen: {
    body: any(
      ...[0, 1, 2, 3, 4, 5].map((i) => ellipse(16 + 3.9 * Math.cos((i * Math.PI) / 3 - Math.PI / 2), 7.6 + 3.9 * Math.sin((i * Math.PI) / 3 - Math.PI / 2), 2.7, 2.7)),
      segment(16, 11, 16, 20, 1.8),
      polygon([[16, 18], [10.6, 14], [9.8, 17]]),
      mirror(polygon([[16, 18], [10.6, 14], [9.8, 17]])),
      half(19, 23.5, 3.5, 7),
      base,
    ),
    gold: ellipse(16, 7.6, 2.3, 2.3),
  },
  king: {
    body: any(polygon([[11.5, 7.2], [11.5, 2.6], [13.8, 4.6], [16, 1.2], [18.2, 4.6], [20.5, 2.6], [20.5, 7.2]]), cap(13.4, 9.4, 7), rect(6.6, 12.4, 25.4, 13.8), half(13.8, 23.5, 3.6, 7), base),
    gold: polygon([[11.5, 7.2], [11.5, 2.6], [13.8, 4.6], [16, 1.2], [18.2, 4.6], [20.5, 2.6], [20.5, 7.2]]),
    carve: any(ellipse(10.6, 10.6, 1.2, 0.9), ellipse(21.4, 10.6, 1.2, 0.9)),
  },
};
