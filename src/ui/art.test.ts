import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../data/characters';
import { LOOKS } from '../data/looks';
import { BOARD_THEMES, REGION_BOARD, renderBoard } from './boards';
import { PIECE_SETS, PIECE_SIZE, renderPiece, ROLES } from './pieces';
import { EYES, HAIR_COLORS, HAIR_STYLES, ITEMS, PETS, SKINS } from '../data/gear';
import { renderHero, renderPet, type Outfit } from './hero';
import { BUST_SIZE, renderBust } from './portraits';

describe('art drawn in code', () => {
  it('every piece fills a good part of its 64×64 square, with an outline', () => {
    for (const r of ROLES)
      for (const c of ['white', 'black'] as const) {
        const px = renderPiece(r, c);
        expect(px.length).toBe(PIECE_SIZE * PIECE_SIZE * 4);
        let opaque = 0;
        for (let i = 3; i < px.length; i += 4) if (px[i]) opaque++;
        expect(opaque / (PIECE_SIZE * PIECE_SIZE), `${c} ${r}`).toBeGreaterThan(0.18);
      }
  });
  it('every region has a board, and a1 is a dark square', () => {
    for (const id of Object.values(REGION_BOARD)) expect(BOARD_THEMES.some((t) => t.id === id)).toBe(true);
    for (const t of BOARD_THEMES) {
      const px = renderBoard(t);
      const lum = (x: number, y: number) => {
        const i = (y * 256 + x) * 4;
        return px[i] + px[i + 1] + px[i + 2];
      };
      expect(lum(16, 256 - 16), t.id).toBeLessThan(lum(48, 256 - 16)); // a1 darker than b1
    }
  });
  it('every character has a portrait in all four moods', () => {
    for (const c of CHARACTERS) {
      const look = LOOKS[c.id];
      expect(look, c.id).toBeDefined();
      for (const mood of ['idle', 'thinking', 'smug', 'defeated'] as const) {
        const px = renderBust(look, mood);
        expect(px.length).toBe(BUST_SIZE * BUST_SIZE);
        expect(px.every((p) => p !== null)).toBe(true);
      }
      expect(renderBust(look, 'idle')).not.toEqual(renderBust(look, 'defeated'));
    }
  });
});

describe('the hero', () => {
  const look = { skin: SKINS[2], hair: HAIR_COLORS[0].color, hairStyle: 'messy' as const, eyes: EYES[0] };
  it('every item changes how the hero looks, and has an icon', () => {
    const bare = renderHero(look, {});
    for (const it of ITEMS) {
      const worn = renderHero(look, { [it.art.slot]: it.art } as Outfit);
      expect(worn, it.id).not.toEqual(bare);
      const icon = renderHero(look, { [it.art.slot]: it.art } as Outfit, { only: it.art.slot });
      expect(icon.filter(Boolean).length, it.id).toBeGreaterThan(4);
    }
  });
  it('every hair style and pet draws', () => {
    const seen = new Set<string>();
    for (const h of HAIR_STYLES) seen.add(renderHero({ ...look, hairStyle: h.id }, {}).join());
    expect(seen.size).toBe(HAIR_STYLES.length);
    for (const p of PETS) expect(renderPet(p.id).filter(Boolean).length, p.id).toBeGreaterThan(30);
  });
  it('every piece set draws both colours', () => {
    for (const s of PIECE_SETS) expect(renderPiece('queen', 'white', s.id)).not.toEqual(renderPiece('queen', 'black', s.id));
  });
});

describe('the world map', () => {
  it('has every character on the path, inside its region, from the bottom up, and draws every pixel', async () => {
    const { heroSpot, mapLayout, renderMap } = await import('./worldMap');
    const l = mapLayout();
    expect(l.nodes.map((n) => n.id).sort()).toEqual(CHARACTERS.map((c) => c.id).sort());
    for (const n of l.nodes) {
      const reg = l.regions.find((r) => r.world === n.world)!;
      expect(n.y, n.id).toBeGreaterThan(reg.y0);
      expect(n.y, n.id).toBeLessThan(reg.y1);
    }
    for (let i = 1; i < l.nodes.length; i++) expect(l.nodes[i].y).toBeLessThan(l.nodes[i - 1].y);
    // The hero never stands on top of a figure.
    for (const r of [400, 650, 900, 1333, 1777, 2150, 2600]) {
      const h = heroSpot(l, r);
      expect(l.nodes.every((n) => Math.hypot(n.x - h.x, n.y - h.y) >= 12), String(r)).toBe(true);
    }
    expect(renderMap(l).every((p) => p !== null)).toBe(true);
  });
  it('every character has a figure', async () => {
    const { figureOf } = await import('./figures');
    for (const c of CHARACTERS) expect(figureOf(c), c.id).not.toBeNull();
  });
});
