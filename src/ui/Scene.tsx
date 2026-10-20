import { useEffect, useRef, type ReactNode } from 'react';
import type { WorldId } from '../data/characters';
import { backdropUrl, runAmbience, SKY_TOP } from './scene';

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The region's backdrop behind the board, with its ambient particles (unless motion is off). */
export function Scene({ world, motion, children }: { world: WorldId; motion: boolean; children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!motion || reducedMotion() || !canvas.current) return;
    return runAmbience(canvas.current, world);
  }, [world, motion]);
  return (
    <div className={`scene scene-${world}`} style={{ backgroundImage: `url("${backdropUrl(world)}")`, backgroundColor: SKY_TOP[world] }}>
      {motion && <canvas ref={canvas} className="ambience" aria-hidden="true" />}
      <div className="scene-content">{children}</div>
    </div>
  );
}
