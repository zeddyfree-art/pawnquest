import { useEffect, useRef } from 'react';
import { FACTIONS, type Character } from '../data/characters';
import type { Crown } from '../game/progress';
import { drawPortrait } from './pixelArt';
import { BUST_SIZE, bustUrl, type Mood } from './portraits';
import { LOOKS } from '../data/looks';
import { pieceDataUrl } from './pieces';
import type { Role } from 'chessops/types';
import { outfitOf, type Hero } from '../data/gear';
import { gearIconUrl, heroUrl, HERO_H, HERO_W, PET_SIZE, petUrl, type GearArt, type HeroMood, type PetKind } from './hero';

export type { Mood };

export function Portrait({ character, size = 64, mood = 'idle', locked = false }: { character: Character; size?: number; mood?: Mood; locked?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const look = LOOKS[character.id];
  useEffect(() => {
    if (!look && ref.current) drawPortrait(ref.current, character.name, character.faction);
  }, [character, look]);
  const cls = `portrait mood-${mood}${locked ? ' locked' : ''}`;
  // Whole multiples of the 40-pixel art keep every pixel the same size (sharp, never smeared).
  const px = look ? Math.max(1, Math.round(size / BUST_SIZE)) * BUST_SIZE : size;
  const style = { width: px, height: px, ['--fc' as string]: FACTIONS[character.faction].color };
  if (look) return <img className={cls} style={style} src={bustUrl(character.id, look, mood)} alt="" aria-hidden="true" />;
  return <canvas ref={ref} className={cls} style={style} aria-hidden="true" />;
}

export function FactionBadge({ character }: { character: Character }) {
  const f = FACTIONS[character.faction];
  return (
    <span className="badge" style={{ ['--fc' as string]: f.color }}>
      {f.name}
    </span>
  );
}

const CROWN_LABEL: Record<Crown, string> = { none: 'No crown yet', bronze: 'Bronze crown', silver: 'Silver crown', gold: 'Gold crown' };

export function CrownIcon({ crown, size = 16 }: { crown: Crown; size?: number }) {
  if (crown === 'none') return null;
  const color = { bronze: '#c87e4f', silver: '#c0cbdc', gold: '#feae34' }[crown];
  return (
    <svg className="crown" width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" role="img" aria-label={CROWN_LABEL[crown]}>
      <path d="M0 2h1v1h1v1h1V2h2v2h1V3h1V2h1v5H0z" fill={color} />
      <path d="M1 6h6v1H1z" fill="#181425" opacity=".35" />
    </svg>
  );
}

/** A little pixel skull: X outline, o bone, K eye sockets and nose. */
const SKULL = ['..XXXXX..', '.XoooooX.', 'XoooooooX', 'XoKKoKKoX', 'XoKKoKKoX', 'XoooooooX', '.XooKooX.', '..XoXoX..', '..XXXXX..'];
const skullRects = (ch: string) => SKULL.flatMap((row, y) => [...row].map((c, x) => (c === ch ? `M${x} ${y}h1v1h-1z` : ''))).join('');
const SKULL_LINE = skullRects('X') + skullRects('K');
const SKULL_BONE = skullRects('o');

/** Risk as 1 to 3 skulls (how far the opponent is above you); "No risk" when they are not. */
export function Skulls({ n, size = 18 }: { n: number; size?: number }) {
  if (!n) return <span className="skulls none">No risk</span>;
  return (
    <span className="skulls" role="img" aria-label={`Risk: ${n} of 3 skulls`}>
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
          <path d={SKULL_BONE} fill="#f4ead6" />
          <path d={SKULL_LINE} fill="#3b2617" />
        </svg>
      ))}
    </span>
  );
}

export function Delta({ value }: { value: number }) {
  return <span className={value > 0 ? 'delta up' : value < 0 ? 'delta down' : 'delta'}>{value > 0 ? `+${value}` : value === 0 ? '±0' : `-${-value}`}</span>;
}

/** A tiny pixel pawn, for the rating badge (the pixel font has no chess glyphs). */
export function PawnIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M3 0h2v1h1v2H5v1h1v1h1v2H1V5h1V4h1V3H2V1h1z" fill="currentColor" />
    </svg>
  );
}

/** The pieces a side has taken, and how far ahead it is in material (+3), as on Lichess. */
export function Material({ roles, color, plus }: { roles: Role[]; color: 'white' | 'black'; plus: number }) {
  return (
    <span className="captured" aria-label={roles.length ? `Captured: ${roles.join(', ')}${plus > 0 ? `, ahead by ${plus}` : ''}` : undefined}>
      {roles.map((r, i) => (
        <img key={i} src={pieceDataUrl(r, color)} alt="" width={18} height={18} className={i > 0 && roles[i - 1] === r ? 'stack' : ''} />
      ))}
      {plus > 0 && <b className="material">+{plus}</b>}
    </span>
  );
}

/** The player's hero, full figure, with their pet beside them. `size` is the figure's height in CSS pixels. */
export function HeroSprite({ hero, size = 128, mood = 'idle', pet = true, className = '' }: { hero: Hero; size?: number; mood?: HeroMood; pet?: boolean; className?: string }) {
  const scale = size / HERO_H;
  return (
    <span className={`hero-sprite ${className}`} style={{ height: size }} aria-hidden="true">
      <img src={heroUrl(hero.look, outfitOf(hero), mood)} alt="" width={HERO_W * scale} height={size} />
      {pet && hero.pet && <img className="pet" src={petUrl(hero.pet)} alt="" width={PET_SIZE * scale} height={PET_SIZE * scale} />}
    </span>
  );
}

/** Head and shoulders of the hero, cropped from the full figure (for the fight screen). */
export function HeroBust({ hero, size = 44, mood = 'idle' }: { hero: Hero; size?: number; mood?: HeroMood }) {
  // The crop: 32×32 hero pixels from (8, 3).
  const k = size / 32;
  return (
    <span
      className="hero-bust"
      aria-hidden="true"
      style={{ width: size, height: size, backgroundImage: `url("${heroUrl(hero.look, outfitOf(hero), mood)}")`, backgroundSize: `${HERO_W * k}px ${HERO_H * k}px`, backgroundPosition: `${-8 * k}px ${-3 * k}px` }}
    />
  );
}

export function GearIcon({ art, size = 40, locked = false }: { art: GearArt; size?: number; locked?: boolean }) {
  return <img className={`gear-icon${locked ? ' locked' : ''}`} src={gearIconUrl(art)} alt="" width={size} height={size} />;
}

export function PetIcon({ kind, size = 40, locked = false }: { kind: PetKind; size?: number; locked?: boolean }) {
  return <img className={`gear-icon${locked ? ' locked' : ''}`} src={petUrl(kind)} alt="" width={size} height={size} />;
}
