import { useEffect, useRef } from 'react';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { DrawBrush, DrawShape } from '@lichess-org/chessground/draw';
import type { Key } from '@lichess-org/chessground/types';
import type { Chess } from 'chessops/chess';
import { dests, fenOf, type Side } from '../game/chess';

/** Arrow colours: the better move in green, a bad move in red, any other move in blue. */
const BRUSHES: Record<string, DrawBrush> = {
  good: { key: 'g', color: '#63c74d', opacity: 0.9, lineWidth: 12 },
  bad: { key: 'b', color: '#e43b44', opacity: 0.85, lineWidth: 12 },
  info: { key: 'i', color: '#0099db', opacity: 0.8, lineWidth: 12 },
};

export interface Arrow {
  from: string;
  to: string;
  brush: keyof typeof BRUSHES;
}

interface Props {
  pos: Chess;
  orientation: Side;
  /** May the player move now? */
  movable: boolean;
  lastMove: [string, string] | null;
  onMove?: (orig: string, dest: string) => void;
  arrows?: Arrow[];
}

export function Board({ pos, orientation, movable, lastMove, onMove, arrows }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!el.current) return;
    api.current = Chessground(el.current, {
      animation: { enabled: true, duration: 160 },
      highlight: { lastMove: true, check: true },
      coordinates: true,
      draggable: { showGhost: true },
      drawable: { enabled: false, visible: true, brushes: BRUSHES as never },
      movable: { free: false, showDests: true, events: { after: (o, d) => onMoveRef.current?.(o, d) } },
      premovable: { enabled: false },
    });
    return () => api.current?.destroy();
  }, []);

  useEffect(() => {
    api.current?.set({
      fen: fenOf(pos),
      orientation,
      turnColor: pos.turn,
      check: pos.isCheck() ? pos.turn : false,
      lastMove: (lastMove as Key[] | null) ?? undefined,
      movable: { color: movable ? pos.turn : undefined, dests: movable ? (dests(pos) as Map<Key, Key[]>) : new Map() },
    });
  }, [pos, orientation, movable, lastMove]);

  useEffect(() => {
    api.current?.setAutoShapes((arrows ?? []).map((a) => ({ orig: a.from as Key, dest: a.to as Key, brush: a.brush }) as DrawShape));
  }, [arrows, pos]);

  return <div ref={el} className="board" />;
}
