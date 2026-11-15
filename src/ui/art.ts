// Generated art (public/art/, listed in data/art.ts): where a picture exists it is used, else the code drawing.
import { ART_FIGURES, ART_MAP_REGIONS, ART_PORTRAITS } from '../data/art';
import type { Mood } from './portraits';

const url = (rel: string) => `${import.meta.env.BASE_URL}art/${rel}.webp`;

export const portraitArt = (id: string, mood: Mood) => (ART_PORTRAITS.has(id) ? url(`rivals/${id}-${mood}`) : null);
export const figureArt = (id: string) => (ART_FIGURES.has(id) ? url(`figures/${id}`) : null);
export const mapRegionArt = (world: string) => (ART_MAP_REGIONS.has(world) ? url(`map/${world}`) : null);
