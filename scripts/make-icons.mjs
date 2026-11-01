// The app icons (for installing Pawnquest): the pixel pawn of the favicon on a wooden tile, drawn as SVG on a pixel
// grid (crispEdges, whole-number scales) and rendered to PNG with Chromium. Run `node scripts/make-icons.mjs` after
// changing the drawing; the results are committed in public/.
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

// The pawn on a 16-unit grid (the favicon's, a little rounder), as rows of [x0, x1) runs.
const PAWN = [
  [2, [[7, 9]]], [3, [[6, 10]]], [4, [[5, 11]]], [5, [[5, 11]]], [6, [[6, 10]]],
  [7, [[5, 11]]], [8, [[6, 10]]], [9, [[6, 10]]], [10, [[5, 11]]],
  [11, [[4, 12]]], [12, [[3, 13]]], [13, [[3, 13]]],
];
const INK = '#3b2617';
const GOLD = '#feae34';
const LIGHT = '#ffe08a';
const SHADE = '#e07a1f';
const WOOD = '#b07a4b';
const WOOD_LIGHT = '#c99260';
const WOOD_DARK = '#8a5a34';

/** An SVG of `n`×`n` units: a tile (rounded with stepped corners, or full bleed) and the pawn at `k` units per pawn
 *  pixel, centred. */
function svg(n, k, rounded) {
  const r = [];
  const rect = (x, y, w, h, c) => r.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  // The tile: wood with a light top edge and a dark bottom edge.
  if (rounded) {
    rect(2, 0, n - 4, n, INK);
    rect(1, 1, n - 2, n - 2, INK);
    rect(0, 2, n, n - 4, INK);
    rect(2, 1, n - 4, n - 2, WOOD);
    rect(1, 2, n - 2, n - 4, WOOD);
    rect(2, 1, n - 4, 1, WOOD_LIGHT);
    rect(2, n - 2, n - 4, 1, WOOD_DARK);
  } else {
    rect(0, 0, n, n, WOOD);
    rect(0, 0, n, Math.max(1, n >> 5), WOOD_LIGHT);
    rect(0, n - Math.max(1, n >> 5), n, Math.max(1, n >> 5), WOOD_DARK);
  }
  const ox = n / 2 - 8 * k;
  const oy = n / 2 - 8 * k;
  const cells = new Set();
  for (const [y, runs] of PAWN) for (const [a, b] of runs) for (let x = a; x < b; x++) cells.add(`${x},${y}`);
  const at = (x, y) => cells.has(`${x},${y}`);
  // Outline: every empty pawn-grid cell next to the pawn (one pawn pixel thick), with a drop shadow below.
  for (let y = 1; y <= 14; y++)
    for (let x = 2; x <= 13; x++) if (!at(x, y) && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) rect(ox + x * k, oy + y * k, k, k, INK);
  for (const c of cells) {
    const [x, y] = c.split(',').map(Number);
    const right = !at(x + 1, y);
    const left = !at(x - 1, y);
    rect(ox + x * k, oy + y * k, k, k, right ? SHADE : left || (x === 6 && y >= 3 && y <= 5) ? LIGHT : GOLD);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">${r.join('')}</svg>\n`;
}

const out = new URL('../public/', import.meta.url);
const icon = svg(32, 2, true); // "any": 192 = 6×, 512 = 16×
const maskable = svg(64, 3, false); // the pawn well inside the middle 80%, the wood to the edges; 512 = 8×
const apple = svg(36, 2, false); // 180 = 5×, no transparency (iOS rounds the corners itself)
writeFileSync(new URL('icon.svg', out), icon);

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(source, size, file, transparent) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${source}`);
  await page.screenshot({ path: new URL(file, out).pathname, omitBackground: transparent });
}
await png(icon, 192, 'icon-192.png', true);
await png(icon, 512, 'icon-512.png', true);
await png(maskable, 512, 'icon-maskable-512.png', false);
await png(apple, 180, 'apple-touch-icon.png', false);
await browser.close();
console.log('icons written');
