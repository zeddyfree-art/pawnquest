// Regression check for clothes hiding hands. Run against the Vite dev server.
// node tools/art/check-hero-hands.mjs [http://localhost:5173] [/tmp/hero-hands.png]
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 880, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.argv[2] ?? 'http://localhost:5173');
  const result = await page.evaluate(async () => {
    const { heroArtUrl } = await import('/src/ui/heroArt.ts');
    const { posedPoint } = await import('/src/ui/heroPose.ts');
    const { ITEMS, SKINS, newHero, outfitOf } = await import('/src/data/gear.ts');
    const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 256;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const pixels = async url => {
      const img = new Image(); img.src = url; await img.decode();
      ctx.clearRect(0, 0, 192, 256); ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, 192, 256).data;
    };
    const render = async hero => {
      const start = performance.now();
      for (;;) {
        const url = heroArtUrl(hero.look, outfitOf(hero), 'idle');
        if (url) return url;
        if (performance.now() - start > 15000) throw new Error('Missing hero art');
        await new Promise(r => setTimeout(r, 10));
      }
    };
    const grid = document.createElement('main');
    grid.style = 'display:grid;grid-template-columns:repeat(4,192px);gap:12px;padding:20px;background:#eee2cc;color:#432e22;font:14px sans-serif';
    const garments = ITEMS.filter(i => i.art.slot === 'body' && !['armor', 'plate'].includes(i.art.kind));
    let checks = 0;
    for (const body of ['male', 'female']) for (let skin = 0; skin < SKINS.length; skin++) {
      const reference = await pixels(`art/hero/base-${skin}.webp`);
      for (const garment of garments) for (const armed of [false, true]) {
        const hero = newHero('Hands', 'squire', { body, skin: SKINS[skin], hair: '#5a3a22', hairStyle: 'none', eyes: '#2b2238' });
        hero.equip = { body: garment.id, ...(armed ? { main: 'wooden-sword' } : {}) };
        const url = await render(hero);
        const actual = await pixels(url);
        const pose = { main: armed ? 'woodsword' : undefined };
        for (const x of [56, 136]) {
          const p = posedPoint([x, 172], pose).map(Math.round);
          const expectedIndex = (172 * 192 + x) * 4;
          const actualIndex = (p[1] * 192 + p[0]) * 4;
          if (actual[actualIndex + 3] < 240) throw new Error(`Missing hand: ${garment.id} ${body} skin ${skin}`);
          for (let c = 0; c < 3; c++) if (Math.abs(actual[actualIndex + c] - reference[expectedIndex + c]) > 22) {
            throw new Error(`Covered hand: ${garment.id} ${body} skin ${skin} ${armed ? 'armed' : 'empty'} x${x}`);
          }
          checks++;
        }
        if ([2, 5].includes(skin) && garment.art.kind === 'cloak' && !armed) {
          const card = document.createElement('div'); card.style = 'text-align:center';
          const img = new Image(192, 256); img.src = url; await img.decode();
          card.append(img, document.createTextNode(`${body} · ${garment.name} · skin ${skin + 1}`)); grid.append(card);
        }
      }
    }
    document.body.replaceChildren(grid);
    return { garments: garments.length, bodies: 2, skinTones: SKINS.length, handChecks: checks };
  });
  assert.deepEqual(errors, []);
  await page.screenshot({ path: process.argv[3] ?? '/tmp/hero-hands.png', fullPage: true });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
