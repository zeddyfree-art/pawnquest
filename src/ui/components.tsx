import { useEffect, useRef } from 'react';
import { FACTIONS, type Character } from '../data/characters';
import type { Crown } from '../game/progress';
import { drawPortrait } from './pixelArt';

export type Mood = 'idle' | 'thinking' | 'smug' | 'defeated';

export function Portrait({ character, size = 64, mood = 'idle', locked = false }: { character: Character; size?: number; mood?: Mood; locked?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawPortrait(ref.current, character.name, character.faction);
  }, [character]);
  return (
    <canvas
      ref={ref}
      className={`portrait mood-${mood}${locked ? ' locked' : ''}`}
      style={{ width: size, height: size, ['--fc' as string]: FACTIONS[character.faction].color }}
      aria-hidden="true"
    />
  );
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

export function Skulls({ n }: { n: number }) {
  if (!n) return <span className="skulls none">No risk</span>;
  return (
    <span className="skulls" role="img" aria-label={`${n} of 3 skulls`}>
      {[1, 2, 3].map((i) => (
        <svg key={i} width="18" height="18" viewBox="0 0 8 8" shapeRendering="crispEdges" className={i <= n ? 'on' : 'off'}>
          <path d="M2 0h4v1h1v3H6v1H5v2H3V5H2V4H1V1h1z" fill="currentColor" />
          <path d="M2 2h1v1H2zM5 2h1v1H5z" fill="#181425" />
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
