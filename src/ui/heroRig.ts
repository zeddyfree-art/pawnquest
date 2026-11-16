/** Shared 48×64 equipment registration. Body fits never move head, neck, hands or feet. */
export type HeroBody = 'male' | 'female';

export const HERO_ANCHORS = {
  head: [24, 18], neck: [24, 30], shoulders: [24, 33],
  waist: [24, 47], mainHand: [14, 43], offHand: [34, 43], feet: [24, 58],
} as const;

/** A restrained fit variation, shared by the body and clothes, rather than gendered item IDs.
 * The shoulder/waist envelopes return to 1 before reaching either hand or the neck. */
export function bodyWidthAt(body: HeroBody | undefined, y: number): number {
  if (body !== 'female') return 1;
  const envelope = (center: number, radius: number) => Math.max(0, 1 - Math.abs(y - center) / radius);
  return 1 - 0.07 * envelope(35, 4) - 0.10 * envelope(48, 3);
}
