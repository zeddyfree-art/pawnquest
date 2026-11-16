import type { HeadKind } from './hero';

/** First visible hair row on the canonical 192×256 equipment canvas.
 * Closed hats compress the top of the hairstyle; crowns and feathers stay open.
 * The cap edges cover the cut line when composited over the hair. */
export function heroHairTop(kind?: HeadKind): number {
  if (kind === 'hood' || kind === 'helmet') return Infinity;
  const caps: Partial<Record<HeadKind, number>> = {
    strawhat: 58, bandana: 56, witchhat: 54, jester: 52, tricorn: 48, beanie: 54,
  };
  return kind ? caps[kind] ?? 0 : 0;
}
