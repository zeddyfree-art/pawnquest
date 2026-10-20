import { useEffect, useRef } from 'react';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Key } from '@lichess-org/chessground/types';
import type { Chess } from 'chessops/chess';
import { dests, fenOf, type Side } from '../game/chess';

interface Props {
  pos: Chess;
  orientation: Side;
  /** May the player move now? */
  movable: boolean;
  lastMove: [string, string] | null;
  onMove: (orig: string, dest: string) => void;
}

export function Board({ pos, orientation, movable, lastMove, onMove }: Props) {
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
      drawable: { enabled: false },
      movable: { free: false, showDests: true, events: { after: (o, d) => onMoveRef.current(o, d) } },
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

  return <div ref={el} className="board" />;
}
