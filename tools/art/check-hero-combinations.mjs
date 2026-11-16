// Pairwise rendering and pixel checks against Vite. No models or save manipulation required.
// node tools/art/check-hero-combinations.mjs [http://localhost:5173] [/tmp/hero-combinations]
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.argv[2] ?? 'http://localhost:5173';
const output = process.argv[3] ?? '/tmp/hero-combinations';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], failures = [], totals = {};
try {
  const setup = await browser.newPage(); await setup.goto(base);
  const groups = await setup.evaluate(async () => {
    const { ITEMS } = await import('/src/data/gear.ts');
    return ['male', 'female'].flatMap(body => [
      ...[null, ...ITEMS.filter(i => i.art.slot === 'head').map(i => i.id)].map(head => ({ family: 'head', body, head })),
      ...ITEMS.filter(i => i.art.slot === 'body').map(i => ({ family: 'held', body, garment: i.id })),
    ]);
  }); await setup.close();
  for (const group of groups) {
    // A fresh page per group bounds the renderer's data-URL caches during a large audit.
    const page = await browser.newPage({ viewport: { width: 880, height: 1450 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && r.url().includes('/art/')) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(base);
    const result = await page.evaluate(async (group) => {
      const { heroArtUrl } = await import('/src/ui/heroArt.ts');
      const { heroHairTop } = await import('/src/ui/heroLayers.ts');
      const { poseFigure } = await import('/src/ui/heroPose.ts');
      const { ITEMS, HAIR_STYLES, newHero, outfitOf } = await import('/src/data/gear.ts');
      const by = slot => ITEMS.filter(i => i.art.slot === slot).map(i => i.id);
      const cases = [];
      const add = (family, equip, hair = 'long') => cases.push({ family, equip, hair });
      if (group.family === 'head') {
        for (const h of HAIR_STYLES) for (const body of by('body')) add('headHairBody', { head: group.head, body }, h.id);
        for (const h of HAIR_STYLES) for (const face of by('face')) add('headHairFace', { head: group.head, body: 'ranger-cloak', face }, h.id);
        for (const body of by('body')) for (const face of by('face')) add('headBodyFace', { head: group.head, body, face });
      } else {
        for (const main of [null, ...by('main')]) for (const off of [null, ...by('off')]) add('bodyMainOff', { body: group.garment, main, off });
        for (const legs of by('legs')) add('bodyLegs', { body: group.garment, legs });
      }
      const counts = {}, failures = [];
      const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 256;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const pixels = async url => { const i = new Image(); i.src = url; await i.decode(); ctx.clearRect(0, 0, 192, 256); ctx.drawImage(i, 0, 0); return ctx.getImageData(0, 0, 192, 256).data; };
      const render = async hero => {
        const start = performance.now();
        for (;;) { const url = heroArtUrl(hero.look, outfitOf(hero), 'idle'); if (url) return url;
          if (performance.now() - start > 15000) throw new Error(`Missing layers: ${JSON.stringify(hero)}`);
          await new Promise(r => setTimeout(r, 5));
        }
      };
      const grid = document.createElement('main'); grid.style = 'display:grid;grid-template-columns:repeat(4,192px);gap:12px;padding:20px;background:#eee2cc;color:#432e22;font:14px sans-serif;height:max-content;min-height:0;flex:none';
      const cap = heroHairTop(ITEMS.find(i => i.id === group.head)?.art.kind);
      let topMask;
      if (group.family === 'head' && cap > 0 && Number.isFinite(cap)) {
        ctx.clearRect(0, 0, 192, 256); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 192, cap - 2);
        topMask = poseFigure(canvas, {}).getContext('2d').getImageData(0, 0, 192, 256).data;
      }
      const braidSource = await pixels('art/hero/hair-braids.webp');
      ctx.clearRect(0, 0, 192, 256);
      const braidImage = ctx.createImageData(192, 256);
      for (let y = 120; y < 156; y++) for (let x = 0; x < 192; x++) {
        const i = (y * 192 + x) * 4;
        if (braidSource[i + 3] > 245) braidImage.data.set([255, 255, 255, 255], i);
      }
      ctx.putImageData(braidImage, 0, 0);
      const braidMask = poseFigure(canvas, {}).getContext('2d').getImageData(0, 0, 192, 256).data;
      let hatChecks = 0, braidChecks = 0;
      for (const c of cases) {
        const hero = newHero('Layers', 'squire', { body: group.body, skin: group.body === 'male' ? '#efc29a' : '#7a4a2f', hair: '#d4ad55', hairStyle: c.hair, eyes: '#4a6ab0' });
        hero.equip = { legs: 'brown-trousers', ...c.equip };
        const url = await render(hero), rgba = await pixels(url);
        counts[c.family] = (counts[c.family] ?? 0) + 1;
        let clipped = false;
        for (let y = 0; y < 256; y++) for (let x = 0; x < 192; x++) if ((x < 2 || x >= 190 || y < 2 || y >= 254) && rgba[(y * 192 + x) * 4 + 3] > 50) clipped = true;
        if (clipped) failures.push({ issue: 'canvas-edge', ...c });
        if (cap > 0 && group.family === 'head' && c.hair !== 'none') {
          const bald = await pixels(await render({ ...hero, look: { ...hero.look, hairStyle: 'none' } }));
          let different = false;
          for (let i = 0; i < rgba.length; i += 4) if (!Number.isFinite(cap) || topMask[i + 3] > 250) {
            for (let k = 0; k < 4; k++) if (Math.abs(rgba[i + k] - bald[i + k]) > 3) different = true;
          }
          hatChecks++;
          if (different) failures.push({ issue: 'hair-through-closed-hat', ...c });
        }
        if (c.family === 'headHairBody' && c.hair === 'braids' && Number.isFinite(cap)) {
          const bare = await pixels(await render({ ...hero, equip: { ...hero.equip, body: null } }));
          let different = false;
          for (let i = 0; i < rgba.length; i += 4) if (braidMask[i + 3] > 250) {
            for (let k = 0; k < 4; k++) if (Math.abs(rgba[i + k] - bare[i + k]) > 3) different = true;
          }
          braidChecks++;
          if (different) failures.push({ issue: 'clothes-cover-front-braids', ...c });
        }
        const showHead = group.family === 'head' && c.family === 'headHairBody' && c.equip.body === 'travellers-cloak' && ['bun', 'spiky', 'long', 'braids'].includes(c.hair);
        const showHeld = group.family === 'held' && c.family === 'bodyMainOff' && ['lute', 'hellfire-staff', 'knight-sword'].includes(c.equip.main) && ['wooden-shield', 'grandmasters-tome'].includes(c.equip.off);
        if (showHead || showHeld || clipped) {
          const card = document.createElement('div'); card.style = 'text-align:center'; const image = new Image(192, 256); image.src = url; await image.decode();
          card.append(image, document.createTextNode([c.hair, ...Object.values(c.equip).filter(Boolean)].join(' / '))); grid.append(card);
        }
      }
      document.body.replaceChildren(grid);
      return { counts, failures, hatChecks, braidChecks };
    }, group);
    for (const [name, count] of Object.entries(result.counts)) totals[name] = (totals[name] ?? 0) + count;
    totals.closedHatPixelChecks = (totals.closedHatPixelChecks ?? 0) + result.hatChecks;
    totals.braidPixelChecks = (totals.braidPixelChecks ?? 0) + result.braidChecks;
    failures.push(...result.failures.map(f => ({ ...group, ...f })));
    const height = Math.ceil(await page.locator('main').evaluate(el => el.getBoundingClientRect().height));
    await page.setViewportSize({ width: 880, height: Math.min(height, 1800) });
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
    await page.screenshot({ path: `${output}/${group.family}-${group.body}-${group.head ?? group.garment ?? 'none'}.png`, fullPage: true });
    await page.close();
    console.log(JSON.stringify({ ...group, cases: Object.values(result.counts).reduce((a, b) => a + b, 0), failures: result.failures.length }));
  }
  const report = { totals, errors, failures };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
} finally { await browser.close(); }
