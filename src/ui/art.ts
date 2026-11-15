// Generated art (public/art/, listed in data/art.ts): where a picture exists it is used, else the code drawing.
import { ART_FIGURES, ART_ICONS, ART_MAP_REGIONS, ART_PORTRAITS } from '../data/art';
import { ITEMS } from '../data/gear';
import type { GearArt } from './hero';
import type { Mood } from './portraits';

const url = (rel: string) => `${import.meta.env.BASE_URL}art/${rel}.webp`;

export const portraitArt = (id: string, mood: Mood) => (ART_PORTRAITS.has(id) ? url(`rivals/${id}-${mood}`) : null);
export const figureArt = (id: string) => (ART_FIGURES.has(id) ? url(`figures/${id}`) : null);
/** An item's generated icon (found by its drawing instructions, as the wardrobe passes them), or null. */
export function itemIconArt(a: GearArt): string | null {
  const id = ITEMS.find((i) => i.art === a)?.id;
  return id && ART_ICONS.has(id) ? url(`items/${id}`) : null;
}
export const mapRegionArt = (world: string) => (ART_MAP_REGIONS.has(world) ? url(`map/${world}`) : null);
